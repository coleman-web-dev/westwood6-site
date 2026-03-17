'use client';

import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Textarea } from '@/components/shared/ui/textarea';
import { toast } from 'sonner';
import { logAuditEvent } from '@/lib/audit';

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
  const { community, member, unit, isBoard, actualIsBoard } = useCommunity();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [units, setUnits] = useState<Array<{ id: string; unit_number: string }>>([]);

  // Show unit picker for board in admin view, or any board member without a unit
  const needsUnitPicker = isBoard || (actualIsBoard && !unit);

  // Fetch units when dialog opens and unit picker is needed
  useEffect(() => {
    if (open && needsUnitPicker) {
      const supabase = createClient();
      supabase
        .from('units')
        .select('id, unit_number')
        .eq('community_id', community.id)
        .order('unit_number')
        .then(({ data }) => {
          setUnits(data ?? []);
        });
    }
  }, [open, needsUnitPicker, community.id]);

  const effectiveUnitId = needsUnitPicker ? selectedUnitId : unit?.id ?? '';

  function resetForm() {
    setTitle('');
    setDescription('');
    setSelectedUnitId('');
  }

  async function handleSubmit() {
    if (!title.trim() || !description.trim()) {
      toast.error('Title and description are both required.');
      return;
    }

    if (!member || !effectiveUnitId) {
      toast.error(needsUnitPicker ? 'Please select a unit.' : 'No unit assigned.');
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    const { error } = await supabase.from('maintenance_requests').insert({
      community_id: community.id,
      unit_id: effectiveUnitId,
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
    logAuditEvent({
      communityId: community.id,
      actorId: member?.user_id,
      actorEmail: member?.email,
      action: 'maintenance_created',
      targetType: 'maintenance_request',
      targetId: effectiveUnitId,
      metadata: { title: title.trim() },
    });
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
          {/* Unit selector: board picks or board without unit, residents see their unit */}
          {needsUnitPicker ? (
            <div className="space-y-1.5">
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Unit *
              </Label>
              <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      Unit {u.unit_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : unit ? (
            <div className="space-y-1.5">
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Unit
              </Label>
              <p className="text-body text-text-primary-light dark:text-text-primary-dark">
                Unit {unit.unit_number}
              </p>
            </div>
          ) : null}

          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Title *
            </Label>
            <Input
              placeholder="Brief summary of the issue"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Description *
            </Label>
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
            disabled={submitting || !title.trim() || !description.trim() || !effectiveUnitId}
          >
            {submitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
