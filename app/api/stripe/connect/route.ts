import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/stripe/connect
 * Creates a Stripe Express connected account and returns an onboarding link.
 * Accepts { communityId } in the request body.
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

    const supabase = createAdminClient();
    const stripe = getStripeClient();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://duesiq.com';

    // Verify the community exists
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .select('id, name')
      .eq('id', communityId)
      .single();

    if (communityError || !community) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      );
    }

    // Check if a stripe_accounts row already exists for this community
    const { data: existingAccount } = await supabase
      .from('stripe_accounts')
      .select('*')
      .eq('community_id', communityId)
      .single();

    let stripeAccountId: string;

    if (existingAccount) {
      if (existingAccount.onboarding_complete) {
        return NextResponse.json(
          { error: 'Stripe account already connected' },
          { status: 400 }
        );
      }

      // Onboarding not complete, create a new account link for the existing account
      stripeAccountId = existingAccount.stripe_account_id;
    } else {
      // Create a new Express connected account
      const account = await stripe.accounts.create({
        type: 'express',
        metadata: {
          community_id: communityId,
          community_name: community.name,
        },
      });

      stripeAccountId = account.id;

      // Insert into stripe_accounts table
      const { error: insertError } = await supabase
        .from('stripe_accounts')
        .insert({
          community_id: communityId,
          stripe_account_id: stripeAccountId,
          onboarding_complete: false,
          charges_enabled: false,
          payouts_enabled: false,
        });

      if (insertError) {
        console.error('Failed to insert stripe_accounts row:', insertError);
        return NextResponse.json(
          { error: 'Failed to save Stripe account' },
          { status: 500 }
        );
      }
    }

    // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${baseUrl}/api/stripe/connect/callback?community_id=${communityId}`,
      return_url: `${baseUrl}/api/stripe/connect/callback?community_id=${communityId}`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (err) {
    console.error('Stripe connect error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
