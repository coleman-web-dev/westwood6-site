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
    const { invoiceId, communityId, successUrl, cancelUrl } = await req.json();

    if (!invoiceId || !communityId || !successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: 'invoiceId, communityId, successUrl, and cancelUrl are required' },
        { status: 400 }
      );
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
    let convenienceFeeAmount = 0;
    if (convenienceFee?.enabled) {
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

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card', 'us_bank_account'],
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        invoice_id: invoiceId,
        community_id: communityId,
      },
      ...(isConnect
        ? {
            payment_intent_data: {
              application_fee_amount: applicationFeeAmount,
              transfer_data: {
                destination: stripeAccount.stripe_account_id!,
              },
            },
          }
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
