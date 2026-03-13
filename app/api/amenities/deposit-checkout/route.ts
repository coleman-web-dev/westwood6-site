import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type Stripe from 'stripe';

/**
 * POST /api/amenities/deposit-checkout
 * Creates a Stripe Checkout Session for an amenity security deposit payment.
 * Body: { reservationId, communityId, successUrl, cancelUrl }
 */
export async function POST(req: NextRequest) {
  try {
    const { reservationId, communityId, successUrl, cancelUrl } = await req.json();

    if (!reservationId || !communityId || !successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: 'reservationId, communityId, successUrl, and cancelUrl are required' },
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

    // Fetch reservation
    const { data: reservation, error: resError } = await supabase
      .from('reservations')
      .select('*, amenities(name)')
      .eq('id', reservationId)
      .eq('community_id', communityId)
      .single();

    if (resError || !reservation) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      );
    }

    // Verify the user owns this reservation's unit (or is board)
    const isBoardOrHigher =
      member.system_role === 'board' ||
      member.system_role === 'manager' ||
      member.system_role === 'super_admin';

    if (!isBoardOrHigher && member.unit_id !== reservation.unit_id) {
      return NextResponse.json(
        { error: 'You do not have permission to pay this deposit' },
        { status: 403 }
      );
    }

    if (reservation.deposit_amount <= 0) {
      return NextResponse.json(
        { error: 'No deposit required for this reservation' },
        { status: 400 }
      );
    }

    if (reservation.deposit_paid) {
      return NextResponse.json(
        { error: 'Deposit has already been paid' },
        { status: 400 }
      );
    }

    if (reservation.status === 'cancelled' || reservation.status === 'denied') {
      return NextResponse.json(
        { error: 'Cannot pay deposit for a cancelled or denied reservation' },
        { status: 400 }
      );
    }

    // Fetch Stripe account config
    const { data: stripeAccount } = await supabase
      .from('stripe_accounts')
      .select('*')
      .eq('community_id', communityId)
      .single();

    if (!stripeAccount || !stripeAccount.charges_enabled) {
      return NextResponse.json(
        { error: 'Stripe is not configured for this community' },
        { status: 400 }
      );
    }

    // Get community name
    const { data: community } = await supabase
      .from('communities')
      .select('name')
      .eq('id', communityId)
      .single();

    const communityName = community?.name || 'Community';
    const amenityName = reservation.amenities?.name || 'Amenity';
    const stripe = getStripeClient();

    // Build checkout session params
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      payment_method_types: ['card', 'us_bank_account'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Security Deposit: ${amenityName}`,
              description: `${communityName} - Refundable security deposit`,
            },
            unit_amount: reservation.deposit_amount,
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        reservation_id: reservationId,
        community_id: communityId,
        type: 'deposit',
      },
    };

    // Connect mode: add transfer_data and application fee
    if (stripeAccount.mode === 'connect' && stripeAccount.stripe_account_id) {
      const applicationFeeAmount = Math.round(
        reservation.deposit_amount * (stripeAccount.application_fee_percent / 100)
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
    console.error('Deposit checkout error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
