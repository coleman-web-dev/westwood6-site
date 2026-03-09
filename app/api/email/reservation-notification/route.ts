import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { queueReservationBoardNotification } from '@/lib/email/queue';

interface ReservationNotificationBody {
  communityId: string;
  communitySlug: string;
  amenityName: string;
  memberName: string;
  unitNumber: string;
  startDatetime: string;
  endDatetime: string;
  purpose: string | null;
  guestCount: number | null;
  feeAmount: number;
  depositAmount: number;
  status: 'pending' | 'approved';
}

/**
 * POST /api/email/reservation-notification
 * Queue reservation notification emails for board members.
 * Called from the client after a reservation is created.
 */
export async function POST(req: NextRequest) {
  // Authenticate
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body: ReservationNotificationBody = await req.json();

    // Verify the user is a member of this community
    const { data: member } = await supabase
      .from('members')
      .select('id')
      .eq('user_id', user.id)
      .eq('community_id', body.communityId)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'Not a member of this community' }, { status: 403 });
    }

    await queueReservationBoardNotification(
      body.communityId,
      body.communitySlug,
      body.amenityName,
      body.memberName,
      body.unitNumber,
      body.startDatetime,
      body.endDatetime,
      body.purpose,
      body.guestCount,
      body.feeAmount,
      body.depositAmount,
      body.status,
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Reservation notification error:', err);
    return NextResponse.json({ error: 'Failed to queue notification' }, { status: 500 });
  }
}
