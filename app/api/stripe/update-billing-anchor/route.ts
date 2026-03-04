import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * Calculate the next occurrence of a given day-of-month.
 * If today is before that day this month, returns this month's date.
 * Otherwise returns next month's date.
 */
function getNextBillingDate(billingDay: number): Date {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const today = now.getUTCDate();

  if (today < billingDay) {
    return new Date(Date.UTC(year, month, billingDay, 0, 0, 0));
  }

  return new Date(Date.UTC(year, month + 1, billingDay, 0, 0, 0));
}

/**
 * POST /api/stripe/update-billing-anchor
 * Allows an authenticated member to change their own unit's billing day.
 * Sets trial_end on the subscription to reset the billing cycle anchor.
 */
export async function POST(req: NextRequest) {
  try {
    const { communityId, billingDay } = await req.json();

    if (!communityId) {
      return NextResponse.json(
        { error: 'communityId is required' },
        { status: 400 }
      );
    }

    if (!billingDay || billingDay < 1 || billingDay > 28) {
      return NextResponse.json(
        { error: 'billingDay must be between 1 and 28' },
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

    // Look up the caller's member record to find their unit
    const { data: callerMember, error: memberError } = await supabase
      .from('members')
      .select('unit_id')
      .eq('user_id', user.id)
      .eq('community_id', communityId)
      .single();

    if (memberError || !callerMember?.unit_id) {
      return NextResponse.json(
        { error: 'Member or unit not found' },
        { status: 403 }
      );
    }

    // Fetch the unit's subscription
    const { data: unit, error: unitError } = await supabase
      .from('units')
      .select('id, unit_number, stripe_subscription_id')
      .eq('id', callerMember.unit_id)
      .single();

    if (unitError || !unit) {
      return NextResponse.json(
        { error: 'Unit not found' },
        { status: 404 }
      );
    }

    if (!unit.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'No active subscription found for your unit' },
        { status: 400 }
      );
    }

    // Calculate the trial_end timestamp
    const nextBillingDate = getNextBillingDate(billingDay);
    const trialEnd = Math.floor(nextBillingDate.getTime() / 1000);

    const stripe = getStripeClient();

    await stripe.subscriptions.update(unit.stripe_subscription_id, {
      trial_end: trialEnd,
      proration_behavior: 'none',
    });

    return NextResponse.json({
      success: true,
      nextBillingDate: nextBillingDate.toISOString(),
    });
  } catch (err) {
    console.error('Stripe update-billing-anchor error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
