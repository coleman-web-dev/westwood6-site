'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Badge } from '@/components/shared/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { toast } from 'sonner';
import { logAuditEvent } from '@/lib/audit';
import { Users } from 'lucide-react';
import type { RoleTemplate } from '@/lib/types/permissions';

interface BoardMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  system_role: string;
  board_title: string | null;
  role_template_id: string | null;
}

interface MemberRoleAssignmentProps {
  templates: RoleTemplate[];
  onAssigned: () => void;
}

export function MemberRoleAssignment({ templates, onAssigned }: MemberRoleAssignmentProps) {
  const { community, member } = useCommunity();
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('members')
      .select('id, first_name, last_name, email, system_role, board_title, role_template_id')
      .eq('community_id', community.id)
      .in('system_role', ['board', 'manager', 'super_admin'])
      .eq('is_approved', true)
      .order('system_role')
      .order('first_name');

    setBoardMembers((data as BoardMember[]) || []);
    setLoading(false);
  }, [community.id]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  async function handleAssign(memberId: string, templateId: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from('members')
      .update({ role_template_id: templateId || null })
      .eq('id', memberId);

    if (error) {
      toast.error('Failed to assign role.');
      return;
    }

    // Update local state
    setBoardMembers((prev) =>
      prev.map((m) =>
        m.id === memberId ? { ...m, role_template_id: templateId || null } : m,
      ),
    );

    const bm = boardMembers.find((m) => m.id === memberId);
    const template = templates.find((t) => t.id === templateId);

    logAuditEvent({
      communityId: community.id,
      actorId: member?.user_id,
      actorEmail: member?.email,
      action: 'role_template_assigned',
      targetType: 'member',
      targetId: memberId,
      metadata: {
        member_email: bm?.email,
        template_name: template?.name ?? 'none',
        previous_template_id: bm?.role_template_id,
      },
    });
    toast.success(
      templateId
        ? `Assigned "${template?.name || templateId}" role.`
        : 'Role assignment removed (defaults to read-only).',
    );
    onAssigned();
  }

  const ROLE_BADGES: Record<string, string> = {
    super_admin: 'Super Admin',
    manager: 'Manager',
    board: 'Board',
  };

  if (loading) {
    return (
      <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
        <div className="animate-pulse h-24 rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-text-muted-light dark:text-text-muted-dark" />
        <h3 className="text-section-title text-text-primary-light dark:text-text-primary-dark">
          Member Role Assignments
        </h3>
      </div>

      <p className="text-body text-text-secondary-light dark:text-text-secondary-dark">
        Assign role templates to board members. Super admins always have full access regardless of assignment. Members without a role template default to read-only.
      </p>

      {boardMembers.length === 0 ? (
        <p className="text-body text-text-muted-light dark:text-text-muted-dark">
          No board members found.
        </p>
      ) : (
        <div className="space-y-2">
          {boardMembers.map((bm) => {
            const isSuperAdmin = bm.system_role === 'super_admin';
            return (
              <div
                key={bm.id}
                className="flex items-center gap-3 py-2.5 px-3 rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-body font-medium text-text-primary-light dark:text-text-primary-dark truncate">
                      {bm.first_name} {bm.last_name}
                    </span>
                    <Badge variant="outline" className="text-meta shrink-0">
                      {ROLE_BADGES[bm.system_role] || bm.system_role}
                    </Badge>
                    {bm.board_title && (
                      <Badge variant="outline" className="text-meta text-secondary-400 shrink-0">
                        {bm.board_title}
                      </Badge>
                    )}
                  </div>
                  {bm.email && (
                    <p className="text-meta text-text-muted-light dark:text-text-muted-dark truncate">
                      {bm.email}
                    </p>
                  )}
                </div>

                <div className="w-48 shrink-0">
                  {isSuperAdmin ? (
                    <div className="text-meta text-text-muted-light dark:text-text-muted-dark px-3 py-1.5">
                      Full access (always)
                    </div>
                  ) : (
                    <Select
                      value={bm.role_template_id || ''}
                      onValueChange={(v) => handleAssign(bm.id, v)}
                    >
                      <SelectTrigger className="h-8 text-meta">
                        <SelectValue placeholder="No template (read-only)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No template (read-only)</SelectItem>
                        {templates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
