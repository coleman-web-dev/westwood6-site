import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { postAmenityDepositReturned, postAmenityDepositRetained } from '@/lib/utils/accounting-entries';

/**
 * POST /api/amenities/deposit-refund
 * Refunds a security deposit to the original credit card via Stripe.
 * Board-only action.
 * Body: { reservationId, communityId, amount? }
 * amount is optional, in cents. If omitted, full refund is issued.
 */
export async function POST(req: NextRequest) {
  try {
    const { reservationId, communityId, amount } = await req.json();

    if (!reservationId || !communityId) {
      return NextResponse.json(
        { error: 'reservationId and communityId are required' },
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

    // Verify board membership
    const { data: member } = await supabase
      .from('members')
      .select('id, system_role')
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

    const isBoardOrHigher =
      member.system_role === 'board' ||
      member.system_role === 'manager' ||
      member.system_role === 'super_admin';

    if (!isBoardOrHigher) {
      return NextResponse.json(
        { error: 'Only board members can refund deposits' },
        { status: 403 }
      );
    }

    // Fetch reservation with amenity name
    const { data: reservation, error: resError } = await supabase
      .from('reservations')
      .select('*, amenity:amenities!amenity_id(name)')
      .eq('id', reservationId)
      .eq('community_id', communityId)
      .single();

    if (resError || !reservation) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      );
    }

    if (reservation.deposit_refunded) {
      return NextResponse.json(
        { error: 'Deposit has already been refunded' },
        { status: 400 }
      );
    }

    if (!reservation.deposit_stripe_payment_intent) {
      return NextResponse.json(
        { error: 'This deposit was not paid by credit card. Use wallet or check return instead.' },
        { status: 400 }
      );
    }

    // Validate refund amount if provided
    const refundAmount = amount ? Number(amount) : reservation.deposit_amount;
    if (refundAmount <= 0 || refundAmount > reservation.deposit_amount) {
      return NextResponse.json(
        { error: `Refund amount must be between 1 and ${reservation.deposit_amount} cents.` },
        { status: 400 }
      );
    }

    // Process Stripe refund (partial or full)
    const stripe = getStripeClient();

    try {
      const refundParams: { payment_intent: string; amount?: number } = {
        payment_intent: reservation.deposit_stripe_payment_intent,
      };
      // Only pass amount for partial refunds; omitting it refunds the full PI
      if (refundAmount < reservation.deposit_amount) {
        refundParams.amount = refundAmount;
      }
      await stripe.refunds.create(refundParams);
    } catch (refundError) {
      console.error('Stripe deposit refund error:', refundError);
      const message = refundError instanceof Error ? refundError.message : 'Stripe refund failed';
      return NextResponse.json(
        { error: `Refund failed: ${message}` },
        { status: 500 }
      );
    }

    // Update reservation
    const { error: updateError } = await supabase
      .from('reservations')
      .update({
        deposit_refunded: true,
        deposit_return_method: 'card',
        deposit_refund_amount: refundAmount,
      })
      .eq('id', reservationId);

    if (updateError) {
      console.error('Failed to update reservation after refund:', updateError);
      // Refund was processed but DB update failed, log for manual review
      return NextResponse.json(
        { error: 'Refund was processed but failed to update record. Please contact support.' },
        { status: 500 }
      );
    }

    // Post GL journal entries for deposit refund
    const amenityName = (reservation.amenity as { name: string } | null)?.name ?? 'Amenity';
    const unitId = reservation.unit_id as string | null;

    if (unitId) {
      // Refunded portion
      if (refundAmount > 0) {
        postAmenityDepositReturned(communityId, reservationId, unitId, refundAmount, amenityName).catch(() => {});
      }
      // Retained portion (if partial refund)
      const retainedAmount = reservation.deposit_amount - refundAmount;
      if (retainedAmount > 0) {
        postAmenityDepositRetained(communityId, reservationId, unitId, retainedAmount, amenityName).catch(() => {});
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Deposit refund error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
