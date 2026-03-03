import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type { CustomerPortalResponse } from '@/lib/types/stripe';

export const runtime = 'nodejs';

/**
 * POST /api/stripe/customer-portal
 * Creates a Stripe Customer Portal session for the authenticated user.
 * Any authenticated member with a linked Stripe customer can access this.
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

    // Look up the member record to get stripe_customer_id
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .eq('community_id', communityId)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: 'Member not found for this community' },
        { status: 404 }
      );
    }

    if (!member.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No Stripe customer linked to your account. Please contact your board for assistance.' },
        { status: 400 }
      );
    }

    // Look up the community slug for the return URL
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .select('slug')
      .eq('id', communityId)
      .single();

    if (communityError || !community) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      );
    }

    const stripe = getStripeClient();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://duesiq.com';

    // Create the Stripe Customer Portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: member.stripe_customer_id,
      return_url: `${baseUrl}/${community.slug}/payments`,
    });

    const response: CustomerPortalResponse = { url: session.url };
    return NextResponse.json(response);
  } catch (err) {
    console.error('Stripe customer-portal error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
