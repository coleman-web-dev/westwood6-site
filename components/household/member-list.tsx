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
import { logAuditEvent } from '@/lib/audit';
import { Eye, EyeOff, Trash2, UserPlus, StickyNote, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { MemberNotesDialog } from '@/components/household/member-notes-dialog';
import { EditMemberDialog } from '@/components/household/edit-member-dialog';
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
  const { isBoard, community, member: currentMember } = useCommunity();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [notesForMember, setNotesForMember] = useState<{ id: string; name: string } | null>(null);
  const [editMember, setEditMember] = useState<Member | null>(null);

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

    const removedMember = members.find((m) => m.id === memberId);
    toast.success('Member removed from household.');
    logAuditEvent({
      communityId: community.id,
      actorId: currentMember?.user_id,
      actorEmail: currentMember?.email,
      action: 'member_removed',
      targetType: 'member',
      targetId: memberId,
      metadata: { name: removedMember ? `${removedMember.first_name} ${removedMember.last_name}` : memberId, email: removedMember?.email },
    });
    setRemovingId(null);
    onMemberRemoved();
  }

  return (
    <div className="space-y-3">
      {/* Header: always visible so Add Member is always accessible */}
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

      {loading ? (
        <div className="space-y-2">
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
      ) : members.length === 0 ? (
        <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding text-center">
          <p className="text-body text-text-muted-light dark:text-text-muted-dark">
            No household members found.
          </p>
        </div>
      ) : (
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

                  <div className="flex items-center gap-3 flex-wrap text-meta text-text-muted-light dark:text-text-muted-dark">
                    <span className="flex items-center gap-1">
                      {m.show_in_directory ? (
                        <>
                          <Eye className="h-3 w-3" />
                          Visible in directory
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3 w-3" />
                          Hidden from directory
                        </>
                      )}
                    </span>
                    <span>Joined {format(new Date(m.created_at), 'MMM d, yyyy')}</span>
                    {m.use_unit_address === false && (
                      <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
                        Alt. address
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {isBoard && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setNotesForMember({ id: m.id, name: `${m.first_name} ${m.last_name}` })}
                      title="Member notes"
                    >
                      <StickyNote className="h-4 w-4" />
                      <span className="sr-only">Notes for {m.first_name}</span>
                    </Button>
                  )}
                  {(isBoard || isSelf) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditMember(m)}
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit {m.first_name}</span>
                    </Button>
                  )}
                  {canRemove && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
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
            </div>
          );
        })}
      </div>
      )}

      {/* Member notes dialog (board-only) */}
      {notesForMember && (
        <MemberNotesDialog
          open={!!notesForMember}
          onOpenChange={(open) => { if (!open) setNotesForMember(null); }}
          memberId={notesForMember.id}
          memberName={notesForMember.name}
        />
      )}

      {/* Edit member dialog */}
      {editMember && (
        <EditMemberDialog
          open={!!editMember}
          onOpenChange={(open) => { if (!open) setEditMember(null); }}
          member={editMember}
          onSaved={onMemberRemoved}
        />
      )}
    </div>
  );
}
