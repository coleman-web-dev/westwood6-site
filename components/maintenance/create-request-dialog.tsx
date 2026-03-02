'use client';

import { useState } from 'react';
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
import { toast } from 'sonner';

interface CreateRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateRequestDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateRequestDialogProps) {
  const { community, member, unit } = useCommunity();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function resetForm() {
    setTitle('');
    setDescription('');
  }

  async function handleSubmit() {
    if (!title.trim() || !description.trim()) {
      toast.error('Title and description are both required.');
      return;
    }

    if (!member || !unit) return;

    setSubmitting(true);
    const supabase = createClient();

    const { error } = await supabase.from('maintenance_requests').insert({
      community_id: community.id,
      unit_id: unit.id,
      submitted_by: member.id,
      title: title.trim(),
      description: description.trim(),
      status: 'open',
    });

    setSubmitting(false);

    if (error) {
      toast.error('Failed to submit request. Please try again.');
      return;
    }

    toast.success('Maintenance request submitted.');
    resetForm();
    onOpenChange(false);
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Maintenance Request</DialogTitle>
          <DialogDescription>
            Describe the issue and we will get it taken care of.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Title
            </label>
            <Input
              placeholder="Brief summary of the issue"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Description
            </label>
            <Textarea
              placeholder="Provide details about the issue, including location and any relevant context..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
              rows={5}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !title.trim() || !description.trim()}
          >
            {submitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
