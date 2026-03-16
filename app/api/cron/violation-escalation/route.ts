import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { queueViolationNotice } from '@/lib/email/queue';
import type { Community, NoticeType } from '@/lib/types/database';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const today = new Date().toISOString().split('T')[0];

  // Find open violations past their compliance deadline that haven't been auto-escalated
  const { data: violations } = await admin
    .from('violations')
    .select('id, community_id, unit_id, title, category, severity, description, compliance_deadline')
    .lt('compliance_deadline', today)
    .not('status', 'in', '("resolved","dismissed","escalated")')
    .is('auto_escalated_at', null);

  if (!violations || violations.length === 0) {
    return NextResponse.json({ escalated: 0 });
  }

  // Get community settings for auto-escalation
  const communityIds = [...new Set(violations.map((v) => v.community_id))];
  const { data: communities } = await admin
    .from('communities')
    .select('id, slug, name, tenant_permissions')
    .in('id', communityIds);

  const communityMap = new Map<string, Community>();
  for (const c of (communities || []) as Community[]) {
    communityMap.set(c.id, c);
  }

  let escalated = 0;

  for (const violation of violations) {
    const community = communityMap.get(violation.community_id);
    if (!community) continue;

    const settings = community.tenant_permissions?.violation_settings;
    if (!settings?.auto_escalation_enabled) continue;

    const noticeType: NoticeType = settings.escalation_notice_type || 'final_notice';

    // Update violation status to escalated
    await admin
      .from('violations')
      .update({
        status: 'escalated',
        auto_escalated_at: new Date().toISOString(),
      })
      .eq('id', violation.id);

    // Record the auto-escalation notice
    await admin.from('violation_notices').insert({
      violation_id: violation.id,
      notice_type: noticeType,
      sent_by: null, // system
      delivery_method: 'email',
      notes: 'Auto-escalated: compliance deadline passed',
    });

    // Queue email
    try {
      await queueViolationNotice(
        violation.community_id,
        community.slug,
        violation.unit_id,
        violation.title,
        violation.category,
        violation.severity,
        noticeType,
        violation.description ?? undefined,
      );
    } catch {
      // Email failure should not block escalation
      console.error('[violation-escalation] Failed to queue email for violation:', violation.id);
    }

    // Log audit event
    await admin.from('audit_logs').insert({
      community_id: violation.community_id,
      actor_id: null,
      actor_email: 'system',
      action: 'violation_auto_escalated',
      target_type: 'violation',
      target_id: violation.id,
      metadata: {
        notice_type: noticeType,
        compliance_deadline: violation.compliance_deadline,
      },
    });

    escalated++;
  }

  return NextResponse.json({ escalated });
}
