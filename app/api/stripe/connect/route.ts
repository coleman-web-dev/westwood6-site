import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/stripe/connect
 * Creates a Stripe Express connected account and returns an onboarding link.
 * Accepts { communityId } in the request body.
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

    // Verify user is a board member of this community
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
      // Already fully onboarded in Connect mode, nothing to do
      if (existingAccount.mode === 'connect' && existingAccount.onboarding_complete) {
        return NextResponse.json(
          { error: 'Stripe account already connected' },
          { status: 400 }
        );
      }

      // Direct mode upgrading to Connect, or incomplete Connect onboarding
      if (existingAccount.mode === 'direct' || !existingAccount.stripe_account_id) {
        // Create a new Express connected account for the upgrade
        const account = await stripe.accounts.create({
          type: 'express',
          metadata: {
            community_id: communityId,
            community_name: community.name,
          },
        });

        stripeAccountId = account.id;

        // Update the existing row with the new Express account ID
        // Keep mode as 'direct' until onboarding completes (callback will switch it)
        const { error: updateError } = await supabase
          .from('stripe_accounts')
          .update({
            stripe_account_id: stripeAccountId,
            onboarding_complete: false,
            charges_enabled: false,
            payouts_enabled: false,
            updated_at: new Date().toISOString(),
          })
          .eq('community_id', communityId);

        if (updateError) {
          console.error('Failed to update stripe_accounts row:', updateError);
          return NextResponse.json(
            { error: 'Failed to save Stripe account' },
            { status: 500 }
          );
        }
      } else {
        // Incomplete Connect onboarding, resume with existing account
        stripeAccountId = existingAccount.stripe_account_id;
      }
    } else {
      // No existing row, create a brand new Express connected account
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
