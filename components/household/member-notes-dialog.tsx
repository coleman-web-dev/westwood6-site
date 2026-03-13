'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog';
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
import { Button } from '@/components/shared/ui/button';
import { Textarea } from '@/components/shared/ui/textarea';
import { ScrollArea } from '@/components/shared/ui/scroll-area';
import { toast } from 'sonner';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface MemberNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  memberName: string;
}

interface NoteWithAuthor {
  id: string;
  note: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  author: { first_name: string; last_name: string } | null;
}

export function MemberNotesDialog({
  open,
  onOpenChange,
  memberId,
  memberName,
}: MemberNotesDialogProps) {
  const { community, member } = useCommunity();
  const [notes, setNotes] = useState<NoteWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('member_notes')
      .select('id, note, created_by, created_at, updated_at, author:members!member_notes_created_by_fkey(first_name, last_name)')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false });

    setNotes((data as NoteWithAuthor[]) ?? []);
    setLoading(false);
  }, [memberId]);

  useEffect(() => {
    if (open) {
      setLoading(true);
      fetchNotes();
    }
  }, [open, fetchNotes]);

  async function handleAddNote() {
    if (!newNote.trim() || !member) return;
    setSaving(true);

    const supabase = createClient();
    const { error } = await supabase.from('member_notes').insert({
      member_id: memberId,
      community_id: community.id,
      note: newNote.trim(),
      created_by: member.id,
    });

    setSaving(false);

    if (error) {
      toast.error('Failed to save note.');
      return;
    }

    setNewNote('');
    toast.success('Note added.');
    fetchNotes();
  }

  async function handleUpdateNote(noteId: string) {
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

  async function handleDeleteNote(noteId: string) {
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

  function startEditing(note: NoteWithAuthor) {
    setEditingId(note.id);
    setEditText(note.note);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface-light dark:bg-surface-dark border-stroke-light dark:border-stroke-dark sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-text-primary-light dark:text-text-primary-dark">
            Notes for {memberName}
          </DialogTitle>
        </DialogHeader>

        {/* Add note */}
        <div className="space-y-2">
          <Textarea
            placeholder="Add a private note..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="min-h-[80px] resize-none"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleAddNote}
              disabled={saving || !newNote.trim()}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
              Add Note
            </Button>
          </div>
        </div>

        {/* Notes list */}
        <ScrollArea className="max-h-[400px]">
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="animate-pulse h-16 rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2" />
              ))}
            </div>
          ) : notes.length === 0 ? (
            <p className="text-body text-text-muted-light dark:text-text-muted-dark text-center py-6">
              No notes yet.
            </p>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => {
                const isEditing = editingId === note.id;
                const authorName = note.author
                  ? `${note.author.first_name} ${note.author.last_name}`
                  : 'Unknown';
                const timeAgo = formatDistanceToNow(new Date(note.created_at), { addSuffix: true });
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
                            onClick={() => { setEditingId(null); setEditText(''); }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleUpdateNote(note.id)}
                            disabled={saving || !editText.trim()}
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-body text-text-primary-light dark:text-text-primary-dark whitespace-pre-wrap">
                          {note.note}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                            {authorName} {timeAgo}{wasEdited ? ' (edited)' : ''}
                          </p>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => startEditing(note)}
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
                                    onClick={() => handleDeleteNote(note.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
