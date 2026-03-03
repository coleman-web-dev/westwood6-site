'use client';

import { useEffect, useState } from 'react';
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
import { Badge } from '@/components/shared/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { toast } from 'sonner';
import type { Vendor, VendorCategory, VendorStatus } from '@/lib/types/database';

const CATEGORY_LABELS: Record<VendorCategory, string> = {
  landscaping: 'Landscaping',
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  hvac: 'HVAC',
  painting: 'Painting',
  roofing: 'Roofing',
  cleaning: 'Cleaning',
  security: 'Security',
  general: 'General',
  other: 'Other',
};

interface VendorDetailDialogProps {
  vendor: Vendor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

export function VendorDetailDialog({
  vendor,
  open,
  onOpenChange,
  onUpdated,
}: VendorDetailDialogProps) {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState<VendorCategory>('general');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [insuranceExpiry, setInsuranceExpiry] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<VendorStatus>('active');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (vendor) {
      setName(vendor.name);
      setCompany(vendor.company ?? '');
      setPhone(vendor.phone ?? '');
      setEmail(vendor.email ?? '');
      setCategory(vendor.category);
      setLicenseNumber(vendor.license_number ?? '');
      setInsuranceExpiry(vendor.insurance_expiry ?? '');
      setNotes(vendor.notes ?? '');
      setStatus(vendor.status);
    }
  }, [vendor]);

  async function handleSave() {
    if (!vendor || !name.trim()) return;

    setSaving(true);
    const supabase = createClient();

    const { error } = await supabase
      .from('vendors')
      .update({
        name: name.trim(),
        company: company.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        category,
        license_number: licenseNumber.trim() || null,
        insurance_expiry: insuranceExpiry || null,
        notes: notes.trim() || null,
        status,
      })
      .eq('id', vendor.id);

    setSaving(false);

    if (error) {
      toast.error('Failed to update vendor.');
      return;
    }

    toast.success('Vendor updated.');
    onOpenChange(false);
    onUpdated();
  }

  if (!vendor) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Vendor</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Name *
              </Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Company
              </Label>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Phone
              </Label>
              <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Email
              </Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
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
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Status
              </Label>
              <Select value={status} onValueChange={(v) => setStatus(v as VendorStatus)}>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                License number
              </Label>
              <Input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} />
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
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
