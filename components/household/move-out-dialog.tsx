'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/shared/ui/dialog';
import { Button } from '@/components/shared/ui/button';
import { toast } from 'sonner';
import { useCommunity } from '@/lib/providers/community-provider';
import { deprovisionMembers } from '@/lib/actions/deprovisioning-actions';
import type { Unit, Member } from '@/lib/types/database';

interface MoveOutDialogProps {
  unit: Unit;
  members: Member[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function MoveOutDialog({
  unit,
  members,
  open,
  onOpenChange,
  onSuccess,
}: MoveOutDialogProps) {
  const { member: currentMember } = useCommunity();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [emailHistory, setEmailHistory] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function toggleMember(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(members.map((m) => m.id)));
  }

  async function handleSubmit() {
    if (selectedIds.size === 0) {
      toast.error('Please select at least one member to remove.');
      return;
    }

    setSubmitting(true);

    const result = await deprovisionMembers(
      [...selectedIds],
      currentMember?.user_id || '',
      currentMember?.email || '',
    );

    setSubmitting(false);

    if (!result.success) {
      toast.error('Failed to remove members. Please try again.');
      return;
    }

    const count = selectedIds.size;
    toast.success(
      `${count} member${count === 1 ? '' : 's'} removed from Unit ${unit.unit_number}.${emailHistory ? ' Payment history email logged.' : ''}`
    );

    setSelectedIds(new Set());
    setEmailHistory(false);
    onOpenChange(false);
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move Out - Unit {unit.unit_number}</DialogTitle>
          <DialogDescription>
            Select members to remove from this unit. Their accounts will be unassigned but not deleted.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {members.length === 0 ? (
            <p className="text-body text-text-muted-light dark:text-text-muted-dark">
              No members in this unit.
            </p>
          ) : (
            <>
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  Select All
                </Button>
              </div>

              {members.map((m) => (
                <label
                  key={m.id}
                  className="flex items-center gap-3 py-2 px-3 rounded-inner-card hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(m.id)}
                    onChange={() => toggleMember(m.id)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-body text-text-primary-light dark:text-text-primary-dark">
                      {m.first_name} {m.last_name}
                    </p>
                    <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                      {m.member_role.charAt(0).toUpperCase() + m.member_role.slice(1)}
                      {m.email ? ` - ${m.email}` : ''}
                    </p>
                  </div>
                </label>
              ))}

              {/* Email history option */}
              <label className="flex items-center gap-3 py-2 px-3 rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailHistory}
                  onChange={(e) => setEmailHistory(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-body text-text-secondary-light dark:text-text-secondary-dark">
                  Email payment history to departing members
                </span>
              </label>
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            onClick={handleSubmit}
            disabled={submitting || selectedIds.size === 0}
            variant="destructive"
          >
            {submitting
              ? 'Processing...'
              : `Remove ${selectedIds.size} Member${selectedIds.size === 1 ? '' : 's'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
