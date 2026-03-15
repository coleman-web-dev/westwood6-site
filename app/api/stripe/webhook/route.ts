import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { queuePaymentConfirmation } from '@/lib/email/queue';
import { postPaymentReceived, postOverpaymentWalletCredit } from '@/lib/utils/accounting-entries';
import { logAuditEvent } from '@/lib/audit';
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
        const communityId = session.metadata?.community_id;

        // --- Deposit payment branch ---
        const reservationId = session.metadata?.reservation_id;
        const metadataType = session.metadata?.type;
        if (reservationId && metadataType === 'deposit' && communityId) {
          // Idempotency: check if already paid
          const { data: reservation } = await supabase
            .from('reservations')
            .select('id, deposit_paid')
            .eq('id', reservationId)
            .single();

          if (reservation && !reservation.deposit_paid) {
            await supabase.from('reservations').update({
              deposit_paid: true,
              deposit_paid_at: new Date().toISOString(),
              deposit_stripe_session_id: session.id,
              deposit_stripe_payment_intent: (session.payment_intent as string) || null,
            }).eq('id', reservationId);

            // Notify board about deposit payment (fire-and-forget)
            void supabase.rpc('create_board_notifications', {
              p_community_id: communityId,
              p_type: 'general',
              p_title: 'Security deposit paid',
              p_body: 'A member has paid their security deposit online.',
              p_reference_id: reservationId,
              p_reference_type: 'reservation',
            });

            await logAuditEvent({
              communityId: communityId,
              action: 'deposit_paid',
              targetType: 'reservation',
              targetId: reservationId,
              metadata: { method: 'stripe_checkout' },
            });
            console.log('Deposit payment confirmed for reservation:', reservationId);
          } else {
            console.log('Deposit already paid or reservation not found, skipping:', reservationId);
          }
          break;
        }

        // --- RSVP payment branch ---
        const rsvpId = session.metadata?.rsvp_id;
        if (rsvpId && communityId) {
          // Idempotency: check if already confirmed
          const { data: rsvp } = await supabase
            .from('event_rsvps')
            .select('id, status, event_id, member_id')
            .eq('id', rsvpId)
            .single();

          if (rsvp && rsvp.status === 'pending_payment') {
            await supabase.from('event_rsvps').update({
              status: 'confirmed',
              paid_at: new Date().toISOString(),
              stripe_session_id: session.id,
              stripe_payment_intent: (session.payment_intent as string) || null,
            }).eq('id', rsvpId);

            // Notify board about paid RSVP (fire-and-forget)
            const { data: rsvpEvent } = await supabase
              .from('events')
              .select('title')
              .eq('id', rsvp.event_id)
              .single();

            if (rsvpEvent) {
              void supabase.rpc('create_board_notifications', {
                p_community_id: communityId,
                p_type: 'general',
                p_title: `New paid RSVP for ${rsvpEvent.title}`,
                p_body: 'A member has completed payment and confirmed their RSVP.',
                p_reference_id: rsvp.event_id,
                p_reference_type: 'event',
              });
            }

            console.log('RSVP payment confirmed:', rsvpId);
          } else {
            console.log('RSVP already confirmed or not found, skipping:', rsvpId);
          }
          break;
        }

        // --- Invoice payment branch ---
        const invoiceId = session.metadata?.invoice_id;

        if (!invoiceId || !communityId) {
          console.log('Checkout session missing metadata, skipping:', session.id);
          break;
        }

        // Idempotency check: skip if this session was already processed
        const { data: existingPayment } = await supabase
          .from('payments')
          .select('id')
          .eq('stripe_session_id', session.id)
          .limit(1)
          .maybeSingle();

        if (existingPayment) {
          console.log('Checkout session already processed, skipping:', session.id);
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

        // Post accounting journal entries (silently skips if not set up)
        await postPaymentReceived(communityId, invoiceId, invoice.unit_id, Math.min(stripePaidAmount, invoice.amount), invoice.title);

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

          // Post overpayment accounting entry
          await postOverpaymentWalletCredit(communityId, invoiceId, invoice.unit_id, excess);
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

        await logAuditEvent({
          communityId: communityId,
          action: 'payment_received',
          targetType: 'invoice',
          targetId: invoiceId,
          metadata: { amount: stripePaidAmount, method: 'stripe_checkout', title: invoice.title },
        });

        console.log('Checkout session completed for invoice:', invoiceId);
        break;
      }


      // -- Subscription invoice paid automatically ---------------------
      case 'invoice.paid': {
        const stripeInvoice = event.data.object as Stripe.Invoice;

        // Only process subscription invoices (not one-off)
        const subDetails = stripeInvoice.parent?.subscription_details;
        if (!subDetails?.subscription) break;

        // Idempotency check: skip if this Stripe invoice was already processed
        const { data: existingSubPayment } = await supabase
          .from('payments')
          .select('id')
          .eq('stripe_payment_intent', stripeInvoice.id)
          .limit(1)
          .maybeSingle();

        if (existingSubPayment) {
          console.log('Stripe invoice already processed, skipping:', stripeInvoice.id);
          break;
        }

        const subscriptionId = typeof subDetails.subscription === 'string'
          ? subDetails.subscription
          : subDetails.subscription.id;

        // Look up the unit by stripe_subscription_id
        const { data: unit } = await supabase
          .from('units')
          .select('id, community_id')
          .eq('stripe_subscription_id', subscriptionId)
          .single();

        if (!unit) {
          console.log('No unit found for subscription:', subscriptionId);
          break;
        }

        // Find the matching DuesIQ invoice:
        // Same unit_id, status is 'pending' or 'overdue', closest due_date to today
        const { data: duesiqInvoice } = await supabase
          .from('invoices')
          .select('*')
          .eq('unit_id', unit.id)
          .in('status', ['pending', 'overdue'])
          .order('due_date', { ascending: true })
          .limit(1)
          .single();

        if (!duesiqInvoice) {
          console.log('No pending DuesIQ invoice found for unit:', unit.id);
          break;
        }

        const amountPaid = stripeInvoice.amount_paid || 0;
        const totalPaid = (duesiqInvoice.amount_paid || 0) + amountPaid;

        // Update the DuesIQ invoice
        await supabase.from('invoices').update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          amount_paid: Math.min(totalPaid, duesiqInvoice.amount),
          stripe_invoice_id: stripeInvoice.id,
          stripe_payment_id: stripeInvoice.id,
        }).eq('id', duesiqInvoice.id);

        // Create payment record
        await supabase.from('payments').insert({
          invoice_id: duesiqInvoice.id,
          unit_id: unit.id,
          amount: amountPaid,
          stripe_payment_intent: stripeInvoice.id,
          paid_by: 'stripe',
        });

        // Post accounting journal entries (silently skips if not set up)
        await postPaymentReceived(unit.community_id, duesiqInvoice.id, unit.id, Math.min(amountPaid, duesiqInvoice.amount), duesiqInvoice.title);

        // Handle overpayment: credit excess to unit wallet
        if (totalPaid > duesiqInvoice.amount) {
          const excess = totalPaid - duesiqInvoice.amount;

          const { data: wallet } = await supabase
            .from('unit_wallets')
            .select('balance')
            .eq('unit_id', unit.id)
            .single();

          const newBalance = (wallet?.balance ?? 0) + excess;

          await supabase.from('unit_wallets').upsert({
            unit_id: unit.id,
            community_id: unit.community_id,
            balance: newBalance,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'unit_id' });

          await supabase.from('wallet_transactions').insert({
            unit_id: unit.id,
            community_id: unit.community_id,
            amount: excess,
            type: 'overpayment',
            reference_id: duesiqInvoice.id,
            description: `Overpayment on: ${duesiqInvoice.title}`,
          });

          // Post overpayment accounting entry
          await postOverpaymentWalletCredit(unit.community_id, duesiqInvoice.id, unit.id, excess);
        }

        // Queue payment confirmation email
        const { data: community } = await supabase
          .from('communities')
          .select('slug')
          .eq('id', unit.community_id)
          .single();

        if (community?.slug) {
          await queuePaymentConfirmation(
            unit.community_id,
            community.slug,
            unit.id,
            duesiqInvoice.title,
            amountPaid,
            new Date().toISOString()
          );
        }

        await logAuditEvent({
          communityId: unit.community_id,
          action: 'payment_received',
          targetType: 'invoice',
          targetId: duesiqInvoice.id,
          metadata: { amount: amountPaid, method: 'stripe_subscription', title: duesiqInvoice.title },
        });

        console.log('Subscription invoice paid for unit:', unit.id, 'invoice:', duesiqInvoice.id);
        break;
      }

      // -- Subscription payment failed ---------------------------------
      case 'invoice.payment_failed': {
        const stripeInvoice = event.data.object as Stripe.Invoice;
        const failedSubDetails = stripeInvoice.parent?.subscription_details;
        if (!failedSubDetails?.subscription) break;

        const subscriptionId = typeof failedSubDetails.subscription === 'string'
          ? failedSubDetails.subscription
          : failedSubDetails.subscription.id;

        const { data: unit } = await supabase
          .from('units')
          .select('id, community_id')
          .eq('stripe_subscription_id', subscriptionId)
          .single();

        if (!unit) break;

        // Find matching pending invoice and mark overdue
        const { data: duesiqInvoice } = await supabase
          .from('invoices')
          .select('id')
          .eq('unit_id', unit.id)
          .eq('status', 'pending')
          .order('due_date', { ascending: true })
          .limit(1)
          .single();

        if (duesiqInvoice) {
          await supabase.from('invoices').update({ status: 'overdue' }).eq('id', duesiqInvoice.id);
        }

        // Update subscription status on unit
        await supabase.from('units').update({ stripe_subscription_status: 'past_due' }).eq('id', unit.id);

        await logAuditEvent({
          communityId: unit.community_id,
          action: 'payment_failed',
          targetType: 'invoice',
          targetId: duesiqInvoice?.id,
          metadata: { unit_id: unit.id, method: 'stripe_subscription' },
        });
        console.log('Subscription payment failed for unit:', unit.id);
        break;
      }

      // -- Subscription status changed ---------------------------------
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;

        await supabase.from('units').update({
          stripe_subscription_status: subscription.status,
        }).eq('stripe_subscription_id', subscription.id);

        console.log('Subscription updated:', subscription.id, 'status:', subscription.status);
        break;
      }

      // -- Subscription canceled/deleted -------------------------------
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        await supabase.from('units').update({
          stripe_subscription_id: null,
          stripe_subscription_status: null,
        }).eq('stripe_subscription_id', subscription.id);

        console.log('Subscription deleted:', subscription.id);
        break;
      }

      // -- Refunds & disputes ------------------------------------------
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
