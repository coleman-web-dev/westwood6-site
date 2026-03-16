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
import { Switch } from '@/components/shared/ui/switch';
import { toast } from 'sonner';
import type { Member } from '@/lib/types/database';

interface EditMailingAddressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: Member;
  onSaved: () => void;
}

export function EditMailingAddressDialog({
  open,
  onOpenChange,
  member,
  onSaved,
}: EditMailingAddressDialogProps) {
  const [useUnitAddress, setUseUnitAddress] = useState(true);
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setUseUnitAddress(member.use_unit_address ?? true);
      setLine1(member.mailing_address_line1 ?? '');
      setLine2(member.mailing_address_line2 ?? '');
      setCity(member.mailing_city ?? '');
      setState(member.mailing_state ?? '');
      setZip(member.mailing_zip ?? '');
    }
  }, [open, member]);

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();

    const { error } = await supabase
      .from('members')
      .update({
        use_unit_address: useUnitAddress,
        mailing_address_line1: useUnitAddress ? null : line1.trim() || null,
        mailing_address_line2: useUnitAddress ? null : line2.trim() || null,
        mailing_city: useUnitAddress ? null : city.trim() || null,
        mailing_state: useUnitAddress ? null : state.trim() || null,
        mailing_zip: useUnitAddress ? null : zip.trim() || null,
      })
      .eq('id', member.id);

    setSaving(false);

    if (error) {
      toast.error('Failed to update mailing address.');
      return;
    }

    toast.success('Mailing address updated.');
    onSaved();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mailing Address</DialogTitle>
          <DialogDescription>
            Update mailing address for {member.first_name} {member.last_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-body text-text-primary-light dark:text-text-primary-dark">
                Use unit address
              </p>
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                Mail goes to the property address
              </p>
            </div>
            <Switch
              checked={useUnitAddress}
              onCheckedChange={setUseUnitAddress}
            />
          </div>

          {!useUnitAddress && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-line1" className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                  Street address
                </Label>
                <Input
                  id="edit-line1"
                  value={line1}
                  onChange={(e) => setLine1(e.target.value)}
                  placeholder="Street address"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-line2" className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                  Address line 2
                </Label>
                <Input
                  id="edit-line2"
                  value={line2}
                  onChange={(e) => setLine2(e.target.value)}
                  placeholder="Apt, suite, unit (optional)"
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="edit-city" className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                    City
                  </Label>
                  <Input
                    id="edit-city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-state" className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                    State
                  </Label>
                  <Input
                    id="edit-state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="FL"
                    maxLength={2}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-zip" className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                    ZIP
                  </Label>
                  <Input
                    id="edit-zip"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    placeholder="12345"
                    maxLength={10}
                  />
                </div>
              </div>
            </div>
          )}
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
