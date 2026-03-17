import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { postEventRsvpFeeRefunded } from '@/lib/utils/accounting-entries';
import type Stripe from 'stripe';

/**
 * POST /api/events/[id]/rsvp
 * Creates an RSVP for an event. If the event has a fee, creates a Stripe
 * Checkout Session and returns the URL. If free, confirms immediately.
 * Body: { communityId, guestCount, successUrl, cancelUrl }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const { communityId, guestCount, successUrl, cancelUrl } = await req.json();

    if (!communityId || !guestCount) {
      return NextResponse.json(
        { error: 'communityId and guestCount are required' },
        { status: 400 }
      );
    }

    // Authenticate
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const supabase = createAdminClient();

    // Verify community membership
    const { data: member } = await supabase
      .from('members')
      .select('id, unit_id, system_role')
      .eq('user_id', user.id)
      .eq('community_id', communityId)
      .eq('is_approved', true)
      .single();

    if (!member) {
      return NextResponse.json(
        { error: 'You do not belong to this community' },
        { status: 403 }
      );
    }

    // Fetch event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .eq('community_id', communityId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    if (!event.rsvp_enabled) {
      return NextResponse.json(
        { error: 'RSVP is not enabled for this event' },
        { status: 400 }
      );
    }

    // Check event hasn't started
    if (new Date(event.start_datetime) <= new Date()) {
      return NextResponse.json(
        { error: 'This event has already started' },
        { status: 400 }
      );
    }

    // Check for existing active RSVP
    const { data: existingRsvp } = await supabase
      .from('event_rsvps')
      .select('id, status')
      .eq('event_id', eventId)
      .eq('member_id', member.id)
      .in('status', ['confirmed', 'pending_payment'])
      .maybeSingle();

    if (existingRsvp) {
      return NextResponse.json(
        { error: 'You have already RSVPd to this event' },
        { status: 400 }
      );
    }

    // Check capacity
    if (event.rsvp_max_capacity) {
      const { data: currentRsvps } = await supabase
        .from('event_rsvps')
        .select('guest_count')
        .eq('event_id', eventId)
        .eq('status', 'confirmed');

      const totalGuests = (currentRsvps ?? []).reduce(
        (sum: number, r: { guest_count: number }) => sum + r.guest_count,
        0
      );

      if (totalGuests + guestCount > event.rsvp_max_capacity) {
        const remaining = event.rsvp_max_capacity - totalGuests;
        return NextResponse.json(
          { error: remaining > 0 ? `Only ${remaining} spots remaining` : 'This event is full' },
          { status: 400 }
        );
      }
    }

    // Calculate total fee
    const totalFee =
      event.rsvp_fee > 0
        ? event.rsvp_fee_type === 'per_person'
          ? event.rsvp_fee * guestCount
          : event.rsvp_fee
        : 0;

    // FREE RSVP
    if (totalFee === 0) {
      // Delete any cancelled RSVP to allow re-RSVP (unique constraint)
      await supabase
        .from('event_rsvps')
        .delete()
        .eq('event_id', eventId)
        .eq('member_id', member.id)
        .eq('status', 'cancelled');

      const { error: insertError } = await supabase
        .from('event_rsvps')
        .insert({
          event_id: eventId,
          community_id: communityId,
          member_id: member.id,
          unit_id: member.unit_id,
          guest_count: guestCount,
          total_fee: 0,
          status: 'confirmed',
        });

      if (insertError) {
        console.error('RSVP insert error:', insertError);
        return NextResponse.json(
          { error: 'Failed to create RSVP' },
          { status: 500 }
        );
      }

      // Notify board (fire-and-forget)
      void supabase.rpc('create_board_notifications', {
        p_community_id: communityId,
        p_type: 'general',
        p_title: `New RSVP for ${event.title}`,
        p_body: `A member has RSVPd with ${guestCount} guest${guestCount > 1 ? 's' : ''}.`,
        p_reference_id: eventId,
        p_reference_type: 'event',
      });

      return NextResponse.json({ success: true });
    }

    // PAID RSVP - Create Stripe Checkout Session
    if (!successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: 'successUrl and cancelUrl are required for paid RSVPs' },
        { status: 400 }
      );
    }

    // Delete any cancelled RSVP to allow re-RSVP (unique constraint)
    await supabase
      .from('event_rsvps')
      .delete()
      .eq('event_id', eventId)
      .eq('member_id', member.id)
      .eq('status', 'cancelled');

    // Insert pending RSVP
    const { data: rsvp, error: rsvpError } = await supabase
      .from('event_rsvps')
      .insert({
        event_id: eventId,
        community_id: communityId,
        member_id: member.id,
        unit_id: member.unit_id,
        guest_count: guestCount,
        total_fee: totalFee,
        status: 'pending_payment',
      })
      .select('id')
      .single();

    if (rsvpError || !rsvp) {
      console.error('RSVP insert error:', rsvpError);
      return NextResponse.json(
        { error: 'Failed to create RSVP' },
        { status: 500 }
      );
    }

    // Fetch Stripe account config
    const { data: stripeAccount } = await supabase
      .from('stripe_accounts')
      .select('*')
      .eq('community_id', communityId)
      .single();

    if (!stripeAccount || !stripeAccount.charges_enabled) {
      // Clean up the pending RSVP
      await supabase.from('event_rsvps').delete().eq('id', rsvp.id);
      return NextResponse.json(
        { error: 'Stripe is not configured for this community' },
        { status: 400 }
      );
    }

    // Get community name for Stripe line item
    const { data: community } = await supabase
      .from('communities')
      .select('name')
      .eq('id', communityId)
      .single();

    const communityName = community?.name || 'Community';
    const stripe = getStripeClient();

    const feeLabel =
      event.rsvp_fee_type === 'per_person'
        ? `${event.title} RSVP (${guestCount} guest${guestCount > 1 ? 's' : ''})`
        : `${event.title} RSVP`;

    // Build checkout session params
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      payment_method_types: ['card', 'us_bank_account'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: feeLabel,
              description: `${communityName} - Event RSVP`,
            },
            unit_amount: totalFee,
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        rsvp_id: rsvp.id,
        event_id: eventId,
        community_id: communityId,
      },
    };

    // Connect mode: add transfer_data and application fee
    if (stripeAccount.mode === 'connect' && stripeAccount.stripe_account_id) {
      const applicationFeeAmount = Math.round(
        totalFee * (stripeAccount.application_fee_percent / 100)
      );
      sessionParams.payment_intent_data = {
        application_fee_amount: applicationFeeAmount,
        transfer_data: {
          destination: stripeAccount.stripe_account_id,
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('RSVP creation error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/events/[id]/rsvp
 * Cancels the current user's RSVP. Handles auto-refund based on event policy.
 * Body: { communityId }
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const { communityId } = await req.json();

    if (!communityId) {
      return NextResponse.json(
        { error: 'communityId is required' },
        { status: 400 }
      );
    }

    // Authenticate
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const supabase = createAdminClient();

    // Verify community membership
    const { data: member } = await supabase
      .from('members')
      .select('id')
      .eq('user_id', user.id)
      .eq('community_id', communityId)
      .eq('is_approved', true)
      .single();

    if (!member) {
      return NextResponse.json(
        { error: 'You do not belong to this community' },
        { status: 403 }
      );
    }

    // Fetch the RSVP
    const { data: rsvp } = await supabase
      .from('event_rsvps')
      .select('*')
      .eq('event_id', eventId)
      .eq('member_id', member.id)
      .eq('status', 'confirmed')
      .single();

    if (!rsvp) {
      return NextResponse.json(
        { error: 'No active RSVP found' },
        { status: 404 }
      );
    }

    // Fetch event to check cancellation policy
    const { data: event } = await supabase
      .from('events')
      .select('rsvp_allow_cancellation, rsvp_cancellation_notice_hours, start_datetime, title')
      .eq('id', eventId)
      .single();

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    if (!event.rsvp_allow_cancellation) {
      return NextResponse.json(
        { error: 'Cancellations are not allowed for this event' },
        { status: 400 }
      );
    }

    // Determine if eligible for refund
    let refunded = false;
    if (rsvp.total_fee > 0 && rsvp.stripe_payment_intent) {
      const hoursUntilEvent =
        (new Date(event.start_datetime).getTime() - Date.now()) / (1000 * 60 * 60);

      const eligibleForRefund =
        event.rsvp_cancellation_notice_hours === null ||
        hoursUntilEvent >= event.rsvp_cancellation_notice_hours;

      if (eligibleForRefund) {
        try {
          const stripe = getStripeClient();
          await stripe.refunds.create({
            payment_intent: rsvp.stripe_payment_intent,
          });
          refunded = true;
        } catch (refundError) {
          console.error('Stripe refund error:', refundError);
          // Continue with cancellation even if refund fails
        }
      }
    }

    // Update RSVP status
    await supabase
      .from('event_rsvps')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        ...(refunded ? { refunded_at: new Date().toISOString() } : {}),
      })
      .eq('id', rsvp.id);

    // Post GL journal entry for refund
    if (refunded) {
      postEventRsvpFeeRefunded(communityId, rsvp.id, rsvp.total_fee, event.title).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      refunded,
      message: refunded
        ? 'RSVP cancelled and payment refunded.'
        : rsvp.total_fee > 0
          ? 'RSVP cancelled. No refund issued (past cancellation deadline).'
          : 'RSVP cancelled.',
    });
  } catch (err) {
    console.error('RSVP cancellation error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
