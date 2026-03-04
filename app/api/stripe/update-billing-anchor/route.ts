import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type { UpdateBillingAnchorResponse } from '@/lib/types/stripe';

export const runtime = 'nodejs';

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 100;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
    // Use this month
    return new Date(Date.UTC(year, month, billingDay, 0, 0, 0));
  }

  // Use next month
  return new Date(Date.UTC(year, month + 1, billingDay, 0, 0, 0));
}

/**
 * POST /api/stripe/update-billing-anchor
 * Updates the billing cycle anchor for existing Stripe subscriptions
 * by setting trial_end to the next occurrence of the desired billing day.
 */
export async function POST(req: NextRequest) {
  try {
    const { communityId, billingDay, unitId } = await req.json();

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

    // Verify the user is authenticated and is a board member
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const supabase = createAdminClient();

    const { data: callerMember, error: memberError } = await supabase
      .from('members')
      .select('system_role')
      .eq('user_id', user.id)
      .eq('community_id', communityId)
      .single();

    if (memberError || !callerMember) {
      return NextResponse.json(
        { error: 'Member not found for this community' },
        { status: 403 }
      );
    }

    const isBoardOrHigher =
      callerMember.system_role === 'board' ||
      callerMember.system_role === 'manager' ||
      callerMember.system_role === 'super_admin';

    if (!isBoardOrHigher) {
      return NextResponse.json(
        { error: 'Board member access required' },
        { status: 403 }
      );
    }

    const stripe = getStripeClient();

    // Fetch units with active subscriptions
    let query = supabase
      .from('units')
      .select('id, unit_number, stripe_subscription_id')
      .eq('community_id', communityId)
      .not('stripe_subscription_id', 'is', null);

    if (unitId) {
      query = query.eq('id', unitId);
    }

    const { data: units, error: unitsError } = await query;

    if (unitsError) {
      return NextResponse.json(
        { error: `Failed to fetch units: ${unitsError.message}` },
        { status: 500 }
      );
    }

    if (!units || units.length === 0) {
      return NextResponse.json(
        { error: 'No units with active subscriptions found' },
        { status: 400 }
      );
    }

    // Calculate the trial_end timestamp
    const nextBillingDate = getNextBillingDate(billingDay);
    const trialEnd = Math.floor(nextBillingDate.getTime() / 1000);

    // Process in batches
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < units.length; i += BATCH_SIZE) {
      const batch = units.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(async (unit) => {
        if (!unit.stripe_subscription_id) {
          skipped++;
          return;
        }

        try {
          await stripe.subscriptions.update(unit.stripe_subscription_id, {
            trial_end: trialEnd,
            proration_behavior: 'none',
          });
          updated++;
        } catch (stripeErr) {
          const msg = stripeErr instanceof Error ? stripeErr.message : 'Unknown Stripe error';
          errors.push(`Unit ${unit.unit_number}: ${msg}`);
        }
      });

      await Promise.all(batchPromises);

      if (i + BATCH_SIZE < units.length) {
        await delay(BATCH_DELAY_MS);
      }
    }

    const response: UpdateBillingAnchorResponse = { updated, skipped, errors };
    return NextResponse.json(response);
  } catch (err) {
    console.error('Stripe update-billing-anchor error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
