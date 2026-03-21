import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { queuePaymentConfirmation } from '@/lib/email/queue';
import { postPaymentReceived, postOverpaymentWalletCredit, postEstoppelFeeReceived, postAmenityDepositReceived, postEventRsvpFeeReceived, postProcessingFeeReceived } from '@/lib/utils/accounting-entries';
import { logAuditEvent } from '@/lib/audit';
import { computeNextBillingAnchor, FREQUENCY_CONFIG } from '@/lib/utils/billing-anchor';
import type { PaymentFrequency } from '@/lib/types/database';
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
            .select('id, deposit_paid, deposit_amount, unit_id, amenity_id')
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

            // GL posting: DR Operating Cash, CR Amenity Deposits Payable
            if (reservation.deposit_amount && reservation.unit_id) {
              const { data: amenity } = await supabase
                .from('amenities')
                .select('name')
                .eq('id', reservation.amenity_id)
                .single();
              void postAmenityDepositReceived(
                communityId,
                reservationId,
                reservation.unit_id,
                reservation.deposit_amount,
                amenity?.name || 'Amenity',
              );
            }

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

              // GL posting: DR Operating Cash, CR Amenity Fee Revenue
              const rsvpAmount = session.amount_total || 0;
              if (rsvpAmount > 0) {
                void postEventRsvpFeeReceived(communityId, rsvpId, rsvpAmount, rsvpEvent.title);
              }
            }

            console.log('RSVP payment confirmed:', rsvpId);
          } else {
            console.log('RSVP already confirmed or not found, skipping:', rsvpId);
          }
          break;
        }

        // --- Estoppel payment branch ---
        if (metadataType === 'estoppel' && communityId) {
          // Idempotency: check if already created
          const { data: existingEstoppel } = await supabase
            .from('estoppel_requests')
            .select('id')
            .eq('stripe_session_id', session.id)
            .limit(1)
            .maybeSingle();

          if (existingEstoppel) {
            console.log('Estoppel request already created, skipping:', session.id);
            break;
          }

          // Reconstruct requester_fields from metadata
          let requesterFields: Record<string, string> = {};
          const chunksCount = session.metadata?.requester_fields_chunks;
          if (chunksCount) {
            let json = '';
            for (let i = 0; i < parseInt(chunksCount); i++) {
              json += session.metadata?.[`requester_fields_${i}`] || '';
            }
            try { requesterFields = JSON.parse(json); } catch { /* empty */ }
          } else if (session.metadata?.requester_fields) {
            try { requesterFields = JSON.parse(session.metadata.requester_fields); } catch { /* empty */ }
          }

          const requestType = session.metadata?.request_type || 'standard';
          const deliveryEmail = session.metadata?.delivery_email || '';
          const unitId = session.metadata?.unit_id || null;
          const feeAmount = session.amount_total || 0;

          // Insert estoppel request (system fields computed on-demand in review dialog)
          const { data: newRequest } = await supabase.from('estoppel_requests').insert({
            community_id: communityId,
            requester_fields: requesterFields,
            system_fields: {},
            board_fields: {},
            unit_id: unitId || null,
            request_type: requestType,
            fee_amount: feeAmount,
            stripe_session_id: session.id,
            stripe_payment_intent: (session.payment_intent as string) || null,
            paid_at: new Date().toISOString(),
            status: 'pending',
            delivery_email: deliveryEmail,
          }).select('id').single();

          // Post estoppel fee to general ledger
          if (newRequest) {
            const { data: comm } = await supabase
              .from('communities')
              .select('theme')
              .eq('id', communityId)
              .single();
            const estTheme = comm?.theme as Record<string, unknown> | null;
            const estSettings = estTheme?.estoppel_settings as { gl_revenue_account_code?: string } | undefined;
            const glCode = estSettings?.gl_revenue_account_code || '4600';
            await postEstoppelFeeReceived(communityId, newRequest.id, feeAmount, glCode);
          }

          // Notify board
          void supabase.rpc('create_board_notifications', {
            p_community_id: communityId,
            p_type: 'general',
            p_title: `New estoppel request (${requestType})`,
            p_body: `Estoppel certificate requested for ${requesterFields.property_address || 'a property'}. Payment received.`,
            p_reference_id: null,
            p_reference_type: 'estoppel_request',
          });

          await logAuditEvent({
            communityId,
            action: 'estoppel_request_created',
            targetType: 'estoppel_request',
            metadata: { request_type: requestType, delivery_email: deliveryEmail },
          });

          console.log('Estoppel request created from checkout:', session.id);
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

        // Amount paid via Stripe (in cents) -- includes processing fee if any
        const stripeTotalAmount = session.amount_total || 0;
        // Determine how much of the Stripe total is the processing fee vs invoice payment
        // The invoice charge is the remaining balance; everything above that is the fee
        const invoiceRemaining = invoice.amount - (invoice.amount_paid || 0);
        const processingFeeAmount = Math.max(0, stripeTotalAmount - invoiceRemaining);
        const invoicePayment = stripeTotalAmount - processingFeeAmount;
        const totalPaid = (invoice.amount_paid || 0) + invoicePayment;

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

        // Create a payment record (invoice amount only, not the processing fee)
        await supabase.from('payments').insert({
          invoice_id: invoiceId,
          unit_id: invoice.unit_id,
          amount: invoicePayment,
          stripe_session_id: session.id,
          stripe_payment_intent: (session.payment_intent as string) || null,
          paid_by: invoice.paid_by || 'stripe',
        });

        // Post accounting journal entries (silently skips if not set up)
        await postPaymentReceived(communityId, invoiceId, invoice.unit_id, Math.min(invoicePayment, invoice.amount), invoice.title);

        // Post processing fee GL entry if a fee was charged
        if (processingFeeAmount > 0) {
          postProcessingFeeReceived(communityId, invoiceId, invoice.unit_id, processingFeeAmount, invoice.title).catch(() => {});
        }

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
          const overpaid = totalPaid > invoice.amount;
          const desc = overpaid
            ? `$${(stripeTotalAmount / 100).toFixed(2)} paid online. $${((totalPaid - invoice.amount) / 100).toFixed(2)} credited to your account.`
            : `$${(stripeTotalAmount / 100).toFixed(2)} paid online`;
          await queuePaymentConfirmation(
            communityId,
            community.slug,
            invoice.unit_id,
            invoice.title,
            stripeTotalAmount,
            new Date().toISOString(),
            desc
          );
        }

        await logAuditEvent({
          communityId: communityId,
          action: 'payment_received',
          targetType: 'invoice',
          targetId: invoiceId,
          metadata: { amount: stripeTotalAmount, method: 'stripe_checkout', title: invoice.title, processing_fee: processingFeeAmount },
        });

        // --- Autopay enrollment: create subscription if opted in ---
        if (session.metadata?.autopay === 'true' && session.customer) {
          try {
            const autopayBillingDay = parseInt(session.metadata.billing_day || '1', 10);
            const stripeCustomerId = typeof session.customer === 'string'
              ? session.customer
              : session.customer.id;

            // Guard: skip if unit already has a subscription
            const { data: autopayUnit } = await supabase
              .from('units')
              .select('id, stripe_subscription_id, payment_frequency')
              .eq('id', invoice.unit_id)
              .single();

            if (autopayUnit && !autopayUnit.stripe_subscription_id) {
              // Look up stripe_accounts for prices and connect config
              const { data: autopayStripeAccount } = await supabase
                .from('stripe_accounts')
                .select('*')
                .eq('community_id', communityId)
                .single();

              if (autopayStripeAccount) {
                const stripePrices = (autopayStripeAccount.stripe_prices as Record<string, string>) || {};
                let productId = autopayStripeAccount.stripe_product_id;

                // Create product and prices on the fly if they don't exist
                if (!productId || !stripePrices.monthly) {
                  const { data: assessment } = await supabase
                    .from('assessments')
                    .select('title, annual_amount')
                    .eq('community_id', communityId)
                    .eq('is_active', true)
                    .single();

                  if (assessment) {
                    if (!productId) {
                      const product = await stripe.products.create({
                        name: assessment.title,
                        metadata: { community_id: communityId },
                      });
                      productId = product.id;
                    }

                    let pricesChanged = false;
                    for (const [freq, config] of Object.entries(FREQUENCY_CONFIG)) {
                      if (stripePrices[freq]) continue;
                      const amount = Math.round(assessment.annual_amount / config.divisor);
                      const price = await stripe.prices.create({
                        product: productId,
                        unit_amount: amount,
                        currency: 'usd',
                        recurring: { interval: config.interval, interval_count: config.interval_count },
                        metadata: { frequency: freq, community_id: communityId },
                      });
                      stripePrices[freq] = price.id;
                      pricesChanged = true;
                    }

                    // Save back to stripe_accounts
                    const updateFields: Record<string, unknown> = { updated_at: new Date().toISOString() };
                    if (!autopayStripeAccount.stripe_product_id) updateFields.stripe_product_id = productId;
                    if (!autopayStripeAccount.stripe_default_price_id) updateFields.stripe_default_price_id = stripePrices.monthly || null;
                    if (pricesChanged) updateFields.stripe_prices = stripePrices;
                    if (Object.keys(updateFields).length > 1) {
                      await supabase.from('stripe_accounts').update(updateFields).eq('id', autopayStripeAccount.id);
                    }
                  }
                }

                const unitFreq = (autopayUnit.payment_frequency as PaymentFrequency) || 'monthly';
                const targetPriceId = stripePrices[unitFreq] || stripePrices.monthly;

                if (targetPriceId) {
                  // Retrieve payment method from the PaymentIntent
                  const paymentIntentId = typeof session.payment_intent === 'string'
                    ? session.payment_intent
                    : session.payment_intent?.id;

                  let paymentMethodId: string | undefined;
                  if (paymentIntentId) {
                    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
                    paymentMethodId = typeof pi.payment_method === 'string'
                      ? pi.payment_method
                      : pi.payment_method?.id || undefined;
                  }

                  // Set as customer's default payment method for invoices
                  if (paymentMethodId) {
                    await stripe.customers.update(stripeCustomerId, {
                      invoice_settings: { default_payment_method: paymentMethodId },
                    });
                  }

                  // Compute billing cycle anchor
                  const billingCycleAnchor = computeNextBillingAnchor(autopayBillingDay, unitFreq);

                  const isAutopayConnect = autopayStripeAccount.mode === 'connect' && autopayStripeAccount.stripe_account_id;

                  const subscription = await stripe.subscriptions.create({
                    customer: stripeCustomerId,
                    items: [{ price: targetPriceId }],
                    billing_cycle_anchor: billingCycleAnchor,
                    proration_behavior: 'none',
                    ...(paymentMethodId ? { default_payment_method: paymentMethodId } : {}),
                    metadata: {
                      unit_id: autopayUnit.id,
                      community_id: communityId,
                      payment_frequency: unitFreq,
                    },
                    ...(isAutopayConnect ? {
                      application_fee_percent: autopayStripeAccount.application_fee_percent,
                      transfer_data: { destination: autopayStripeAccount.stripe_account_id! },
                    } : {}),
                  });

                  // Update unit with subscription info
                  await supabase.from('units').update({
                    stripe_subscription_id: subscription.id,
                    stripe_subscription_status: subscription.status,
                    preferred_billing_day: autopayBillingDay,
                  }).eq('id', autopayUnit.id);

                  // Notify unit members about autopay enrollment
                  const { data: unitMembers } = await supabase
                    .from('members')
                    .select('id')
                    .eq('unit_id', autopayUnit.id)
                    .eq('is_approved', true);

                  if (unitMembers && unitMembers.length > 0) {
                    const ordSuffix = ['th', 'st', 'nd', 'rd'];
                    const v = autopayBillingDay % 100;
                    const ord = autopayBillingDay + (ordSuffix[(v - 20) % 10] || ordSuffix[v] || ordSuffix[0]);
                    void supabase.rpc('create_member_notifications', {
                      p_community_id: communityId,
                      p_type: 'general',
                      p_title: 'Auto-pay enabled',
                      p_body: `Your auto-pay is set up. Future charges will be billed on the ${ord} of each month.`,
                      p_reference_id: null,
                      p_reference_type: 'payment',
                      p_member_ids: unitMembers.map((m: { id: string }) => m.id),
                    });
                  }

                  await logAuditEvent({
                    communityId,
                    action: 'autopay_enrolled',
                    targetType: 'unit',
                    targetId: autopayUnit.id,
                    metadata: { billing_day: autopayBillingDay, frequency: unitFreq, subscription_id: subscription.id },
                  });

                  console.log('Autopay subscription created for unit:', autopayUnit.id, 'subscription:', subscription.id);
                } else {
                  console.warn('No Stripe price found for autopay enrollment, skipping. Unit:', autopayUnit.id);
                }
              }
            } else if (autopayUnit?.stripe_subscription_id) {
              console.log('Unit already has subscription, skipping autopay enrollment:', autopayUnit.id);
            }
          } catch (autopayErr) {
            // Log but don't fail the webhook — the payment itself was successful
            console.error('Failed to create autopay subscription:', autopayErr);
          }
        }

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
          const overpaid = duesiqInvoice.amount_paid + amountPaid > duesiqInvoice.amount;
          const desc = overpaid
            ? `$${(amountPaid / 100).toFixed(2)} auto-paid. $${((duesiqInvoice.amount_paid + amountPaid - duesiqInvoice.amount) / 100).toFixed(2)} credited to your account.`
            : `$${(amountPaid / 100).toFixed(2)} auto-paid`;
          await queuePaymentConfirmation(
            unit.community_id,
            community.slug,
            unit.id,
            duesiqInvoice.title,
            amountPaid,
            new Date().toISOString(),
            desc
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

        // Notify unit members about payment failure
        const { data: unitMembers } = await supabase
          .from('members')
          .select('id')
          .eq('unit_id', unit.id)
          .eq('is_approved', true);

        if (unitMembers && unitMembers.length > 0) {
          void supabase.rpc('create_member_notifications', {
            p_community_id: unit.community_id,
            p_type: 'payment_failed',
            p_title: 'Payment failed',
            p_body: 'Your automatic payment could not be processed. Please update your payment method or make a manual payment.',
            p_reference_id: duesiqInvoice?.id ?? null,
            p_reference_type: 'invoice',
            p_member_ids: unitMembers.map((m: { id: string }) => m.id),
          });
        }

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
