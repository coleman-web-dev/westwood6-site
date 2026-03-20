import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type { PaymentFrequency } from '@/lib/types/database';

/**
 * POST /api/stripe/update-subscription-frequency
 * Updates a unit's Stripe subscription to match a new payment frequency.
 * Swaps the subscription item to the correct frequency-matched price.
 * Body: { unitId, communityId, newFrequency }
 * Requires: unit household member or board member.
 */
export async function POST(req: NextRequest) {
  try {
    const { unitId, communityId, newFrequency } = await req.json();

    if (!unitId || !communityId || !newFrequency) {
      return NextResponse.json(
        { error: 'unitId, communityId, and newFrequency are required' },
        { status: 400 }
      );
    }

    const validFreqs: PaymentFrequency[] = ['monthly', 'quarterly', 'semi_annual', 'annual'];
    if (!validFreqs.includes(newFrequency)) {
      return NextResponse.json(
        { error: 'Invalid payment frequency' },
        { status: 400 }
      );
    }

    // Verify the user is authenticated
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Verify user is a member of this community (board or household member of the unit)
    const { data: callerMember } = await supabase
      .from('members')
      .select('system_role, unit_id')
      .eq('user_id', user.id)
      .eq('community_id', communityId)
      .single();

    if (!callerMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 403 });
    }

    const isBoardOrHigher =
      callerMember.system_role === 'board' ||
      callerMember.system_role === 'manager' ||
      callerMember.system_role === 'super_admin';

    const isHouseholdMember = callerMember.unit_id === unitId;

    if (!isBoardOrHigher && !isHouseholdMember) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Fetch unit and its subscription
    const { data: unit } = await supabase
      .from('units')
      .select('id, stripe_subscription_id')
      .eq('id', unitId)
      .eq('community_id', communityId)
      .single();

    if (!unit) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
    }

    if (!unit.stripe_subscription_id) {
      // No subscription to update, just the DB field change is enough
      return NextResponse.json({ updated: true, message: 'No active subscription to update' });
    }

    // Fetch stripe_accounts for the community
    const { data: stripeAccount } = await supabase
      .from('stripe_accounts')
      .select('stripe_prices')
      .eq('community_id', communityId)
      .single();

    if (!stripeAccount) {
      return NextResponse.json({ error: 'Stripe account not configured' }, { status: 400 });
    }

    const stripePrices = (stripeAccount.stripe_prices as Record<string, string>) || {};
    const targetPriceId = stripePrices[newFrequency];

    if (!targetPriceId) {
      return NextResponse.json(
        { error: `No Stripe price configured for ${newFrequency} frequency` },
        { status: 400 }
      );
    }

    const stripe = getStripeClient();

    // Retrieve current subscription
    const subscription = await stripe.subscriptions.retrieve(unit.stripe_subscription_id);

    if (subscription.status === 'canceled' || subscription.status === 'incomplete_expired') {
      return NextResponse.json({ error: 'Subscription is no longer active' }, { status: 400 });
    }

    // Swap the subscription item to the new price
    const currentItem = subscription.items.data[0];
    if (currentItem && currentItem.price.id !== targetPriceId) {
      await stripe.subscriptions.update(unit.stripe_subscription_id, {
        items: [{
          id: currentItem.id,
          price: targetPriceId,
        }],
        proration_behavior: 'none',
        metadata: {
          ...subscription.metadata,
          payment_frequency: newFrequency,
        },
      });
    }

    return NextResponse.json({ updated: true });
  } catch (err) {
    console.error('Update subscription frequency error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
