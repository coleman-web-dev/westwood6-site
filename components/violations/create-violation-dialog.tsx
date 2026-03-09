'use client';

import { useState } from 'react';
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
import type { Unit, ViolationCategory, ViolationSeverity } from '@/lib/types/database';

interface CreateViolationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  units: Unit[];
  communityId: string;
  onCreated: () => void;
}

export function CreateViolationDialog({
  open,
  onOpenChange,
  units,
  communityId,
  onCreated,
}: CreateViolationDialogProps) {
  const { member } = useCommunity();
  const [unitId, setUnitId] = useState('');
  const [category, setCategory] = useState<ViolationCategory>('other');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<ViolationSeverity>('warning');
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!title.trim() || !unitId) {
      toast.error('Please fill in all required fields.');
      return;
    }

    if (!member) {
      toast.error('You must be logged in to report a violation.');
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const { error } = await supabase.from('violations').insert({
      community_id: communityId,
      unit_id: unitId,
      reported_by: member.id,
      category,
      title: title.trim(),
      description: description.trim() || null,
      severity,
    });

    setSaving(false);

    if (error) {
      toast.error('Failed to create violation. Please try again.');
      return;
    }

    toast.success('Violation reported.');
    setTitle('');
    setDescription('');
    setUnitId('');
    setCategory('other');
    setSeverity('warning');
    onOpenChange(false);
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Report Violation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Unit *
            </Label>
            <Select value={unitId} onValueChange={setUnitId}>
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

          <div className="space-y-1.5">
            <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Title *
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of the violation"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Category
              </Label>
              <Select value={category} onValueChange={(v) => setCategory(v as ViolationCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="architectural">Architectural</SelectItem>
                  <SelectItem value="noise">Noise</SelectItem>
                  <SelectItem value="parking">Parking</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="pets">Pets</SelectItem>
                  <SelectItem value="trash">Trash</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Severity
              </Label>
              <Select value={severity} onValueChange={(v) => setSeverity(v as ViolationSeverity)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="minor">Minor</SelectItem>
                  <SelectItem value="major">Major</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Description
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of the violation..."
              rows={4}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? 'Creating...' : 'Report Violation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
