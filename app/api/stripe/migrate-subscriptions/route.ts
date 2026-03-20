import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type { PaymentFrequency } from '@/lib/types/database';

export const runtime = 'nodejs';

const BATCH_SIZE = 10;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * POST /api/stripe/migrate-subscriptions
 * Updates existing subscriptions to route funds to the connected Express account.
 * Also swaps subscriptions to the correct frequency-matched price if the unit's
 * payment_frequency doesn't match the current subscription price interval.
 * Called after a community completes Stripe Connect onboarding (direct -> connect upgrade).
 * Requires board member authentication.
 */
export async function POST(req: NextRequest) {
  try {
    const { communityId } = await req.json();

    if (!communityId) {
      return NextResponse.json(
        { error: 'communityId is required' },
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

    const { data: callerMember } = await supabase
      .from('members')
      .select('system_role')
      .eq('user_id', user.id)
      .eq('community_id', communityId)
      .single();

    if (!callerMember) {
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

    // Verify the community is in Connect mode with a valid account
    const { data: stripeAccount } = await supabase
      .from('stripe_accounts')
      .select('*')
      .eq('community_id', communityId)
      .single();

    if (!stripeAccount) {
      return NextResponse.json(
        { error: 'Stripe account not configured' },
        { status: 400 }
      );
    }

    if (stripeAccount.mode !== 'connect' || !stripeAccount.stripe_account_id) {
      return NextResponse.json(
        { error: 'Community must be in Connect mode with a connected account' },
        { status: 400 }
      );
    }

    if (!stripeAccount.onboarding_complete || !stripeAccount.charges_enabled) {
      return NextResponse.json(
        { error: 'Stripe onboarding must be complete before migrating subscriptions' },
        { status: 400 }
      );
    }

    const stripe = getStripeClient();
    const stripePrices = (stripeAccount.stripe_prices as Record<string, string>) || {};

    // Fetch all units with active subscriptions
    const { data: units, error: unitsError } = await supabase
      .from('units')
      .select('id, unit_number, stripe_subscription_id, payment_frequency')
      .eq('community_id', communityId)
      .not('stripe_subscription_id', 'is', null);

    if (unitsError) {
      return NextResponse.json(
        { error: `Failed to fetch units: ${unitsError.message}` },
        { status: 500 }
      );
    }

    if (!units || units.length === 0) {
      return NextResponse.json({ migrated: 0, skipped: 0, errors: [] });
    }

    let migrated = 0;
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
          // Retrieve the subscription to check current state
          const subscription = await stripe.subscriptions.retrieve(unit.stripe_subscription_id);

          // Skip canceled/incomplete subscriptions
          if (subscription.status === 'canceled' || subscription.status === 'incomplete_expired') {
            skipped++;
            return;
          }

          // Check if already has transfer_data
          const alreadyMigrated = !!subscription.transfer_data?.destination;
          if (alreadyMigrated) {
            skipped++;
            return;
          }

          // Build update params: add transfer_data + application_fee_percent
          const updateParams: Record<string, unknown> = {
            application_fee_percent: stripeAccount.application_fee_percent,
            transfer_data: {
              destination: stripeAccount.stripe_account_id!,
            },
          };

          // Also swap to frequency-matched price if needed
          const unitFreq = (unit.payment_frequency as PaymentFrequency) || 'monthly';
          const targetPriceId = stripePrices[unitFreq];
          if (targetPriceId && subscription.items.data.length > 0) {
            const currentItem = subscription.items.data[0];
            if (currentItem.price.id !== targetPriceId) {
              updateParams.items = [{
                id: currentItem.id,
                price: targetPriceId,
              }];
              updateParams.proration_behavior = 'none';
            }
          }

          await stripe.subscriptions.update(unit.stripe_subscription_id, updateParams);
          migrated++;
        } catch (stripeErr) {
          const msg = stripeErr instanceof Error ? stripeErr.message : 'Unknown Stripe error';
          errors.push(`Unit ${unit.unit_number}: ${msg}`);
        }
      });

      await Promise.all(batchPromises);

      // Small delay between batches to respect rate limits
      if (i + BATCH_SIZE < units.length) {
        await delay(100);
      }
    }

    return NextResponse.json({ migrated, skipped, errors });
  } catch (err) {
    console.error('Stripe migrate-subscriptions error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
