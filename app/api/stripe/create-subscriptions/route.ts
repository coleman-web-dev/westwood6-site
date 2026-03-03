import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type { CreateSubscriptionsResponse } from '@/lib/types/stripe';

export const runtime = 'nodejs';

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 100;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * POST /api/stripe/create-subscriptions
 * Creates Stripe subscriptions for all units with linked Stripe customers.
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

    // 3. Create Stripe Product and Price if they don't exist yet
    let productId = stripeAccount.stripe_product_id;
    let priceId = stripeAccount.stripe_default_price_id;

    if (!productId) {
      const product = await stripe.products.create({
        name: assessment.title,
        metadata: { community_id: communityId },
      });
      productId = product.id;

      const monthlyAmount = Math.round(assessment.annual_amount / 12);
      const price = await stripe.prices.create({
        product: productId,
        unit_amount: monthlyAmount,
        currency: 'usd',
        recurring: { interval: 'month' },
      });
      priceId = price.id;

      // Save product and price IDs to stripe_accounts
      await supabase
        .from('stripe_accounts')
        .update({
          stripe_product_id: productId,
          stripe_default_price_id: priceId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', stripeAccount.id);
    }

    if (!priceId) {
      return NextResponse.json(
        { error: 'Failed to resolve Stripe price' },
        { status: 500 }
      );
    }

    // 4. Fetch all active units with their owner members who have stripe_customer_id
    //    We need: unit.id, unit.stripe_subscription_id, owner member.stripe_customer_id
    const { data: units, error: unitsError } = await supabase
      .from('units')
      .select(`
        id,
        unit_number,
        stripe_subscription_id,
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
          const subscription = await stripe.subscriptions.create({
            customer: owner.stripe_customer_id,
            items: [{ price: priceId! }],
            metadata: {
              unit_id: unit.id,
              community_id: communityId,
            },
          });

          // Update unit with subscription info
          const { error: updateError } = await supabase
            .from('units')
            .update({
              stripe_subscription_id: subscription.id,
              stripe_subscription_status: subscription.status,
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
