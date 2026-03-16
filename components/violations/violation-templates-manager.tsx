'use client';

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import { toast } from 'sonner';
import { logAuditEvent } from '@/lib/audit';
import { useCommunity } from '@/lib/providers/community-provider';
import { ViolationTemplateDialog } from '@/components/violations/violation-template-dialog';
import { Plus, Pencil, Archive } from 'lucide-react';
import type { ViolationTemplate, ViolationCategory, ViolationSeverity } from '@/lib/types/database';

const DEFAULT_TEMPLATES: Omit<ViolationTemplate, 'id' | 'community_id' | 'is_active' | 'created_at' | 'updated_at'>[] = [
  { name: 'Unapproved Exterior Modification', title: 'Unapproved modification to exterior of property', description: 'An exterior modification was made without prior architectural review committee approval.', category: 'architectural', severity: 'major', default_fine_amount: 10000, default_deadline_days: 30 },
  { name: 'Lawn Maintenance', title: 'Lawn or landscaping not maintained to community standards', description: 'The lawn or landscaping on this property does not meet the community maintenance standards outlined in the CC&Rs.', category: 'maintenance', severity: 'minor', default_fine_amount: 5000, default_deadline_days: 14 },
  { name: 'Noise Complaint', title: 'Excessive noise reported', description: 'Excessive noise has been reported originating from this property in violation of community quiet hours or noise policies.', category: 'noise', severity: 'warning', default_fine_amount: null, default_deadline_days: 7 },
  { name: 'Unauthorized Parking', title: 'Vehicle parked in unauthorized area or in violation of parking rules', description: 'A vehicle associated with this unit has been observed parked in an unauthorized area or in violation of community parking rules.', category: 'parking', severity: 'minor', default_fine_amount: 5000, default_deadline_days: 7 },
  { name: 'Pet Violation', title: 'Pet-related violation of community rules', description: 'A pet-related violation has been observed, such as an unleashed pet in common areas, failure to clean up after a pet, or exceeding the pet limit.', category: 'pets', severity: 'warning', default_fine_amount: null, default_deadline_days: 14 },
  { name: 'Improper Trash Disposal', title: 'Trash or recycling not properly disposed of', description: 'Trash or recycling has not been properly stored or disposed of according to community guidelines.', category: 'trash', severity: 'minor', default_fine_amount: 2500, default_deadline_days: 7 },
  { name: 'Unauthorized Signage', title: 'Signage placed without prior approval', description: 'Signage has been placed on the property or in common areas without prior board approval as required by community rules.', category: 'architectural', severity: 'minor', default_fine_amount: 5000, default_deadline_days: 14 },
];

interface ViolationTemplatesManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViolationTemplatesManager({ open, onOpenChange }: ViolationTemplatesManagerProps) {
  const { community, member } = useCommunity();
  const [templates, setTemplates] = useState<ViolationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ViolationTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchTemplates = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('violation_templates')
      .select('*')
      .eq('community_id', community.id)
      .order('name');
    setTemplates((data as ViolationTemplate[]) || []);
    setLoading(false);
  }, [community.id]);

  useEffect(() => {
    if (open) fetchTemplates();
  }, [open, fetchTemplates]);

  async function handleSave(data: {
    name: string;
    title: string;
    description: string | null;
    category: ViolationCategory;
    severity: ViolationSeverity;
    default_fine_amount: number | null;
    default_deadline_days: number | null;
  }) {
    setSaving(true);
    const supabase = createClient();

    if (editingTemplate) {
      const { error } = await supabase
        .from('violation_templates')
        .update(data)
        .eq('id', editingTemplate.id);

      setSaving(false);
      if (error) {
        toast.error('Failed to update template.');
        return;
      }
      toast.success('Template updated.');
      logAuditEvent({
        communityId: community.id,
        actorId: member?.user_id,
        actorEmail: member?.email,
        action: 'violation_template_updated',
        targetType: 'violation_template',
        targetId: editingTemplate.id,
        metadata: { name: data.name },
      });
    } else {
      const { data: inserted, error } = await supabase
        .from('violation_templates')
        .insert({ ...data, community_id: community.id })
        .select('id')
        .single();

      setSaving(false);
      if (error || !inserted) {
        toast.error('Failed to create template.');
        return;
      }
      toast.success('Template created.');
      logAuditEvent({
        communityId: community.id,
        actorId: member?.user_id,
        actorEmail: member?.email,
        action: 'violation_template_created',
        targetType: 'violation_template',
        targetId: inserted.id,
        metadata: { name: data.name },
      });
    }

    setEditOpen(false);
    setEditingTemplate(null);
    fetchTemplates();
  }

  async function handleDeactivate(template: ViolationTemplate) {
    const supabase = createClient();
    const newActive = !template.is_active;
    const { error } = await supabase
      .from('violation_templates')
      .update({ is_active: newActive })
      .eq('id', template.id);

    if (error) {
      toast.error('Failed to update template.');
      return;
    }
    toast.success(newActive ? 'Template activated.' : 'Template deactivated.');
    fetchTemplates();
  }

  async function handleLoadDefaults() {
    const supabase = createClient();
    const rows = DEFAULT_TEMPLATES.map((t) => ({ ...t, community_id: community.id }));
    const { error } = await supabase.from('violation_templates').insert(rows);

    if (error) {
      toast.error('Failed to load default templates.');
      return;
    }
    toast.success('Default templates loaded.');
    fetchTemplates();
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Violation Templates</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <p className="text-body text-text-secondary-light dark:text-text-secondary-dark">
                Templates pre-fill violation forms to save time.
              </p>
              <div className="flex gap-2">
                {templates.length === 0 && !loading && (
                  <Button variant="outline" size="sm" onClick={handleLoadDefaults}>
                    Load Defaults
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => { setEditingTemplate(null); setEditOpen(true); }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </div>

            {loading ? (
              <p className="text-body text-text-muted-light dark:text-text-muted-dark py-8 text-center">
                Loading...
              </p>
            ) : templates.length === 0 ? (
              <p className="text-body text-text-muted-light dark:text-text-muted-dark py-8 text-center">
                No templates yet. Click "Load Defaults" to get started.
              </p>
            ) : (
              <div className="divide-y divide-stroke-light dark:divide-stroke-dark">
                {templates.map((t) => (
                  <div
                    key={t.id}
                    className={`flex items-center justify-between py-3 gap-4 ${
                      !t.is_active ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-label text-text-primary-light dark:text-text-primary-dark truncate">
                          {t.name}
                        </span>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {t.category}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          {t.severity}
                        </Badge>
                        {!t.is_active && (
                          <Badge variant="outline" className="text-[10px] shrink-0 text-text-muted-light dark:text-text-muted-dark">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-3 mt-0.5">
                        {t.default_fine_amount != null && (
                          <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
                            Fine: ${(t.default_fine_amount / 100).toFixed(2)}
                          </span>
                        )}
                        {t.default_deadline_days != null && (
                          <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
                            Deadline: {t.default_deadline_days}d
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setEditingTemplate(t); setEditOpen(true); }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeactivate(t)}
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ViolationTemplateDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        template={editingTemplate}
        onSave={handleSave}
        saving={saving}
      />
    </>
  );
}
