'use client';

import { useRef, useState } from 'react';
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
import { ImagePlus, X } from 'lucide-react';
import {
  sendViolationNoticeEmail,
  notifyHouseholdOfViolation,
  notifyBoardOfViolationReport,
} from '@/lib/actions/violation-actions';
import { UnitPicker } from '@/components/shared/unit-picker';
import type { ViolationCategory, ViolationSeverity, ViolationTemplate } from '@/lib/types/database';

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = '.jpg,.jpeg,.png,.webp,.heic';

interface CreateViolationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  units?: unknown[];
  templates?: ViolationTemplate[];
  communityId: string;
  communitySlug: string;
  onCreated: () => void;
}

export function CreateViolationDialog({
  open,
  onOpenChange,
  templates = [],
  communityId,
  communitySlug,
  onCreated,
}: CreateViolationDialogProps) {
  const { member, unit, isBoard } = useCommunity();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [unitId, setUnitId] = useState('');
  const [category, setCategory] = useState<ViolationCategory>('other');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<ViolationSeverity>('warning');
  const [complianceDeadline, setComplianceDeadline] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [reportedUnitId, setReportedUnitId] = useState('');
  const [reportedLocation, setReportedLocation] = useState('');
  const [saving, setSaving] = useState(false);

  function handleTemplateSelect(templateId: string) {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    setTitle(template.title);
    setDescription(template.description ?? '');
    setCategory(template.category);
    setSeverity(template.severity);
    if (template.default_deadline_days) {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + template.default_deadline_days);
      setComplianceDeadline(deadline.toISOString().split('T')[0]);
    }
  }

  // Residents auto-select their own unit; board picks from dropdown
  const isResidentReporting = !isBoard;
  const effectiveUnitId = isResidentReporting ? unit?.id ?? '' : unitId;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    const valid = selected.filter((f) => {
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`${f.name} exceeds 10 MB limit.`);
        return false;
      }
      return true;
    });
    setFiles((prev) => {
      const combined = [...prev, ...valid].slice(0, MAX_FILES);
      if (prev.length + valid.length > MAX_FILES) {
        toast.error(`Maximum ${MAX_FILES} photos allowed.`);
      }
      return combined;
    });
    // Reset input so re-selecting the same file works
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function uploadPhotos(supabase: ReturnType<typeof createClient>): Promise<string[]> {
    if (files.length === 0) return [];

    const urls: string[] = [];
    for (const file of files) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
      const filePath = `${communityId}/violations/${Date.now()}_${safeName}`;

      const { error } = await supabase.storage
        .from('hoa-documents')
        .upload(filePath, file);

      if (error) {
        toast.error(`Failed to upload ${file.name}.`);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from('hoa-documents')
        .getPublicUrl(filePath);

      if (urlData?.publicUrl) {
        urls.push(urlData.publicUrl);
      }
    }
    return urls;
  }

  async function handleCreate() {
    if (!title.trim() || !effectiveUnitId) {
      toast.error('Please fill in all required fields.');
      return;
    }

    if (!member) {
      toast.error('You must be logged in to report a violation.');
      return;
    }

    setSaving(true);
    const supabase = createClient();

    // Upload photos first
    const photoUrls = await uploadPhotos(supabase);

    const { data: inserted, error } = await supabase
      .from('violations')
      .insert({
        community_id: communityId,
        unit_id: effectiveUnitId,
        reported_by: member.id,
        category,
        title: title.trim(),
        description: description.trim() || null,
        severity,
        photo_urls: photoUrls,
        compliance_deadline: complianceDeadline || null,
        reported_unit_id: isResidentReporting ? (reportedUnitId || null) : null,
        reported_location: isResidentReporting ? (reportedLocation.trim() || null) : null,
      })
      .select('id')
      .single();

    setSaving(false);

    if (error || !inserted) {
      toast.error('Failed to create violation. Please try again.');
      return;
    }

    toast.success('Violation reported.');
    logAuditEvent({
      communityId,
      actorId: member?.user_id,
      actorEmail: member?.email,
      action: 'violation_created',
      targetType: 'violation',
      targetId: inserted.id,
      metadata: { title: title.trim(), category, severity },
    });

    // Fire-and-forget: notify household + queue email
    notifyHouseholdOfViolation(
      communityId,
      effectiveUnitId,
      inserted.id,
      title.trim(),
      category,
    ).catch(() => {});

    sendViolationNoticeEmail(
      communityId,
      communitySlug,
      effectiveUnitId,
      title.trim(),
      category,
      severity,
      'courtesy',
      description.trim() || undefined,
    ).catch(() => {});

    // Fire-and-forget: notify board members about resident reports
    if (isResidentReporting) {
      const reporterName =
        [member.first_name, member.last_name].filter(Boolean).join(' ') ||
        member.email || 'A resident';

      notifyBoardOfViolationReport(
        communityId,
        communitySlug,
        inserted.id,
        title.trim(),
        category,
        severity,
        reporterName,
        description.trim() || undefined,
        reportedLocation.trim() || undefined,
        undefined, // TODO: resolve reported unit number if reportedUnitId is set
      ).catch(() => {});
    }

    // Reset form
    setTitle('');
    setDescription('');
    setUnitId('');
    setCategory('other');
    setSeverity('warning');
    setComplianceDeadline('');
    setFiles([]);
    setReportedUnitId('');
    setReportedLocation('');
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
          {/* Template selector (board only) */}
          {isBoard && templates.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Use Template
              </Label>
              <Select onValueChange={handleTemplateSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Unit selector: board picks, residents see their unit */}
          {isResidentReporting ? (
            unit && (
              <div className="space-y-1.5">
                <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                  Your Unit
                </Label>
                <p className="text-body text-text-primary-light dark:text-text-primary-dark">
                  Unit {unit.unit_number}
                </p>
              </div>
            )
          ) : (
            <div className="space-y-1.5">
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Unit *
              </Label>
              <UnitPicker
                communityId={communityId}
                value={unitId}
                onValueChange={setUnitId}
                placeholder="Select unit..."
              />
            </div>
          )}

          {/* Location identifier (resident reports only) */}
          {isResidentReporting && (
            <div className="space-y-3 rounded-inner-card border border-stroke-light dark:border-stroke-dark p-3">
              <p className="text-label font-semibold text-text-primary-light dark:text-text-primary-dark">
                Where did this happen?
              </p>
              <div className="space-y-1.5">
                <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                  Which unit or lot? (optional)
                </Label>
                <UnitPicker
                  communityId={communityId}
                  value={reportedUnitId}
                  onValueChange={setReportedUnitId}
                  placeholder="Select unit or lot..."
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                  Or describe the location
                </Label>
                <Input
                  value={reportedLocation}
                  onChange={(e) => setReportedLocation(e.target.value)}
                  placeholder="e.g., common area near pool, parking lot B"
                />
              </div>
            </div>
          )}

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

          {/* Compliance deadline (board only) */}
          {isBoard && (
            <div className="space-y-1.5">
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Compliance Deadline
              </Label>
              <Input
                type="date"
                value={complianceDeadline}
                onChange={(e) => setComplianceDeadline(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                Date by which the violation must be corrected
              </p>
            </div>
          )}

          {/* Photo upload */}
          <div className="space-y-1.5">
            <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Photos
            </Label>
            <div className="flex flex-wrap gap-2">
              {files.map((file, i) => (
                <div
                  key={i}
                  className="relative h-20 w-20 rounded-inner-card overflow-hidden border border-stroke-light dark:border-stroke-dark"
                >
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="absolute top-0.5 right-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {files.length < MAX_FILES && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-20 w-20 items-center justify-center rounded-inner-card border-2 border-dashed border-stroke-light dark:border-stroke-dark text-text-muted-light dark:text-text-muted-dark hover:border-secondary-400/50 transition-colors"
                >
                  <ImagePlus className="h-5 w-5" />
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
              Up to {MAX_FILES} images, 10 MB each
            </p>
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
