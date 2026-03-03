import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/stripe/checkout
 * Creates a Stripe Checkout Session for an invoice payment.
 * Body: { invoiceId, communityId, successUrl, cancelUrl }
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

    const supabase = createAdminClient();
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

    // Look up the community name
    const { data: community } = await supabase
      .from('communities')
      .select('name')
      .eq('id', communityId)
      .single();

    const communityName = community?.name || 'Community';

    // Calculate amount to charge (total minus any amount already paid via wallet)
    const chargeAmount = invoice.amount - (invoice.amount_paid || 0);
    if (chargeAmount <= 0) {
      return NextResponse.json(
        { error: 'No remaining balance to charge' },
        { status: 400 }
      );
    }

    // Calculate application fee
    const applicationFeeAmount = Math.round(
      chargeAmount * (stripeAccount.application_fee_percent / 100)
    );

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card', 'us_bank_account'],
      line_items: [
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
      ],
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount,
        transfer_data: {
          destination: stripeAccount.stripe_account_id,
        },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        invoice_id: invoiceId,
        community_id: communityId,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
