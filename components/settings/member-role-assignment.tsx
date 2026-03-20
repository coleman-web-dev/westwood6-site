'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { promoteToBoard } from '@/lib/actions/auth-actions';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/shared/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { toast } from 'sonner';
import { logAuditEvent } from '@/lib/audit';
import { Users, UserPlus, Search, ShieldCheck, ShieldMinus } from 'lucide-react';
import { TemplatePermissionTooltip } from '@/components/shared/template-permission-tooltip';
import { CustomPermissionsDialog } from '@/components/household/custom-permissions-dialog';
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

interface CommunityMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  system_role: string;
  unit_id: string | null;
  units: { unit_number: string } | null;
}

interface MemberRoleAssignmentProps {
  templates: RoleTemplate[];
  onAssigned: () => void;
}

export function MemberRoleAssignment({ templates, onAssigned }: MemberRoleAssignmentProps) {
  const { community, member } = useCommunity();
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Promote dialog state
  const [showPromote, setShowPromote] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [allMembers, setAllMembers] = useState<CommunityMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [promoteTitle, setPromoteTitle] = useState('');
  const [promoteTemplateId, setPromoteTemplateId] = useState('');
  const [promoting, setPromoting] = useState(false);
  const [showCustomPerms, setShowCustomPerms] = useState(false);

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

  async function fetchAllResidents() {
    setLoadingMembers(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('members')
      .select('id, first_name, last_name, email, system_role, unit_id, units(unit_number)')
      .eq('community_id', community.id)
      .eq('system_role', 'resident')
      .eq('is_approved', true)
      .order('first_name');

    setAllMembers((data as CommunityMember[]) || []);
    setLoadingMembers(false);
  }

  function handleOpenPromote() {
    setShowPromote(true);
    setSearchQuery('');
    setSelectedMemberId(null);
    setPromoteTitle('');
    setPromoteTemplateId('');
    fetchAllResidents();
  }

  async function handlePromoteMember() {
    if (!selectedMemberId) {
      toast.error('Select a member to promote.');
      return;
    }
    if (!promoteTitle.trim()) {
      toast.error('Enter a board title for this member.');
      return;
    }

    setPromoting(true);
    const result = await promoteToBoard(
      selectedMemberId,
      'board',
      promoteTitle.trim(),
      promoteTemplateId || null,
    );

    setPromoting(false);

    if (!result.success) {
      toast.error(result.error || 'Failed to promote member.');
      return;
    }

    const promoted = allMembers.find((m) => m.id === selectedMemberId);
    toast.success(`${promoted?.first_name} ${promoted?.last_name} is now a board member.`);
    setShowPromote(false);
    fetchMembers();
    onAssigned();
  }

  async function handleDemote(memberId: string) {
    const bm = boardMembers.find((m) => m.id === memberId);
    if (!bm) return;

    if (memberId === member?.id) {
      toast.error('You cannot demote yourself.');
      return;
    }

    const result = await promoteToBoard(memberId, 'resident', null, null);
    if (!result.success) {
      toast.error(result.error || 'Failed to demote member.');
      return;
    }

    toast.success(`${bm.first_name} ${bm.last_name} has been removed from the board.`);
    fetchMembers();
    onAssigned();
  }

  function handlePromoteTemplateChange(value: string) {
    if (value === '__custom__') {
      setShowCustomPerms(true);
    } else if (value === '__none__') {
      setPromoteTemplateId('');
    } else {
      setPromoteTemplateId(value);
    }
  }

  const filteredMembers = allMembers.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.first_name.toLowerCase().includes(q) ||
      m.last_name.toLowerCase().includes(q) ||
      (m.email && m.email.toLowerCase().includes(q)) ||
      (m.units?.unit_number && m.units.unit_number.toLowerCase().includes(q))
    );
  });

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
    <>
      <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-text-muted-light dark:text-text-muted-dark" />
            <h3 className="text-section-title text-text-primary-light dark:text-text-primary-dark">
              Board Members
            </h3>
          </div>
          <Button size="sm" variant="outline" onClick={handleOpenPromote}>
            <UserPlus className="h-3.5 w-3.5 mr-1" />
            Promote Member
          </Button>
        </div>

        <p className="text-body text-text-secondary-light dark:text-text-secondary-dark">
          Manage board members and assign permission templates. Super admins always have full access.
        </p>

        {boardMembers.length === 0 ? (
          <p className="text-body text-text-muted-light dark:text-text-muted-dark">
            No board members found. Use "Promote Member" to add someone to the board.
          </p>
        ) : (
          <div className="space-y-2">
            {boardMembers.map((bm) => {
              const isSuperAdmin = bm.system_role === 'super_admin';
              const isSelf = bm.id === member?.id;
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
                      {isSelf && (
                        <span className="text-meta text-text-muted-light dark:text-text-muted-dark">(you)</span>
                      )}
                    </div>
                    {bm.email && (
                      <p className="text-meta text-text-muted-light dark:text-text-muted-dark truncate">
                        {bm.email}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-48">
                      {isSuperAdmin ? (
                        <div className="text-meta text-text-muted-light dark:text-text-muted-dark px-3 py-1.5">
                          Full access (always)
                        </div>
                      ) : (
                        <Select
                          value={bm.role_template_id || '__none__'}
                          onValueChange={(v) => handleAssign(bm.id, v === '__none__' ? '' : v)}
                        >
                          <SelectTrigger className="h-8 text-meta">
                            <SelectValue placeholder="No template (read-only)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">No template (read-only)</SelectItem>
                            {templates.map((t) => (
                              <TemplatePermissionTooltip key={t.id} template={t} side="left">
                                <div>
                                  <SelectItem value={t.id}>
                                    {t.name}
                                  </SelectItem>
                                </div>
                              </TemplatePermissionTooltip>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    {!isSuperAdmin && !isSelf && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-warning-dot hover:text-warning-dot"
                        onClick={() => handleDemote(bm.id)}
                        title="Remove from board"
                      >
                        <ShieldMinus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Promote Member Dialog */}
      <Dialog open={showPromote} onOpenChange={setShowPromote}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Promote to Board</DialogTitle>
            <DialogDescription>
              Search for a community member and promote them to a board position.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted-light dark:text-text-muted-dark" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or unit..."
                className="pl-9"
              />
            </div>

            {/* Member list */}
            <div className="border border-stroke-light dark:border-stroke-dark rounded-inner-card max-h-48 overflow-y-auto">
              {loadingMembers ? (
                <div className="p-4 text-center text-body text-text-muted-light dark:text-text-muted-dark">
                  Loading members...
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="p-4 text-center text-body text-text-muted-light dark:text-text-muted-dark">
                  {searchQuery ? 'No residents match your search.' : 'No residents found.'}
                </div>
              ) : (
                filteredMembers.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMemberId(m.id)}
                    className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors ${
                      selectedMemberId === m.id
                        ? 'bg-primary-100 dark:bg-primary-800'
                        : 'hover:bg-surface-light-2 dark:hover:bg-surface-dark-2'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-body font-medium text-text-primary-light dark:text-text-primary-dark">
                          {m.first_name} {m.last_name}
                        </span>
                        {m.units?.unit_number && (
                          <Badge variant="outline" className="text-meta shrink-0">
                            Unit {m.units.unit_number}
                          </Badge>
                        )}
                      </div>
                      {m.email && (
                        <p className="text-meta text-text-muted-light dark:text-text-muted-dark truncate">
                          {m.email}
                        </p>
                      )}
                    </div>
                    {selectedMemberId === m.id && (
                      <ShieldCheck className="h-4 w-4 text-primary-700 dark:text-primary-300 shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Board title & template (show after selecting) */}
            {selectedMemberId && (
              <div className="space-y-4 border-t border-stroke-light dark:border-stroke-dark pt-4">
                <div className="space-y-1.5">
                  <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                    Board title *
                  </Label>
                  <Input
                    value={promoteTitle}
                    onChange={(e) => setPromoteTitle(e.target.value)}
                    placeholder="e.g. President, Treasurer, Secretary"
                    maxLength={50}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                    Permission template
                  </Label>
                  <Select
                    value={promoteTemplateId || '__none__'}
                    onValueChange={handlePromoteTemplateChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No template (read-only)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No template (read-only)</SelectItem>
                      {templates.map((t) => (
                        <TemplatePermissionTooltip key={t.id} template={t} side="left">
                          <div>
                            <SelectItem value={t.id}>{t.name}</SelectItem>
                          </div>
                        </TemplatePermissionTooltip>
                      ))}
                      <SelectItem value="__custom__">Custom permissions...</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                    Hover over a template to preview its permissions
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPromote(false)}>
              Cancel
            </Button>
            <Button onClick={handlePromoteMember} disabled={promoting || !selectedMemberId}>
              {promoting ? 'Promoting...' : 'Promote to Board'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom permissions dialog */}
      <CustomPermissionsDialog
        open={showCustomPerms}
        onOpenChange={setShowCustomPerms}
        onSave={(templateId) => setPromoteTemplateId(templateId)}
      />
    </>
  );
}
