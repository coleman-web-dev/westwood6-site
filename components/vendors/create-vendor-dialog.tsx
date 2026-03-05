'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
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
import type { VendorCategory } from '@/lib/types/database';

interface CreateVendorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityId: string;
  onCreated: () => void;
}

export function CreateVendorDialog({
  open,
  onOpenChange,
  communityId,
  onCreated,
}: CreateVendorDialogProps) {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState<VendorCategory>('general');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [insuranceExpiry, setInsuranceExpiry] = useState('');
  const [taxId, setTaxId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!name.trim()) {
      toast.error('Please enter a vendor name.');
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const { error } = await supabase.from('vendors').insert({
      community_id: communityId,
      name: name.trim(),
      company: company.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      category,
      license_number: licenseNumber.trim() || null,
      insurance_expiry: insuranceExpiry || null,
      tax_id: taxId.trim() || null,
      notes: notes.trim() || null,
    });

    setSaving(false);

    if (error) {
      toast.error('Failed to add vendor.');
      return;
    }

    toast.success('Vendor added.');
    setName('');
    setCompany('');
    setPhone('');
    setEmail('');
    setCategory('general');
    setLicenseNumber('');
    setInsuranceExpiry('');
    setTaxId('');
    setNotes('');
    onOpenChange(false);
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Vendor</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Name *
              </Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Contact name" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Company
              </Label>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company name" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Phone
              </Label>
              <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 555-5555" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Email
              </Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vendor@example.com" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Category
              </Label>
              <Select value={category} onValueChange={(v) => setCategory(v as VendorCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="landscaping">Landscaping</SelectItem>
                  <SelectItem value="plumbing">Plumbing</SelectItem>
                  <SelectItem value="electrical">Electrical</SelectItem>
                  <SelectItem value="hvac">HVAC</SelectItem>
                  <SelectItem value="painting">Painting</SelectItem>
                  <SelectItem value="roofing">Roofing</SelectItem>
                  <SelectItem value="cleaning">Cleaning</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                License number
              </Label>
              <Input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder="Optional" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Tax ID (EIN/SSN)
              </Label>
              <Input value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="XX-XXXXXXX" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Insurance expiry
              </Label>
              <Input type="date" value={insuranceExpiry} onChange={(e) => setInsuranceExpiry(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Notes
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? 'Adding...' : 'Add Vendor'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
