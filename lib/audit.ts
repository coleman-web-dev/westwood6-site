'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import type { AuditLogEntry } from '@/lib/types/audit';

/**
 * Log an audit event. Callable from server actions, API routes,
 * or client components (as a server action). Fire-and-forget.
 */
export async function logAuditEvent(entry: AuditLogEntry) {
  try {
    const admin = createAdminClient();
    await admin.from('audit_logs').insert({
      community_id: entry.communityId || null,
      actor_id: entry.actorId || null,
      actor_email: entry.actorEmail || null,
      action: entry.action,
      target_type: entry.targetType || null,
      target_id: entry.targetId || null,
      metadata: entry.metadata || {},
      ip_address: entry.ipAddress || null,
      user_agent: entry.userAgent || null,
    });
  } catch {
    // Audit logging should never break the calling operation
    console.error('[audit] Failed to log event:', entry.action);
  }
}
