'use client';

import { useEffect, useState, useRef } from 'react';
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
import { Upload, FileText, CheckCircle, DollarSign } from 'lucide-react';
import { useCommunity } from '@/lib/providers/community-provider';
import { VendorDocumentsSection } from '@/components/vendors/vendor-documents-section';
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
  onRecordPayment?: (vendor: Vendor) => void;
}

export function VendorDetailDialog({
  vendor,
  open,
  onOpenChange,
  onUpdated,
  onRecordPayment,
}: VendorDetailDialogProps) {
  const { isBoard, member } = useCommunity();
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState<VendorCategory>('general');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [insuranceExpiry, setInsuranceExpiry] = useState('');
  const [notes, setNotes] = useState('');
  const [taxId, setTaxId] = useState('');
  const [showTaxId, setShowTaxId] = useState(false);
  const [w9OnFile, setW9OnFile] = useState(false);
  const [w9Path, setW9Path] = useState('');
  const [uploadingW9, setUploadingW9] = useState(false);
  const w9InputRef = useRef<HTMLInputElement>(null);
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
      setTaxId(vendor.tax_id ?? '');
      setShowTaxId(false);
      setW9OnFile(vendor.w9_on_file);
      setW9Path(vendor.w9_document_path ?? '');
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
        tax_id: taxId.trim() || null,
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

  function maskTaxId(id: string) {
    if (!id || id.length < 4) return id;
    return '***-**-' + id.replace(/\D/g, '').slice(-4);
  }

  async function handleW9Upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !vendor) return;
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file.');
      return;
    }
    setUploadingW9(true);
    const supabase = createClient();
    const path = `${vendor.community_id}/w9/${vendor.id}_${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('hoa-documents')
      .upload(path, file, { upsert: true });
    if (uploadError) {
      toast.error('Failed to upload W-9.');
      setUploadingW9(false);
      return;
    }
    const { error: updateError } = await supabase
      .from('vendors')
      .update({ w9_on_file: true, w9_document_path: path })
      .eq('id', vendor.id);
    if (updateError) {
      toast.error('Failed to update vendor record.');
      setUploadingW9(false);
      return;
    }
    setW9OnFile(true);
    setW9Path(path);
    toast.success('W-9 uploaded.');
    setUploadingW9(false);
    onUpdated();
  }

  async function handleW9Download() {
    if (!w9Path) return;
    const supabase = createClient();
    const { data } = await supabase.storage.from('hoa-documents').createSignedUrl(w9Path, 60);
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    } else {
      toast.error('Failed to generate download link.');
    }
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

          {/* Tax ID */}
          <div className="space-y-1.5">
            <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Tax ID (EIN/SSN)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                value={showTaxId ? taxId : (taxId ? maskTaxId(taxId) : '')}
                onChange={(e) => { setShowTaxId(true); setTaxId(e.target.value); }}
                onFocus={() => setShowTaxId(true)}
                placeholder="XX-XXXXXXX"
              />
              {taxId && !showTaxId && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowTaxId(true)}>
                  Reveal
                </Button>
              )}
            </div>
          </div>

          {/* W-9 Section */}
          <div className="space-y-1.5">
            <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              W-9 Document
            </Label>
            <div className="flex items-center gap-3">
              {w9OnFile ? (
                <Badge variant="outline" className="text-meta text-green-600 dark:text-green-400 gap-1">
                  <CheckCircle className="h-3 w-3" />
                  W-9 on file
                </Badge>
              ) : (
                <Badge variant="outline" className="text-meta text-yellow-600 dark:text-yellow-400">
                  No W-9
                </Badge>
              )}
              {w9OnFile && (
                <Button type="button" variant="ghost" size="sm" onClick={handleW9Download}>
                  <FileText className="h-3.5 w-3.5 mr-1" />
                  View
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadingW9}
                onClick={() => w9InputRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5 mr-1" />
                {uploadingW9 ? 'Uploading...' : w9OnFile ? 'Replace' : 'Upload'}
              </Button>
              <input
                ref={w9InputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleW9Upload}
              />
            </div>
          </div>

          {/* Vendor Documents */}
          <VendorDocumentsSection
            vendorId={vendor.id}
            communityId={vendor.community_id}
            memberId={member?.id ?? ''}
            isBoard={isBoard}
          />

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
          {onRecordPayment && (
            <Button
              type="button"
              variant="outline"
              onClick={() => { onOpenChange(false); onRecordPayment(vendor); }}
              className="mr-auto"
            >
              <DollarSign className="h-4 w-4 mr-1" />
              Record Payment
            </Button>
          )}
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
