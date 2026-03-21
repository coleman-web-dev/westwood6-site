import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type { ConvenienceFeeSettings } from '@/lib/types/database';

/**
 * POST /api/stripe/checkout
 * Creates a Stripe Checkout Session for an invoice payment.
 * Body: { invoiceId, communityId, successUrl, cancelUrl }
 * Requires authentication. Verifies the user belongs to the invoice's unit.
 */
export async function POST(req: NextRequest) {
  try {
    const { invoiceId, communityId, successUrl, cancelUrl, paymentMethod, enableAutopay, billingDay } = await req.json();

    if (!invoiceId || !communityId || !successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: 'invoiceId, communityId, successUrl, and cancelUrl are required' },
        { status: 400 }
      );
    }

    // Validate autopay parameters
    if (enableAutopay) {
      const day = Number(billingDay);
      if (!Number.isInteger(day) || day < 1 || day > 28) {
        return NextResponse.json(
          { error: 'billingDay must be an integer between 1 and 28' },
          { status: 400 }
        );
      }
    }

    // Verify the user is authenticated
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const supabase = createAdminClient();

    // Verify the user belongs to this community
    const { data: callerMember } = await supabase
      .from('members')
      .select('id, unit_id, system_role')
      .eq('user_id', user.id)
      .eq('community_id', communityId)
      .single();

    if (!callerMember) {
      return NextResponse.json(
        { error: 'You do not belong to this community' },
        { status: 403 }
      );
    }
    const stripe = getStripeClient();

    // Look up the invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('community_id', communityId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Verify the authenticated user owns this invoice's unit (or is board)
    const isBoardOrHigher =
      callerMember.system_role === 'board' ||
      callerMember.system_role === 'manager' ||
      callerMember.system_role === 'super_admin';

    if (!isBoardOrHigher && callerMember.unit_id !== invoice.unit_id) {
      return NextResponse.json(
        { error: 'You do not have permission to pay this invoice' },
        { status: 403 }
      );
    }

    // Look up the Stripe customer ID for this member (from Membershine migration sync)
    // This lets Stripe Checkout show saved payment methods (cards, ACH)
    const { data: payingMember } = await supabase
      .from('members')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .eq('community_id', communityId)
      .single();
    const stripeCustomerId = payingMember?.stripe_customer_id || null;

    if (invoice.status === 'paid') {
      return NextResponse.json(
        { error: 'Invoice is already paid' },
        { status: 400 }
      );
    }

    if (invoice.status === 'voided') {
      return NextResponse.json(
        { error: 'Invoice has been voided' },
        { status: 400 }
      );
    }

    // Look up the stripe_accounts row for this community
    const { data: stripeAccount, error: stripeError } = await supabase
      .from('stripe_accounts')
      .select('*')
      .eq('community_id', communityId)
      .single();

    if (stripeError || !stripeAccount) {
      return NextResponse.json(
        { error: 'Stripe account not configured for this community' },
        { status: 400 }
      );
    }

    if (!stripeAccount.charges_enabled) {
      return NextResponse.json(
        { error: 'Stripe account is not ready to accept payments' },
        { status: 400 }
      );
    }

    // Look up the community name and payment settings
    const { data: community } = await supabase
      .from('communities')
      .select('name, theme')
      .eq('id', communityId)
      .single();

    const communityName = community?.name || 'Community';
    const theme = community?.theme as Record<string, unknown> | null;
    const paymentSettings = theme?.payment_settings as Record<string, unknown> | undefined;
    const convenienceFee = paymentSettings?.convenience_fee_settings as ConvenienceFeeSettings | undefined;

    // Calculate amount to charge (total minus any amount already paid via wallet)
    const chargeAmount = invoice.amount - (invoice.amount_paid || 0);
    if (chargeAmount <= 0) {
      return NextResponse.json(
        { error: 'No remaining balance to charge' },
        { status: 400 }
      );
    }

    // Calculate convenience fee (covers Stripe processing fee + DuesIQ margin)
    // Fee only applies if enabled and the selected payment method matches applies_to
    const appliesTo = convenienceFee?.applies_to ?? 'all';
    const feeApplies = convenienceFee?.enabled && (
      appliesTo === 'all' ||
      (appliesTo === 'card' && paymentMethod === 'card') ||
      (appliesTo === 'ach' && paymentMethod === 'ach')
    );
    let convenienceFeeAmount = 0;
    if (feeApplies) {
      const percentFee = Math.round(chargeAmount * (convenienceFee.fee_percent / 100));
      const fixedFee = convenienceFee.fee_fixed || 0;
      convenienceFeeAmount = percentFee + fixedFee;
    }

    // Application fee goes to DuesIQ platform (separate from convenience fee)
    const applicationFeeAmount = Math.round(
      chargeAmount * (stripeAccount.application_fee_percent / 100)
    );

    // Build line items
    const lineItems: Array<{
      price_data: { currency: string; product_data: { name: string; description?: string }; unit_amount: number };
      quantity: number;
    }> = [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: invoice.title,
            description: `${communityName} - ${invoice.title}`,
          },
          unit_amount: chargeAmount,
        },
        quantity: 1,
      },
    ];

    if (convenienceFeeAmount > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Processing Fee',
          },
          unit_amount: convenienceFeeAmount,
        },
        quantity: 1,
      });
    }

    // Build checkout session config
    // Connect mode: split payment to connected account with application fee
    // Direct mode: payment goes directly to community's Stripe account
    const isConnect = stripeAccount.mode === 'connect' && stripeAccount.stripe_account_id;

    // Restrict payment methods if a specific method was chosen (for split fee flows)
    const paymentMethodTypes: ('card' | 'us_bank_account')[] =
      paymentMethod === 'card' ? ['card'] :
      paymentMethod === 'ach' ? ['us_bank_account'] :
      ['card', 'us_bank_account'];

    // Build metadata — include autopay info if opted in
    const sessionMetadata: Record<string, string> = {
      invoice_id: invoiceId,
      community_id: communityId,
    };
    if (enableAutopay) {
      sessionMetadata.autopay = 'true';
      sessionMetadata.billing_day = String(billingDay);

      // Look up the assessment to determine type (regular vs special)
      if (invoice.assessment_id) {
        const { data: assessment } = await supabase
          .from('assessments')
          .select('id, type, installments, installment_start_date')
          .eq('id', invoice.assessment_id)
          .single();

        if (assessment) {
          sessionMetadata.assessment_id = assessment.id;
          sessionMetadata.assessment_type = assessment.type;
          if (assessment.type === 'special' && assessment.installments) {
            sessionMetadata.total_installments = String(assessment.installments);
          }
        }
      }
    }

    // Build payment_intent_data — add setup_future_usage when autopay is enabled
    // so Stripe saves the payment method for off-session subscription charges
    const paymentIntentData: Record<string, unknown> = {};
    if (enableAutopay) {
      paymentIntentData.setup_future_usage = 'off_session';
    }

    if (isConnect) {
      paymentIntentData.application_fee_amount = applicationFeeAmount;
      paymentIntentData.transfer_data = {
        destination: stripeAccount.stripe_account_id!,
      };
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: paymentMethodTypes,
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      ...(stripeCustomerId ? { customer: stripeCustomerId } : {}),
      metadata: sessionMetadata,
      ...(Object.keys(paymentIntentData).length > 0
        ? { payment_intent_data: paymentIntentData }
        : {}),
    });

    return NextResponse.json({
      url: session.url,
      convenienceFee: convenienceFeeAmount,
    });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
