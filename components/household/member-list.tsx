'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { Skeleton } from '@/components/shared/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/shared/ui/alert-dialog';
import { toast } from 'sonner';
import { Eye, EyeOff, Trash2, UserPlus } from 'lucide-react';
import type { Member, MemberRole } from '@/lib/types/database';

const ROLE_BADGE_VARIANT: Record<MemberRole, 'secondary' | 'outline' | 'default'> = {
  owner: 'secondary',
  member: 'outline',
  tenant: 'default',
  minor: 'outline',
};

const ROLE_LABEL: Record<MemberRole, string> = {
  owner: 'Owner',
  member: 'Member',
  tenant: 'Tenant',
  minor: 'Minor',
};

interface MemberListProps {
  members: Member[];
  loading: boolean;
  canManage: boolean;
  currentMemberId: string;
  onAddClick: () => void;
  onMemberRemoved: () => void;
}

export function MemberList({
  members,
  loading,
  canManage,
  currentMemberId,
  onAddClick,
  onMemberRemoved,
}: MemberListProps) {
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleRemove(memberId: string) {
    setRemovingId(memberId);
    const supabase = createClient();

    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', memberId);

    if (error) {
      toast.error('Failed to remove member. Please try again.');
      setRemovingId(null);
      return;
    }

    toast.success('Member removed from household.');
    setRemovingId(null);
    onMemberRemoved();
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding"
          >
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding text-center">
        <p className="text-body text-text-muted-light dark:text-text-muted-dark">
          No household members found.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark">
          Members ({members.length})
        </h2>
        {canManage && (
          <Button variant="outline" size="sm" onClick={onAddClick}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {members.map((m) => {
          const isSelf = m.id === currentMemberId;
          const canRemove = canManage && !isSelf;

          return (
            <div
              key={m.id}
              className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding"
            >
              <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-body font-medium text-text-primary-light dark:text-text-primary-dark">
                      {m.first_name} {m.last_name}
                    </span>
                    <Badge variant={ROLE_BADGE_VARIANT[m.member_role]}>
                      {ROLE_LABEL[m.member_role]}
                    </Badge>
                    {m.board_title && (
                      <span className="text-meta text-text-secondary-light dark:text-text-secondary-dark">
                        {m.board_title}
                      </span>
                    )}
                    {isSelf && (
                      <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
                        (you)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 flex-wrap text-meta text-text-secondary-light dark:text-text-secondary-dark">
                    {m.email && <span>{m.email}</span>}
                    {m.phone && <span>{m.phone}</span>}
                  </div>

                  <div className="flex items-center gap-1 text-meta text-text-muted-light dark:text-text-muted-dark">
                    {m.show_in_directory ? (
                      <>
                        <Eye className="h-3 w-3" />
                        <span>Visible in directory</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-3 w-3" />
                        <span>Hidden from directory</span>
                      </>
                    )}
                  </div>
                </div>

                {canRemove && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive shrink-0"
                        disabled={removingId === m.id}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Remove {m.first_name}</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove Member</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to remove {m.first_name} {m.last_name} from your household?
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRemove(m.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {removingId === m.id ? 'Removing...' : 'Remove'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
