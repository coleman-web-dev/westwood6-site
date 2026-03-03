'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
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
import { Input } from '@/components/shared/ui/input';
import { Textarea } from '@/components/shared/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { Switch } from '@/components/shared/ui/switch';
import { toast } from 'sonner';
import { sendAnnouncementEmails } from '@/lib/actions/email-actions';
import type { Announcement, AnnouncementPriority } from '@/lib/types/database';

interface CreateAnnouncementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editingAnnouncement: Announcement | null;
}

export function CreateAnnouncementDialog({
  open,
  onOpenChange,
  onSuccess,
  editingAnnouncement,
}: CreateAnnouncementDialogProps) {
  const { community, member } = useCommunity();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<AnnouncementPriority>('normal');
  const [isPublic, setIsPublic] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isEditing = editingAnnouncement !== null;

  // Pre-fill form when editing
  useEffect(() => {
    if (editingAnnouncement) {
      setTitle(editingAnnouncement.title);
      setBody(editingAnnouncement.body);
      setPriority(editingAnnouncement.priority);
      setIsPublic(editingAnnouncement.is_public);
    } else {
      setTitle('');
      setBody('');
      setPriority('normal');
      setIsPublic(false);
    }
  }, [editingAnnouncement, open]);

  function resetForm() {
    setTitle('');
    setBody('');
    setPriority('normal');
    setIsPublic(false);
  }

  async function handleSubmit() {
    if (!title.trim() || !body.trim()) {
      toast.error('Title and body are both required.');
      return;
    }

    if (!member) return;

    setSubmitting(true);
    const supabase = createClient();

    if (isEditing) {
      const { error } = await supabase
        .from('announcements')
        .update({
          title: title.trim(),
          body: body.trim(),
          priority,
          is_public: isPublic,
        })
        .eq('id', editingAnnouncement.id);

      setSubmitting(false);

      if (error) {
        toast.error('Failed to update announcement. Please try again.');
        return;
      }

      toast.success('Announcement updated.');
    } else {
      const { error } = await supabase.from('announcements').insert({
        community_id: community.id,
        title: title.trim(),
        body: body.trim(),
        priority,
        is_public: isPublic,
        posted_by: member.id,
      });

      setSubmitting(false);

      if (error) {
        toast.error('Failed to create announcement. Please try again.');
        return;
      }

      toast.success('Announcement posted.');

      // Queue email notifications for all members (fire-and-forget)
      sendAnnouncementEmails(
        community.id,
        community.slug,
        title.trim(),
        body.trim(),
        priority,
      ).catch((err) => console.error('Failed to queue announcement emails:', err));
    }

    resetForm();
    onOpenChange(false);
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Announcement' : 'New Announcement'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the announcement details below.'
              : 'Create a new announcement for community members.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Title
            </label>
            <Input
              placeholder="Announcement title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Body
            </label>
            <Textarea
              placeholder="Write your announcement here..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="resize-none"
              rows={5}
            />
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Priority
            </label>
            <Select
              value={priority}
              onValueChange={(val) => setPriority(val as AnnouncementPriority)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="important">Important</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Public visibility */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Show on landing page
              </label>
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                Visible to anyone visiting your community page.
              </p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !title.trim() || !body.trim()}
          >
            {submitting
              ? isEditing
                ? 'Saving...'
                : 'Posting...'
              : isEditing
                ? 'Save Changes'
                : 'Post Announcement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
