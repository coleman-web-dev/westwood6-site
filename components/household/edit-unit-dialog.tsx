'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { toast } from 'sonner';
import type { Unit, UnitStatus } from '@/lib/types/database';

interface EditUnitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unit: Unit;
  onSaved: () => void;
}

export function EditUnitDialog({
  open,
  onOpenChange,
  unit,
  onSaved,
}: EditUnitDialogProps) {
  const [unitNumber, setUnitNumber] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<UnitStatus>('active');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setUnitNumber(unit.unit_number);
      setAddress(unit.address ?? '');
      setStatus(unit.status);
    }
  }, [open, unit]);

  async function handleSave() {
    if (!unitNumber.trim()) {
      toast.error('Unit number is required.');
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const { error } = await supabase
      .from('units')
      .update({
        unit_number: unitNumber.trim(),
        address: address.trim() || null,
        status,
      })
      .eq('id', unit.id);

    setSaving(false);

    if (error) {
      if (error.code === '23505') {
        toast.error('A unit with that number already exists.');
      } else {
        toast.error('Failed to update unit.');
      }
      return;
    }

    toast.success('Unit updated.');
    onSaved();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Unit</DialogTitle>
          <DialogDescription>
            Update details for Unit {unit.unit_number}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-unit-number" className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Unit number
            </Label>
            <Input
              id="edit-unit-number"
              value={unitNumber}
              onChange={(e) => setUnitNumber(e.target.value)}
              placeholder="e.g. 101, A-3, 350-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-unit-address" className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Address
            </Label>
            <Input
              id="edit-unit-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street address"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Status
            </Label>
            <Select value={status} onValueChange={(v) => setStatus(v as UnitStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
