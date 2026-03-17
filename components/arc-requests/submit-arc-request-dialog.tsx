'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/shared/ui/dialog';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Textarea } from '@/components/shared/ui/textarea';
import { Label } from '@/components/shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { toast } from 'sonner';
import { logAuditEvent } from '@/lib/audit';
import type { ArcProjectType } from '@/lib/types/database';

interface SubmitArcRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function SubmitArcRequestDialog({
  open,
  onOpenChange,
  onCreated,
}: SubmitArcRequestDialogProps) {
  const { community, member, unit, isBoard, actualIsBoard } = useCommunity();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectType, setProjectType] = useState<ArcProjectType>('other');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [saving, setSaving] = useState(false);
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
    setProjectType('other');
    setEstimatedCost('');
    setSelectedUnitId('');
  }

  async function handleSubmit() {
    if (!title.trim()) {
      toast.error('Please enter a title.');
      return;
    }

    if (!member || !effectiveUnitId) {
      toast.error(needsUnitPicker ? 'Please select a unit.' : 'No unit assigned.');
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const costCents = estimatedCost ? Math.round(Number(estimatedCost) * 100) : null;

    const { error } = await supabase.from('arc_requests').insert({
      community_id: community.id,
      unit_id: effectiveUnitId,
      submitted_by: member.id,
      title: title.trim(),
      description: description.trim() || null,
      project_type: projectType,
      estimated_cost: costCents,
      status: 'submitted',
    });

    setSaving(false);

    if (error) {
      toast.error('Failed to submit request. Please try again.');
      return;
    }

    toast.success('ARC request submitted.');
    logAuditEvent({
      communityId: community.id,
      actorId: member?.user_id,
      actorEmail: member?.email,
      action: 'arc_request_submitted',
      targetType: 'arc_request',
      targetId: effectiveUnitId,
      metadata: { title: title.trim(), project_type: projectType },
    });
    resetForm();
    onOpenChange(false);
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Submit ARC Request</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Unit selector: board picks, residents see their unit */}
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

          <div className="space-y-1.5">
            <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Title *
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of the project"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Project type
              </Label>
              <Select value={projectType} onValueChange={(v) => setProjectType(v as ArcProjectType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fence">Fence</SelectItem>
                  <SelectItem value="landscaping">Landscaping</SelectItem>
                  <SelectItem value="paint">Paint</SelectItem>
                  <SelectItem value="addition">Addition</SelectItem>
                  <SelectItem value="deck">Deck/Patio</SelectItem>
                  <SelectItem value="roof">Roof</SelectItem>
                  <SelectItem value="solar">Solar</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Estimated cost ($)
              </Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Description
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of the proposed changes..."
              rows={4}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            onClick={handleSubmit}
            disabled={saving || !title.trim() || !effectiveUnitId}
          >
            {saving ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
