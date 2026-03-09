import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    // Rate limit: 5 demo requests per IP per 15 minutes
    const ip = getClientIp(request);
    const limiter = rateLimit(`demo-request:${ip}`, 5);
    if (!limiter.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 },
      );
    }

    const body = await request.json();
    const { name, email, community_name, unit_count, phone, message } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from('demo_requests').insert({
      name,
      email,
      community_name: community_name || null,
      unit_count: unit_count ? parseInt(unit_count, 10) : null,
      phone: phone || null,
      message: message || null,
    });

    if (error) {
      console.error('Failed to save demo request:', error);
      return NextResponse.json(
        { error: 'Failed to submit request' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 },
    );
  }
}
