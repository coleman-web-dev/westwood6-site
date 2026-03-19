'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { Button } from '@/components/shared/ui/button';
import { Textarea } from '@/components/shared/ui/textarea';
import { StickyNote, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import type { Member } from '@/lib/types/database';

interface HouseholdNotesCardProps {
  unitId: string;
  communityId: string;
  /** Members in this unit (used for the "Add note for" dropdown) */
  members: Member[];
}

interface NoteRow {
  id: string;
  member_id: string;
  note: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  author: { first_name: string; last_name: string } | null;
  member: { first_name: string; last_name: string } | null;
}

export function HouseholdNotesCard({ unitId, communityId, members }: HouseholdNotesCardProps) {
  const { member: currentMember } = useCommunity();
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Add note form
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const memberIds = members.map((m) => m.id);

  const fetchNotes = useCallback(async () => {
    if (memberIds.length === 0) {
      setNotes([]);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data } = await supabase
      .from('member_notes')
      .select(
        'id, member_id, note, created_by, created_at, updated_at, author:members!member_notes_created_by_fkey(first_name, last_name), member:members!member_notes_member_id_fkey(first_name, last_name)',
      )
      .in('member_id', memberIds)
      .eq('community_id', communityId)
      .order('created_at', { ascending: false });

    setNotes((data as NoteRow[]) ?? []);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId, communityId, memberIds.join(',')]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  async function handleAdd() {
    if (!newNote.trim() || !selectedMemberId || !currentMember) return;
    setSaving(true);

    const supabase = createClient();
    const { error } = await supabase.from('member_notes').insert({
      member_id: selectedMemberId,
      community_id: communityId,
      note: newNote.trim(),
      created_by: currentMember.id,
    });

    setSaving(false);
    if (error) {
      toast.error('Failed to add note.');
      return;
    }

    setNewNote('');
    setShowAddForm(false);
    setSelectedMemberId('');
    toast.success('Note added.');
    fetchNotes();
  }

  async function handleUpdate(noteId: string) {
    if (!editText.trim()) return;
    setSaving(true);

    const supabase = createClient();
    const { error } = await supabase
      .from('member_notes')
      .update({ note: editText.trim(), updated_at: new Date().toISOString() })
      .eq('id', noteId);

    setSaving(false);
    if (error) {
      toast.error('Failed to update note.');
      return;
    }

    setEditingId(null);
    setEditText('');
    toast.success('Note updated.');
    fetchNotes();
  }

  async function handleDelete(noteId: string) {
    setDeletingId(noteId);
    const supabase = createClient();
    const { error } = await supabase.from('member_notes').delete().eq('id', noteId);

    setDeletingId(null);
    if (error) {
      toast.error('Failed to delete note.');
      return;
    }

    toast.success('Note deleted.');
    fetchNotes();
  }

  return (
    <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StickyNote className="h-5 w-5 text-secondary-500" />
          <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark">
            Member Notes
          </h2>
          {notes.length > 0 && (
            <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
              ({notes.length})
            </span>
          )}
        </div>
        {!showAddForm && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowAddForm(true);
              if (members.length === 1) setSelectedMemberId(members[0].id);
            }}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Note
          </Button>
        )}
      </div>

      {/* Add note form */}
      {showAddForm && (
        <div className="rounded-inner-card border border-stroke-light dark:border-stroke-dark bg-surface-light-2 dark:bg-surface-dark-2 p-3 space-y-2">
          {members.length > 1 && (
            <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Select member..." />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.first_name} {m.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a private note..."
            rows={2}
            className="resize-none"
          />
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowAddForm(false);
                setNewNote('');
                setSelectedMemberId('');
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={saving || !newNote.trim() || !selectedMemberId}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
              Add Note
            </Button>
          </div>
        </div>
      )}

      {/* Notes list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="animate-pulse h-14 rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2"
            />
          ))}
        </div>
      ) : notes.length === 0 && !showAddForm ? (
        <p className="text-body text-text-muted-light dark:text-text-muted-dark py-2">
          No notes yet. Click "Add Note" to get started.
        </p>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => {
            const isEditing = editingId === note.id;
            const memberName = note.member
              ? `${note.member.first_name} ${note.member.last_name}`
              : 'Unknown';
            const authorName = note.author
              ? `${note.author.first_name} ${note.author.last_name}`
              : 'Unknown';
            const timeAgo = formatDistanceToNow(new Date(note.created_at), {
              addSuffix: true,
            });
            const wasEdited = note.updated_at !== note.created_at;

            return (
              <div
                key={note.id}
                className="rounded-inner-card border border-stroke-light dark:border-stroke-dark bg-surface-light-2 dark:bg-surface-dark-2 p-3"
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="min-h-[60px] resize-none"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingId(null);
                          setEditText('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleUpdate(note.id)}
                        disabled={saving || !editText.trim()}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-meta font-medium text-secondary-500 dark:text-secondary-400 mb-0.5">
                          {memberName}
                        </p>
                        <p className="text-body text-text-primary-light dark:text-text-primary-dark whitespace-pre-wrap break-words">
                          {note.note}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => {
                            setEditingId(note.id);
                            setEditText(note.note);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              disabled={deletingId === note.id}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Note</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this note? This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(note.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    <p className="text-meta text-text-muted-light dark:text-text-muted-dark mt-1">
                      {authorName} {timeAgo}
                      {wasEdited ? ' (edited)' : ''}
                    </p>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
