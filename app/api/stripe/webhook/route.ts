import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { queuePaymentConfirmation } from '@/lib/email/queue';
import type Stripe from 'stripe';

export const runtime = 'nodejs';

/**
 * POST /api/stripe/webhook
 * Handles Stripe webhook events. Verifies signature with STRIPE_WEBHOOK_SECRET.
 */
export async function POST(req: NextRequest) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  // Read the raw body for signature verification
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature';
    console.error('Webhook signature verification failed:', message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const invoiceId = session.metadata?.invoice_id;
        const communityId = session.metadata?.community_id;

        if (!invoiceId || !communityId) {
          console.log('Checkout session missing metadata, skipping:', session.id);
          break;
        }

        // Look up the invoice
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .select('*')
          .eq('id', invoiceId)
          .single();

        if (invoiceError || !invoice) {
          console.error('Invoice not found for webhook:', invoiceId);
          break;
        }

        // Amount paid via Stripe (in cents)
        const stripePaidAmount = session.amount_total || 0;
        const totalPaid = (invoice.amount_paid || 0) + stripePaidAmount;

        // Update invoice
        const { error: updateError } = await supabase
          .from('invoices')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            amount_paid: Math.min(totalPaid, invoice.amount),
            stripe_payment_id: session.payment_intent as string || session.id,
          })
          .eq('id', invoiceId);

        if (updateError) {
          console.error('Failed to update invoice:', updateError);
          break;
        }

        // Create a payment record
        await supabase.from('payments').insert({
          invoice_id: invoiceId,
          unit_id: invoice.unit_id,
          amount: stripePaidAmount,
          stripe_session_id: session.id,
          stripe_payment_intent: (session.payment_intent as string) || null,
          paid_by: invoice.paid_by || 'stripe',
        });

        // Check for overpayment: credit excess to unit wallet
        if (totalPaid > invoice.amount) {
          const excess = totalPaid - invoice.amount;

          // Upsert wallet balance
          const { data: wallet } = await supabase
            .from('unit_wallets')
            .select('balance')
            .eq('unit_id', invoice.unit_id)
            .single();

          const currentBalance = wallet?.balance ?? 0;
          const newBalance = currentBalance + excess;

          await supabase
            .from('unit_wallets')
            .upsert(
              {
                unit_id: invoice.unit_id,
                community_id: communityId,
                balance: newBalance,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'unit_id' }
            );

          // Log the wallet transaction
          await supabase.from('wallet_transactions').insert({
            unit_id: invoice.unit_id,
            community_id: communityId,
            amount: excess,
            type: 'overpayment',
            reference_id: invoiceId,
            description: `Overpayment on: ${invoice.title}`,
          });
        }

        // Queue payment confirmation email
        // Look up community slug for the email links
        const { data: community } = await supabase
          .from('communities')
          .select('slug')
          .eq('id', communityId)
          .single();

        if (community?.slug) {
          await queuePaymentConfirmation(
            communityId,
            community.slug,
            invoice.unit_id,
            invoice.title,
            stripePaidAmount,
            new Date().toISOString()
          );
        }

        console.log('Checkout session completed for invoice:', invoiceId);
        break;
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account;

        // Update stripe_accounts row where stripe_account_id matches
        const { error: updateError } = await supabase
          .from('stripe_accounts')
          .update({
            charges_enabled: account.charges_enabled ?? false,
            payouts_enabled: account.payouts_enabled ?? false,
            onboarding_complete: account.details_submitted ?? false,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_account_id', account.id);

        if (updateError) {
          console.error('Failed to update stripe_accounts from webhook:', updateError);
        } else {
          console.log('Account updated:', account.id);
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        console.log('Charge refunded:', charge.id);
        break;
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute;
        console.log('Dispute created:', dispute.id);
        break;
      }

      default:
        console.log('Unhandled webhook event type:', event.type);
    }
  } catch (err) {
    console.error('Error processing webhook event:', err);
    // Return 200 anyway to acknowledge receipt and prevent Stripe retries
    // for processing errors (as opposed to signature errors)
  }

  return NextResponse.json({ received: true });
}
