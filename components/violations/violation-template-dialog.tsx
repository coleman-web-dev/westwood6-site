'use client';

import { useState, useEffect } from 'react';
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
import type { ViolationTemplate, ViolationCategory, ViolationSeverity } from '@/lib/types/database';

interface ViolationTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: ViolationTemplate | null;
  onSave: (data: {
    name: string;
    title: string;
    description: string | null;
    category: ViolationCategory;
    severity: ViolationSeverity;
    default_fine_amount: number | null;
    default_deadline_days: number | null;
  }) => void;
  saving: boolean;
}

export function ViolationTemplateDialog({
  open,
  onOpenChange,
  template,
  onSave,
  saving,
}: ViolationTemplateDialogProps) {
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ViolationCategory>('other');
  const [severity, setSeverity] = useState<ViolationSeverity>('warning');
  const [fineAmount, setFineAmount] = useState('');
  const [deadlineDays, setDeadlineDays] = useState('');

  useEffect(() => {
    if (template) {
      setName(template.name);
      setTitle(template.title);
      setDescription(template.description ?? '');
      setCategory(template.category);
      setSeverity(template.severity);
      setFineAmount(template.default_fine_amount ? (template.default_fine_amount / 100).toString() : '');
      setDeadlineDays(template.default_deadline_days?.toString() ?? '');
    } else {
      setName('');
      setTitle('');
      setDescription('');
      setCategory('other');
      setSeverity('warning');
      setFineAmount('');
      setDeadlineDays('');
    }
  }, [template, open]);

  function handleSubmit() {
    if (!name.trim() || !title.trim()) return;

    const parsedFine = fineAmount ? parseFloat(fineAmount) : null;
    const parsedDays = deadlineDays ? parseInt(deadlineDays, 10) : null;

    onSave({
      name: name.trim(),
      title: title.trim(),
      description: description.trim() || null,
      category,
      severity,
      default_fine_amount: parsedFine ? Math.round(parsedFine * 100) : null,
      default_deadline_days: parsedDays && parsedDays > 0 ? parsedDays : null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{template ? 'Edit Template' : 'New Template'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Template Name *
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Lawn Maintenance"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Violation Title *
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title that appears on the violation"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Description
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Default description..."
              rows={3}
              className="resize-none"
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Default Fine ($)
              </Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={fineAmount}
                onChange={(e) => setFineAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Deadline (days)
              </Label>
              <Input
                type="number"
                min="1"
                value={deadlineDays}
                onChange={(e) => setDeadlineDays(e.target.value)}
                placeholder="14"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={saving || !name.trim() || !title.trim()}>
            {saving ? 'Saving...' : template ? 'Save Changes' : 'Create Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
