import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/stripe/connect/callback
 * Return URL after Stripe onboarding. The user is redirected here after
 * completing (or exiting) the Stripe Express onboarding flow.
 * Checks account status and redirects to the community settings page.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const communityId = searchParams.get('community_id');

    if (!communityId) {
      return NextResponse.redirect(new URL('/', req.url));
    }

    const supabase = createAdminClient();
    const stripe = getStripeClient();

    // Get the stripe_accounts row for this community
    const { data: stripeAccount, error: accountError } = await supabase
      .from('stripe_accounts')
      .select('*')
      .eq('community_id', communityId)
      .single();

    if (accountError || !stripeAccount) {
      console.error('Stripe account not found for community:', communityId);
      return NextResponse.redirect(new URL('/', req.url));
    }

    // Retrieve the Stripe account to check current status
    const account = await stripe.accounts.retrieve(stripeAccount.stripe_account_id);

    // Update the stripe_accounts row with current status
    const { error: updateError } = await supabase
      .from('stripe_accounts')
      .update({
        onboarding_complete: account.details_submitted ?? false,
        charges_enabled: account.charges_enabled ?? false,
        payouts_enabled: account.payouts_enabled ?? false,
        updated_at: new Date().toISOString(),
      })
      .eq('community_id', communityId);

    if (updateError) {
      console.error('Failed to update stripe_accounts:', updateError);
    }

    // Look up the community slug for the redirect
    const { data: community } = await supabase
      .from('communities')
      .select('slug')
      .eq('id', communityId)
      .single();

    const slug = community?.slug || '';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://duesiq.com';
    const statusParam = account.details_submitted ? 'connected' : 'incomplete';

    return NextResponse.redirect(`${baseUrl}/${slug}/settings?stripe=${statusParam}`);
  } catch (err) {
    console.error('Stripe connect callback error:', err);
    return NextResponse.redirect(new URL('/', req.url));
  }
}
