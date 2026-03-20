import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type { CreateSubscriptionsResponse } from '@/lib/types/stripe';
import type { PaymentFrequency } from '@/lib/types/database';

export const runtime = 'nodejs';

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 100;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Price configuration for each payment frequency.
 * interval/interval_count map to Stripe recurring price params.
 * divisor determines the per-period amount from annual_amount.
 */
const FREQUENCY_CONFIG: Record<PaymentFrequency, {
  interval: 'month' | 'year';
  interval_count: number;
  divisor: number;
}> = {
  monthly: { interval: 'month', interval_count: 1, divisor: 12 },
  quarterly: { interval: 'month', interval_count: 3, divisor: 4 },
  semi_annual: { interval: 'month', interval_count: 6, divisor: 2 },
  annual: { interval: 'year', interval_count: 1, divisor: 1 },
};

/**
 * POST /api/stripe/create-subscriptions
 * Creates Stripe subscriptions for all units with linked Stripe customers.
 * Creates frequency-matched subscriptions (monthly, quarterly, semi-annual, annual)
 * based on each unit's payment_frequency setting.
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

    // 1. Fetch the active assessment for the community
    const { data: assessment, error: assessmentError } = await supabase
      .from('assessments')
      .select('*')
      .eq('community_id', communityId)
      .eq('is_active', true)
      .single();

    if (assessmentError || !assessment) {
      return NextResponse.json(
        { error: 'No active assessment found for this community' },
        { status: 400 }
      );
    }

    // 2. Fetch stripe_accounts for the community
    const { data: stripeAccount, error: stripeError } = await supabase
      .from('stripe_accounts')
      .select('*')
      .eq('community_id', communityId)
      .single();

    if (stripeError || !stripeAccount) {
      return NextResponse.json(
        { error: 'Stripe account not configured for this community' },
        { status: 400 }
      );
    }

    // 3. Create Stripe Product and all frequency Prices if they don't exist yet
    let productId = stripeAccount.stripe_product_id;
    const stripePrices: Record<string, string> = (stripeAccount.stripe_prices as Record<string, string>) || {};

    if (!productId) {
      const product = await stripe.products.create({
        name: assessment.title,
        metadata: { community_id: communityId },
      });
      productId = product.id;
    }

    // Create any missing prices for each frequency
    let pricesChanged = false;
    for (const [freq, config] of Object.entries(FREQUENCY_CONFIG)) {
      if (stripePrices[freq]) continue; // Already exists

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

    // Save product and price IDs to stripe_accounts
    const updateFields: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (!stripeAccount.stripe_product_id) {
      updateFields.stripe_product_id = productId;
    }
    if (!stripeAccount.stripe_default_price_id) {
      updateFields.stripe_default_price_id = stripePrices.monthly || null;
    }
    if (pricesChanged) {
      updateFields.stripe_prices = stripePrices;
    }

    if (Object.keys(updateFields).length > 1) {
      await supabase
        .from('stripe_accounts')
        .update(updateFields)
        .eq('id', stripeAccount.id);
    }

    // Verify we have at least the monthly price
    if (!stripePrices.monthly) {
      return NextResponse.json(
        { error: 'Failed to resolve Stripe monthly price' },
        { status: 500 }
      );
    }

    // 4. Fetch all active units with their owner members who have stripe_customer_id
    const { data: units, error: unitsError } = await supabase
      .from('units')
      .select(`
        id,
        unit_number,
        stripe_subscription_id,
        preferred_billing_day,
        payment_frequency,
        members!inner (
          id,
          stripe_customer_id,
          member_role,
          parent_member_id
        )
      `)
      .eq('community_id', communityId)
      .eq('status', 'active')
      .eq('members.member_role', 'owner')
      .is('members.parent_member_id', null)
      .not('members.stripe_customer_id', 'is', null);

    if (unitsError) {
      return NextResponse.json(
        { error: `Failed to fetch units: ${unitsError.message}` },
        { status: 500 }
      );
    }

    // 5. Process units in batches
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < (units || []).length; i += BATCH_SIZE) {
      const batch = units!.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(async (unit) => {
        // Skip if unit already has a subscription
        if (unit.stripe_subscription_id) {
          skipped++;
          return;
        }

        // Get the owner's stripe_customer_id from the joined members
        const members = unit.members as unknown as Array<{
          id: string;
          stripe_customer_id: string | null;
          member_role: string;
          parent_member_id: string | null;
        }>;
        const owner = members[0];

        if (!owner?.stripe_customer_id) {
          skipped++;
          return;
        }

        try {
          // Determine billing day: use unit's preferred day, or look up from last Stripe charge
          let billingDay = 1; // default to 1st of month
          const unitRecord = unit as unknown as { preferred_billing_day?: number | null };

          if (unitRecord.preferred_billing_day) {
            billingDay = unitRecord.preferred_billing_day;
          } else {
            // Look up last charge to preserve existing autopay date
            try {
              const charges = await stripe.charges.list({
                customer: owner.stripe_customer_id,
                limit: 1,
              });
              if (charges.data.length > 0) {
                const chargeDate = new Date(charges.data[0].created * 1000);
                billingDay = chargeDate.getUTCDate();
                if (billingDay > 28) billingDay = 28; // cap at 28 to avoid month-end issues
              }
            } catch {
              // If charge lookup fails, fall back to 1st
            }
          }

          // Determine frequency and matching price
          const unitFreq = ((unit as unknown as { payment_frequency?: string }).payment_frequency as PaymentFrequency) || 'monthly';
          const targetPriceId = stripePrices[unitFreq] || stripePrices.monthly;
          const freqConfig = FREQUENCY_CONFIG[unitFreq];

          // Compute next occurrence of billing day in the future
          // For monthly: next month. For quarterly: next 3 months. For annual: next year.
          const now = new Date();
          let anchorDate: Date;
          const currentDay = now.getUTCDate();

          if (unitFreq === 'annual') {
            // For annual, anchor to the billing day in the next occurrence
            if (currentDay < billingDay && now.getUTCMonth() === 0) {
              // January and billing day hasn't passed
              anchorDate = new Date(Date.UTC(now.getUTCFullYear(), 0, billingDay, 0, 0, 0));
            } else {
              // Next year
              anchorDate = new Date(Date.UTC(now.getUTCFullYear() + 1, 0, billingDay, 0, 0, 0));
            }
          } else {
            // For monthly/quarterly/semi_annual: anchor to next billing day
            if (currentDay < billingDay) {
              anchorDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), billingDay, 0, 0, 0));
            } else {
              anchorDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + freqConfig.interval_count, billingDay, 0, 0, 0));
            }
          }

          // Ensure anchor is in the future
          if (anchorDate.getTime() <= now.getTime()) {
            if (unitFreq === 'annual') {
              anchorDate = new Date(Date.UTC(now.getUTCFullYear() + 1, 0, billingDay, 0, 0, 0));
            } else {
              anchorDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + freqConfig.interval_count, billingDay, 0, 0, 0));
            }
          }
          const billingCycleAnchor = Math.floor(anchorDate.getTime() / 1000);

          const subscription = await stripe.subscriptions.create({
            customer: owner.stripe_customer_id,
            items: [{ price: targetPriceId }],
            billing_cycle_anchor: billingCycleAnchor,
            proration_behavior: 'none',
            metadata: {
              unit_id: unit.id,
              community_id: communityId,
              payment_frequency: unitFreq,
            },
          });

          // Update unit with subscription info and billing day
          const { error: updateError } = await supabase
            .from('units')
            .update({
              stripe_subscription_id: subscription.id,
              stripe_subscription_status: subscription.status,
              preferred_billing_day: billingDay,
            })
            .eq('id', unit.id);

          if (updateError) {
            errors.push(`Unit ${unit.unit_number}: saved to Stripe but failed to update DB: ${updateError.message}`);
          } else {
            created++;
          }
        } catch (stripeErr) {
          const msg = stripeErr instanceof Error ? stripeErr.message : 'Unknown Stripe error';
          errors.push(`Unit ${unit.unit_number}: ${msg}`);
        }
      });

      await Promise.all(batchPromises);

      // Small delay between batches to respect rate limits
      if (i + BATCH_SIZE < (units || []).length) {
        await delay(BATCH_DELAY_MS);
      }
    }

    const response: CreateSubscriptionsResponse = { created, skipped, errors };
    return NextResponse.json(response);
  } catch (err) {
    console.error('Stripe create-subscriptions error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
