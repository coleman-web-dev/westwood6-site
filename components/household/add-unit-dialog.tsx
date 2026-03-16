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
} from '@/components/shared/ui/dialog';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { toast } from 'sonner';

interface AddUnitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (unitId: string) => void;
}

export function AddUnitDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddUnitDialogProps) {
  const { community } = useCommunity();
  const [unitNumber, setUnitNumber] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  function reset() {
    setUnitNumber('');
    setAddress('');
  }

  async function handleSave() {
    if (!unitNumber.trim()) {
      toast.error('Unit number is required.');
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from('units')
      .insert({
        community_id: community.id,
        unit_number: unitNumber.trim(),
        address: address.trim() || null,
        status: 'active',
      })
      .select('id')
      .single();

    setSaving(false);

    if (error) {
      if (error.code === '23505') {
        toast.error('A unit with that number already exists.');
      } else {
        toast.error('Failed to create unit.');
      }
      return;
    }

    toast.success(`Unit ${unitNumber.trim()} created.`);
    reset();
    onOpenChange(false);
    onSuccess(data.id);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Unit</DialogTitle>
          <DialogDescription>
            Create a new unit in the community.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="add-unit-number" className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Unit number
            </Label>
            <Input
              id="add-unit-number"
              value={unitNumber}
              onChange={(e) => setUnitNumber(e.target.value)}
              placeholder="e.g. 101, A-3, 350-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-unit-address" className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Address (optional)
            </Label>
            <Input
              id="add-unit-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street address"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Creating...' : 'Create Unit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
