'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { Textarea } from '@/components/shared/ui/textarea';
import { StickyNote, Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { MemberNote } from '@/lib/types/database';

interface MemberNotesProps {
  memberId: string;
  noteCount: number;
  onCountChange: (memberId: string, delta: number) => void;
}

export function MemberNotes({ memberId, noteCount, onCountChange }: MemberNotesProps) {
  const { community, member: currentMember } = useCommunity();
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState<(MemberNote & { author?: { first_name: string; last_name: string } })[]>([]);
  const [loading, setLoading] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!expanded) return;

    setLoading(true);
    const supabase = createClient();
    supabase
      .from('member_notes')
      .select('*, author:members!member_notes_created_by_fkey(first_name, last_name)')
      .eq('member_id', memberId)
      .eq('community_id', community.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setNotes((data ?? []) as typeof notes);
        setLoading(false);
      });
  }, [expanded, memberId, community.id]);

  async function handleAdd() {
    if (!newNote.trim() || !currentMember) return;
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('member_notes')
      .insert({
        member_id: memberId,
        community_id: community.id,
        note: newNote.trim(),
        created_by: currentMember.id,
      })
      .select('*, author:members!member_notes_created_by_fkey(first_name, last_name)')
      .single();

    setSaving(false);
    if (error) {
      toast.error('Failed to add note.');
      return;
    }
    setNotes((prev) => [data as typeof notes[number], ...prev]);
    setNewNote('');
    onCountChange(memberId, 1);
    toast.success('Note added.');
  }

  async function handleDelete(noteId: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from('member_notes')
      .delete()
      .eq('id', noteId);

    if (error) {
      toast.error('Failed to delete note.');
      return;
    }
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    onCountChange(memberId, -1);
  }

  return (
    <div className="mt-2 pt-2 border-t border-stroke-light dark:border-stroke-dark">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-meta text-text-secondary-light dark:text-text-secondary-dark hover:text-secondary-500 dark:hover:text-secondary-400 transition-colors w-full"
      >
        <StickyNote className="h-3 w-3" />
        <span>
          {noteCount === 0 ? 'Add note' : `${noteCount} note${noteCount !== 1 ? 's' : ''}`}
        </span>
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin text-text-muted-light dark:text-text-muted-dark" />
            </div>
          ) : (
            <>
              {notes.map((n) => (
                <div
                  key={n.id}
                  className="group flex items-start gap-2 p-2 rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-meta text-text-primary-light dark:text-text-primary-dark whitespace-pre-wrap break-words">
                      {n.note}
                    </p>
                    <p className="text-[10px] text-text-muted-light dark:text-text-muted-dark mt-0.5">
                      {n.author ? `${n.author.first_name} ${n.author.last_name}` : 'Unknown'} &middot;{' '}
                      {format(new Date(n.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(n.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-text-muted-light dark:text-text-muted-dark hover:text-red-500 transition-all shrink-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}

              <div className="flex gap-2">
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  rows={2}
                  className="resize-none text-meta"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAdd}
                  disabled={saving || !newNote.trim()}
                  className="shrink-0 self-end"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
