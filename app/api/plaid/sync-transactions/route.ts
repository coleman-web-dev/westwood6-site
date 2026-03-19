import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { syncBankTransactions } from '@/lib/utils/plaid-sync';

export const maxDuration = 300; // 5 minutes - sync + AI categorization can take a while

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { communityId, connectionId } = await request.json();
    if (!communityId || !connectionId) {
      return NextResponse.json(
        { error: 'communityId and connectionId are required' },
        { status: 400 },
      );
    }

    // Verify board member
    const { data: member } = await supabase
      .from('members')
      .select('system_role')
      .eq('user_id', user.id)
      .eq('community_id', communityId)
      .single();

    if (!member || !['board', 'manager', 'super_admin'].includes(member.system_role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const admin = createAdminClient();
    const result = await syncBankTransactions(admin, communityId, connectionId);

    if (result.error_code === 'ADDITIONAL_CONSENT_REQUIRED') {
      return NextResponse.json(
        {
          error: 'Additional consent required',
          error_code: 'ADDITIONAL_CONSENT_REQUIRED',
          message: 'This bank connection requires updated data consent. Please reconnect using the "Update Consent" button.',
        },
        { status: 403 },
      );
    }

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Error syncing transactions:', error);
    return NextResponse.json({ error: 'Failed to sync transactions' }, { status: 500 });
  }
}
