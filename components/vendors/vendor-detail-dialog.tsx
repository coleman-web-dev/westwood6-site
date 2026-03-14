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
import { Upload, FileText, CheckCircle, DollarSign, Printer, ShieldCheck } from 'lucide-react';
import { useCommunity } from '@/lib/providers/community-provider';
import { VendorDocumentsSection, syncVendorDocToFolder } from '@/components/vendors/vendor-documents-section';
import type { Vendor, VendorCategoryRow, VendorDocument, VendorStatus } from '@/lib/types/database';
import type { Account } from '@/lib/types/accounting';

interface VendorDetailDialogProps {
  vendor: Vendor | null;
  categories: VendorCategoryRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
  onRecordPayment?: (vendor: Vendor) => void;
  onWriteCheck?: (vendor: Vendor) => void;
}

export function VendorDetailDialog({
  vendor,
  categories,
  open,
  onOpenChange,
  onUpdated,
  onRecordPayment,
  onWriteCheck,
}: VendorDetailDialogProps) {
  const { isBoard, member } = useCommunity();
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [insuranceExpiry, setInsuranceExpiry] = useState('');
  const [notes, setNotes] = useState('');
  const [taxId, setTaxId] = useState('');
  const [showTaxId, setShowTaxId] = useState(false);
  const [w9OnFile, setW9OnFile] = useState(false);
  const [w9Path, setW9Path] = useState('');
  const [uploadingW9, setUploadingW9] = useState(false);
  const w9InputRef = useRef<HTMLInputElement>(null);
  const [insuranceDoc, setInsuranceDoc] = useState<VendorDocument | null>(null);
  const [uploadingInsurance, setUploadingInsurance] = useState(false);
  const insuranceInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<VendorStatus>('active');
  const [defaultExpenseAccountId, setDefaultExpenseAccountId] = useState('_none');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [expenseAccounts, setExpenseAccounts] = useState<Account[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (vendor) {
      setName(vendor.name);
      setCompany(vendor.company ?? '');
      setPhone(vendor.phone ?? '');
      setEmail(vendor.email ?? '');
      setCategoryId(vendor.category_id);
      setLicenseNumber(vendor.license_number ?? '');
      setInsuranceExpiry(vendor.insurance_expiry ?? '');
      setNotes(vendor.notes ?? '');
      setTaxId(vendor.tax_id ?? '');
      setShowTaxId(false);
      setW9OnFile(vendor.w9_on_file);
      setW9Path(vendor.w9_document_path ?? '');
      setStatus(vendor.status);
      setDefaultExpenseAccountId(vendor.default_expense_account_id ?? '_none');
      setAddressLine1(vendor.address_line1 ?? '');
      setAddressLine2(vendor.address_line2 ?? '');
      setCity(vendor.city ?? '');
      setState(vendor.state ?? '');
      setZip(vendor.zip ?? '');

      // Fetch expense accounts and latest insurance doc
      const supabase = createClient();
      supabase
        .from('accounts')
        .select('*')
        .eq('community_id', vendor.community_id)
        .eq('account_type', 'expense')
        .eq('is_active', true)
        .order('code')
        .then(({ data }) => setExpenseAccounts((data as Account[]) || []));

      supabase
        .from('vendor_documents')
        .select('*')
        .eq('vendor_id', vendor.id)
        .eq('document_type', 'insurance_cert')
        .order('created_at', { ascending: false })
        .limit(1)
        .then(({ data }) => setInsuranceDoc((data?.[0] as VendorDocument) ?? null));
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
        category_id: categoryId,
        license_number: licenseNumber.trim() || null,
        insurance_expiry: insuranceExpiry || null,
        tax_id: taxId.trim() || null,
        notes: notes.trim() || null,
        status,
        default_expense_account_id: defaultExpenseAccountId === '_none' ? null : defaultExpenseAccountId || null,
        address_line1: addressLine1.trim() || null,
        address_line2: addressLine2.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        zip: zip.trim() || null,
      })
      .eq('id', vendor.id);

    setSaving(false);

    if (error) {
      toast.error('Failed to update vendor.');
      return;
    }

    // Sync folder name if vendor display name changed and has a linked subfolder
    const newDisplayName = company.trim() || name.trim();
    const oldDisplayName = vendor.company || vendor.name;
    if (vendor.document_folder_id && newDisplayName !== oldDisplayName) {
      supabase
        .from('document_folders')
        .update({ name: newDisplayName })
        .eq('id', vendor.document_folder_id)
        .then(() => {});
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

    // Sync W-9 to vendor documents + documents folder
    if (member?.id) {
      // Remove any existing W-9 vendor_documents (and their synced docs)
      const { data: existingW9s } = await supabase
        .from('vendor_documents')
        .select('id')
        .eq('vendor_id', vendor.id)
        .eq('document_type', 'w9');

      if (existingW9s && existingW9s.length > 0) {
        const w9Ids = existingW9s.map((d) => d.id);
        await supabase.from('documents').delete().in('vendor_document_id', w9Ids);
        await supabase.from('vendor_documents').delete().in('id', w9Ids);
      }

      // Create a vendor_documents entry for this W-9
      const { data: w9Doc } = await supabase
        .from('vendor_documents')
        .insert({
          vendor_id: vendor.id,
          community_id: vendor.community_id,
          document_type: 'w9' as const,
          title: 'W-9',
          file_path: path,
          file_size: file.size,
          uploaded_by: member.id,
        })
        .select('id')
        .single();

      // Sync to documents folder
      if (w9Doc) {
        syncVendorDocToFolder({
          vendorDocId: w9Doc.id,
          vendorId: vendor.id,
          vendorName: vendor.company || vendor.name,
          communityId: vendor.community_id,
          memberId: member.id,
          title: 'W-9',
          filePath: path,
          fileSize: file.size,
        }).catch((err) => console.error('Failed to sync W-9 to folder:', err));
      }
    }

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

  async function handleInsuranceUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !vendor) return;
    setUploadingInsurance(true);
    const supabase = createClient();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');
    const path = `${vendor.community_id}/vendor-docs/${vendor.id}/${Date.now()}_${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from('hoa-documents')
      .upload(path, file, { upsert: false });
    if (uploadError) {
      toast.error('Failed to upload file.');
      setUploadingInsurance(false);
      if (insuranceInputRef.current) insuranceInputRef.current.value = '';
      return;
    }
    const { data: docData, error: insertError } = await supabase
      .from('vendor_documents')
      .insert({
        vendor_id: vendor.id,
        community_id: vendor.community_id,
        document_type: 'insurance_cert' as const,
        title: 'Insurance Certificate',
        file_path: path,
        file_size: file.size,
        uploaded_by: member?.id ?? '',
      })
      .select('*')
      .single();
    if (insertError) {
      toast.error('Failed to save document record.');
      setUploadingInsurance(false);
      if (insuranceInputRef.current) insuranceInputRef.current.value = '';
      return;
    }
    setInsuranceDoc(docData as VendorDocument);

    // Sync to documents folder
    if (docData && member?.id) {
      syncVendorDocToFolder({
        vendorDocId: docData.id,
        vendorId: vendor.id,
        vendorName: vendor.company || vendor.name,
        communityId: vendor.community_id,
        memberId: member.id,
        title: 'Insurance Certificate',
        filePath: path,
        fileSize: file.size,
      }).catch((err) => console.error('Failed to sync insurance doc to folder:', err));
    }

    toast.success('Insurance certificate uploaded.');
    setUploadingInsurance(false);
    if (insuranceInputRef.current) insuranceInputRef.current.value = '';
    onUpdated();
  }

  async function handleInsuranceDownload() {
    if (!insuranceDoc) return;
    const supabase = createClient();
    const { data } = await supabase.storage
      .from('hoa-documents')
      .createSignedUrl(insuranceDoc.file_path, 60);
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    } else {
      toast.error('Failed to generate download link.');
    }
  }

  if (!vendor) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
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
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
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

          {/* Insurance Certificate Upload */}
          <div className="space-y-1.5">
            <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Insurance Certificate
            </Label>
            <div className="flex items-center gap-3">
              {insuranceDoc ? (
                <Badge variant="outline" className="text-meta text-green-600 dark:text-green-400 gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  On file
                </Badge>
              ) : (
                <Badge variant="outline" className="text-meta text-yellow-600 dark:text-yellow-400">
                  No certificate
                </Badge>
              )}
              {insuranceDoc && (
                <Button type="button" variant="ghost" size="sm" onClick={handleInsuranceDownload}>
                  <FileText className="h-3.5 w-3.5 mr-1" />
                  View
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadingInsurance}
                onClick={() => insuranceInputRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5 mr-1" />
                {uploadingInsurance ? 'Uploading...' : insuranceDoc ? 'Replace' : 'Upload'}
              </Button>
              <input
                ref={insuranceInputRef}
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={handleInsuranceUpload}
              />
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

          {/* Default Expense Category */}
          {expenseAccounts.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Default Expense Category
              </Label>
              <Select value={defaultExpenseAccountId} onValueChange={setDefaultExpenseAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">None</SelectItem>
                  {expenseAccounts.map((acct) => (
                    <SelectItem key={acct.id} value={acct.id}>
                      {acct.code} - {acct.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                Auto-fills when writing checks to this vendor
              </p>
            </div>
          )}

          {/* Address */}
          <div className="space-y-1.5">
            <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Address
            </Label>
            <Input
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              placeholder="Street address"
              className="mb-1.5"
            />
            <Input
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              placeholder="Apt, Suite, etc. (optional)"
              className="mb-1.5"
            />
            <div className="grid grid-cols-3 gap-2">
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
              <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="State" />
              <Input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="ZIP" />
            </div>
          </div>

          {/* Vendor Documents */}
          <VendorDocumentsSection
            vendorId={vendor.id}
            vendorName={vendor.company || vendor.name}
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
          {(onWriteCheck || onRecordPayment) && (
            <div className="flex items-center gap-2 mr-auto">
              {onWriteCheck && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { onOpenChange(false); onWriteCheck(vendor); }}
                >
                  <Printer className="h-4 w-4 mr-1" />
                  Write Check
                </Button>
              )}
              {onRecordPayment && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { onOpenChange(false); onRecordPayment(vendor); }}
                >
                  <DollarSign className="h-4 w-4 mr-1" />
                  Record Payment
                </Button>
              )}
            </div>
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
