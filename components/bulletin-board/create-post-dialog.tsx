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
import { Switch } from '@/components/shared/ui/switch';
import { toast } from 'sonner';
import { logAuditEvent } from '@/lib/audit';
import type { BulletinPost } from '@/lib/types/database';

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editPost: BulletinPost | null;
}

export function CreatePostDialog({
  open,
  onOpenChange,
  onSuccess,
  editPost,
}: CreatePostDialogProps) {
  const { community, member, isBoard } = useCommunity();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isEditing = editPost !== null;

  useEffect(() => {
    if (editPost) {
      setTitle(editPost.title);
      setBody(editPost.body);
      setIsPinned(editPost.is_pinned);
    } else {
      setTitle('');
      setBody('');
      setIsPinned(false);
    }
  }, [editPost, open]);

  function resetForm() {
    setTitle('');
    setBody('');
    setIsPinned(false);
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
        .from('bulletin_posts')
        .update({
          title: title.trim(),
          body: body.trim(),
          is_pinned: isBoard ? isPinned : editPost.is_pinned,
        })
        .eq('id', editPost.id);

      setSubmitting(false);

      if (error) {
        toast.error('Failed to update post. Please try again.');
        return;
      }

      toast.success('Post updated.');
      logAuditEvent({
        communityId: community.id,
        actorId: member?.user_id,
        actorEmail: member?.email,
        action: 'bulletin_post_updated',
        targetType: 'bulletin_post',
        targetId: editPost.id,
        metadata: { title: title.trim() },
      });
    } else {
      const { error } = await supabase.from('bulletin_posts').insert({
        community_id: community.id,
        title: title.trim(),
        body: body.trim(),
        posted_by: member.id,
        is_pinned: isBoard ? isPinned : false,
      });

      setSubmitting(false);

      if (error) {
        toast.error('Failed to create post. Please try again.');
        return;
      }

      toast.success('Post published.');
      logAuditEvent({
        communityId: community.id,
        actorId: member?.user_id,
        actorEmail: member?.email,
        action: 'bulletin_post_created',
        targetType: 'bulletin_post',
        targetId: community.id,
        metadata: { title: title.trim() },
      });
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
            {isEditing ? 'Edit Post' : 'New Post'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the post details below.'
              : 'Share something with the community.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Title
            </label>
            <Input
              placeholder="Post title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Body
            </label>
            <Textarea
              placeholder="Write your post here..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="resize-none"
              rows={5}
            />
          </div>

          {isBoard && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body text-text-primary-light dark:text-text-primary-dark">
                  Pin this post
                </p>
                <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                  Pinned posts stay at the top of the bulletin board
                </p>
              </div>
              <Switch checked={isPinned} onCheckedChange={setIsPinned} />
            </div>
          )}
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
                : 'Post'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
