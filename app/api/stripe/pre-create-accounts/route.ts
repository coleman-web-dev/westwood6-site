import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type { PreCreateAccountsResponse } from '@/lib/types/stripe';

export const runtime = 'nodejs';

const BATCH_SIZE = 20;
const BATCH_DELAY_MS = 200;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetches all auth users from Supabase, paginating through the full list.
 * Returns a map of lowercase email -> user id.
 */
async function fetchAllAuthUsers(
  supabase: ReturnType<typeof createAdminClient>
): Promise<Map<string, string>> {
  const emailToUserId = new Map<string, string>();
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error || !data?.users?.length) break;

    for (const user of data.users) {
      if (user.email) {
        emailToUserId.set(user.email.toLowerCase(), user.id);
      }
    }

    // If we got fewer than perPage results, we've reached the last page
    if (data.users.length < perPage) break;
    page++;
  }

  return emailToUserId;
}

/**
 * POST /api/stripe/pre-create-accounts
 * Pre-creates Supabase Auth accounts for approved members who have an email
 * but no user_id. Links existing auth users to their member records.
 * Does NOT send any emails. Password reset emails are handled separately.
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

    // 1. Fetch all approved members with email but no user_id
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('id, email, first_name, last_name')
      .eq('community_id', communityId)
      .eq('is_approved', true)
      .is('user_id', null)
      .not('email', 'is', null);

    if (membersError) {
      return NextResponse.json(
        { error: `Failed to fetch members: ${membersError.message}` },
        { status: 500 }
      );
    }

    if (!members || members.length === 0) {
      return NextResponse.json({
        created: 0,
        alreadyExists: 0,
        errors: [],
      } satisfies PreCreateAccountsResponse);
    }

    // 2. Pre-fetch all existing auth users so we can detect duplicates
    //    without relying on error messages from createUser
    const existingAuthUsers = await fetchAllAuthUsers(supabase);

    // 3. Process members in batches
    let created = 0;
    let alreadyExists = 0;
    const errors: string[] = [];

    for (let i = 0; i < members.length; i += BATCH_SIZE) {
      const batch = members.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(async (member) => {
        if (!member.email) return;

        const normalizedEmail = member.email.toLowerCase();

        try {
          // Check if an auth user already exists with this email
          const existingUserId = existingAuthUsers.get(normalizedEmail);

          if (existingUserId) {
            // User already exists in auth. Link them to the member record.
            const { error: linkError } = await supabase
              .from('members')
              .update({ user_id: existingUserId })
              .eq('id', member.id);

            if (linkError) {
              errors.push(`${member.email}: exists in auth but failed to link: ${linkError.message}`);
            } else {
              alreadyExists++;
            }
            return;
          }

          // Create the auth user
          const { data: createData, error: createError } = await supabase.auth.admin.createUser({
            email: member.email,
            email_confirm: true,
          });

          if (createError) {
            // Handle race condition where user was created between our check and now
            const errorMsg = createError.message?.toLowerCase() || '';
            const isDuplicate =
              errorMsg.includes('already') ||
              errorMsg.includes('exists') ||
              errorMsg.includes('duplicate');

            if (isDuplicate) {
              alreadyExists++;
            } else {
              errors.push(`${member.email}: ${createError.message}`);
            }
            return;
          }

          // User created. The DB trigger link_auth_user_to_member() should
          // auto-set user_id, but also set it explicitly to be safe.
          if (createData?.user?.id) {
            await supabase
              .from('members')
              .update({ user_id: createData.user.id })
              .eq('id', member.id);

            // Add to our local map in case of duplicate emails across members
            existingAuthUsers.set(normalizedEmail, createData.user.id);
          }

          created++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          errors.push(`${member.email}: ${msg}`);
        }
      });

      await Promise.all(batchPromises);

      // Delay between batches to avoid rate limits
      if (i + BATCH_SIZE < members.length) {
        await delay(BATCH_DELAY_MS);
      }
    }

    const response: PreCreateAccountsResponse = { created, alreadyExists, errors };
    return NextResponse.json(response);
  } catch (err) {
    console.error('Pre-create accounts error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
