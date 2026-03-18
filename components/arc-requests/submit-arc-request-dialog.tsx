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
import { UnitPicker } from '@/components/shared/unit-picker';
import { Paperclip, X } from 'lucide-react';
import { toast } from 'sonner';
import { logAuditEvent } from '@/lib/audit';
import type { ArcProjectType } from '@/lib/types/database';

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = 'image/*,.pdf,.doc,.docx';

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
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Show unit picker for board in admin view, or any board member without a unit
  const needsUnitPicker = isBoard || (actualIsBoard && !unit);

  const effectiveUnitId = needsUnitPicker ? selectedUnitId : unit?.id ?? '';

  function resetForm() {
    setTitle('');
    setDescription('');
    setProjectType('other');
    setEstimatedCost('');
    setSelectedUnitId('');
    setFiles([]);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    const validFiles = selected.filter((f) => {
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`${f.name} exceeds 10MB limit.`);
        return false;
      }
      return true;
    });

    setFiles((prev) => {
      const combined = [...prev, ...validFiles].slice(0, MAX_FILES);
      if (prev.length + validFiles.length > MAX_FILES) {
        toast.error(`Maximum ${MAX_FILES} files allowed.`);
      }
      return combined;
    });

    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function uploadFiles(requestId: string): Promise<string[]> {
    if (files.length === 0) return [];
    const supabase = createClient();
    const urls: string[] = [];

    for (const file of files) {
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${community.id}/arc-requests/${requestId}/${timestamp}_${safeName}`;

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

    const { data, error } = await supabase.from('arc_requests').insert({
      community_id: community.id,
      unit_id: effectiveUnitId,
      submitted_by: member.id,
      title: title.trim(),
      description: description.trim() || null,
      project_type: projectType,
      estimated_cost: costCents,
      status: 'submitted',
    }).select('id').single();

    if (error) {
      setSaving(false);
      toast.error('Failed to submit request. Please try again.');
      return;
    }

    // Upload files and save URLs
    if (files.length > 0) {
      const photoUrls = await uploadFiles(data.id);
      if (photoUrls.length > 0) {
        await supabase
          .from('arc_requests')
          .update({ photo_urls: photoUrls })
          .eq('id', data.id);
      }
    }

    setSaving(false);
    toast.success('ARC request submitted.');

    // Notify board members
    void supabase.rpc('create_board_notifications', {
      p_community_id: community.id,
      p_type: 'arc_request_submitted',
      p_title: `New ARC request: ${title.trim()}`,
      p_body: `${member.first_name} ${member.last_name} submitted an ARC request.`,
      p_reference_id: data.id,
      p_reference_type: 'arc_request',
    });

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
              <UnitPicker
                communityId={community.id}
                value={selectedUnitId}
                onValueChange={setSelectedUnitId}
                placeholder="Select unit..."
              />
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

          {/* File attachments */}
          <div className="space-y-1.5">
            <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Photos / Documents
            </Label>
            <div className="space-y-2">
              {files.length > 0 && (
                <div className="space-y-1">
                  {files.map((f, i) => (
                    <div
                      key={`${f.name}-${i}`}
                      className="flex items-center gap-2 text-meta text-text-secondary-light dark:text-text-secondary-dark bg-surface-light-2 dark:bg-surface-dark-2 rounded-inner-card px-2 py-1"
                    >
                      <Paperclip className="h-3 w-3 shrink-0" />
                      <span className="truncate flex-1">{f.name}</span>
                      <span className="shrink-0 tabular-nums">
                        {(f.size / 1024).toFixed(0)} KB
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="p-0.5 rounded hover:bg-surface-light dark:hover:bg-surface-dark transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {files.length < MAX_FILES && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_TYPES}
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="h-3.5 w-3.5 mr-1.5" />
                    Attach files
                  </Button>
                  <p className="text-[10px] text-text-muted-light dark:text-text-muted-dark">
                    Up to {MAX_FILES} files, 10MB each. Images, PDFs, or Word documents.
                  </p>
                </>
              )}
            </div>
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
