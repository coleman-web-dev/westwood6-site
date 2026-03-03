import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type Stripe from 'stripe';
import type { SyncCustomersResponse } from '@/lib/types/stripe';

export const runtime = 'nodejs';

/**
 * POST /api/stripe/sync-customers
 * Syncs Stripe customers to DuesIQ members by email match.
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

    // 1. Fetch ALL Stripe customers using auto-pagination
    const stripeCustomers: Stripe.Customer[] = [];
    for await (const customer of stripe.customers.list({ limit: 100 })) {
      if (!customer.deleted) {
        stripeCustomers.push(customer as Stripe.Customer);
      }
    }

    // 2. Fetch all members for the community
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('id, email, stripe_customer_id')
      .eq('community_id', communityId)
      .eq('is_approved', true);

    if (membersError) {
      return NextResponse.json(
        { error: 'Failed to fetch members' },
        { status: 500 }
      );
    }

    // 3. Build email -> member map (case-insensitive)
    const emailToMember = new Map<string, { id: string; stripe_customer_id: string | null }>();
    for (const member of members || []) {
      if (member.email) {
        emailToMember.set(member.email.toLowerCase(), {
          id: member.id,
          stripe_customer_id: member.stripe_customer_id,
        });
      }
    }

    // 4. Match Stripe customers to members
    let matched = 0;
    const unmatched: string[] = [];
    const errors: string[] = [];

    for (const customer of stripeCustomers) {
      if (!customer.email) continue;

      const normalizedEmail = customer.email.toLowerCase();
      const member = emailToMember.get(normalizedEmail);

      if (!member) {
        unmatched.push(customer.email);
        continue;
      }

      // Skip if already linked to this customer
      if (member.stripe_customer_id === customer.id) {
        matched++;
        continue;
      }

      // Update member with stripe_customer_id
      const { error: updateError } = await supabase
        .from('members')
        .update({ stripe_customer_id: customer.id })
        .eq('id', member.id);

      if (updateError) {
        errors.push(`Failed to update member for ${customer.email}: ${updateError.message}`);
      } else {
        matched++;
      }
    }

    const response: SyncCustomersResponse = { matched, unmatched, errors };
    return NextResponse.json(response);
  } catch (err) {
    console.error('Stripe sync-customers error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
