'use client';

import { useState, useEffect } from 'react';
import { useCommunity } from '@/lib/providers/community-provider';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/shared/ui/button';
import { Switch } from '@/components/shared/ui/switch';
import { Label } from '@/components/shared/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/shared/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { Plus, Trash2, Loader2, Mail, BellRing } from 'lucide-react';
import { toast } from 'sonner';
import type { Member } from '@/lib/types/database';

interface AccessEntry {
  id: string;
  member_id: string;
  can_read: boolean;
  can_reply: boolean;
  can_compose: boolean;
  notify_forward: boolean;
  created_at: string;
  members: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    system_role: string;
    board_title: string | null;
  };
}

interface InboxAccessManagerProps {
  emailAddressId: string;
  emailAddress: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InboxAccessManager({
  emailAddressId,
  emailAddress,
  open,
  onOpenChange,
}: InboxAccessManagerProps) {
  const { community } = useCommunity();
  const [accessList, setAccessList] = useState<AccessEntry[]>([]);
  const [boardMembers, setBoardMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [addMemberId, setAddMemberId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !community) return;

    async function load() {
      setLoading(true);

      const [accessRes, membersRes] = await Promise.all([
        fetch(
          `/api/email/inbox-access?emailAddressId=${emailAddressId}&communityId=${community!.id}`
        ),
        (async () => {
          const supabase = createClient();
          return supabase
            .from('members')
            .select('id, first_name, last_name, email, system_role, board_title')
            .eq('community_id', community!.id)
            .in('system_role', ['board', 'manager', 'super_admin'])
            .order('first_name');
        })(),
      ]);

      const accessData = await accessRes.json();
      setAccessList(accessData.access || []);
      setBoardMembers((membersRes.data as Member[]) || []);
      setLoading(false);
    }

    load();
  }, [open, community, emailAddressId]);

  // Members who don't yet have access
  const availableMembers = boardMembers.filter(
    (m) => !accessList.some((a) => a.member_id === m.id)
  );

  async function handleAdd() {
    if (!community || !addMemberId) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/email/inbox-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailAddressId,
          communityId: community.id,
          memberId: addMemberId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to grant access');
        return;
      }

      // Refresh the list
      const accessRes = await fetch(
        `/api/email/inbox-access?emailAddressId=${emailAddressId}&communityId=${community.id}`
      );
      const refreshed = await accessRes.json();
      setAccessList(refreshed.access || []);
      setAddMemberId('');
      toast.success('Access granted');
    } catch {
      toast.error('Failed to grant access');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(accessId: string) {
    if (!community) return;

    try {
      const res = await fetch('/api/email/inbox-access', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessId, communityId: community.id }),
      });

      if (!res.ok) {
        toast.error('Failed to revoke access');
        return;
      }

      setAccessList((prev) => prev.filter((a) => a.id !== accessId));
      toast.success('Access revoked');
    } catch {
      toast.error('Failed to revoke access');
    }
  }

  async function handleToggleForward(accessId: string, currentVal: boolean) {
    if (!community) return;

    try {
      const res = await fetch('/api/email/inbox-access', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessId,
          communityId: community.id,
          notifyForward: !currentVal,
        }),
      });

      if (!res.ok) {
        toast.error('Failed to update');
        return;
      }

      setAccessList((prev) =>
        prev.map((a) =>
          a.id === accessId ? { ...a, notify_forward: !currentVal } : a
        )
      );
    } catch {
      toast.error('Failed to update');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Inbox Access</DialogTitle>
          <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
            Manage who can read and send from {emailAddress}
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-text-muted-light dark:text-text-muted-dark" />
            </div>
          ) : (
            <>
              {/* Current access list */}
              {accessList.length > 0 ? (
                <div className="space-y-2">
                  {accessList.map((access) => (
                    <div
                      key={access.id}
                      className="flex items-center gap-3 rounded-inner-card border border-stroke-light dark:border-stroke-dark p-2.5"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-body text-text-primary-light dark:text-text-primary-dark">
                          {access.members.first_name} {access.members.last_name}
                        </span>
                        {access.members.board_title && (
                          <span className="text-meta text-text-muted-light dark:text-text-muted-dark ml-2">
                            {access.members.board_title}
                          </span>
                        )}
                        {access.members.email && (
                          <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                            {access.members.email}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div
                          className="flex items-center gap-1.5 cursor-pointer"
                          title="Forward emails to personal email"
                        >
                          <BellRing className="h-3.5 w-3.5 text-text-muted-light dark:text-text-muted-dark" />
                          <Switch
                            checked={access.notify_forward}
                            onCheckedChange={() =>
                              handleToggleForward(access.id, access.notify_forward)
                            }
                          />
                        </div>
                        <button
                          onClick={() => handleRemove(access.id)}
                          className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                          title="Revoke access"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-body text-text-muted-light dark:text-text-muted-dark text-center py-4">
                  No one has access to this inbox yet.
                </p>
              )}

              {/* Add member */}
              {availableMembers.length > 0 && (
                <div className="flex items-end gap-2 pt-2 border-t border-stroke-light dark:border-stroke-dark">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-label">Add member</Label>
                    <Select value={addMemberId} onValueChange={setAddMemberId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select member..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableMembers.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.first_name} {m.last_name}
                            {m.board_title ? ` (${m.board_title})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handleAdd}
                    disabled={submitting || !addMemberId}
                    size="sm"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
