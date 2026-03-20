'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/shared/ui/dialog';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Switch } from '@/components/shared/ui/switch';
import { Checkbox } from '@/components/shared/ui/checkbox';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { logAuditEvent } from '@/lib/audit';
import {
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  DEFAULT_ROLE_TEMPLATES,
  allPermissions,
} from '@/lib/types/permissions';
import type {
  RoleTemplate,
  PermissionKey,
  PermissionMap,
} from '@/lib/types/permissions';

interface CustomPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Initial permissions to start with (e.g. from a cloned template) */
  initialPermissions?: PermissionMap;
  /** Called with the template ID to assign to the member */
  onSave: (templateId: string) => void;
}

export function CustomPermissionsDialog({
  open,
  onOpenChange,
  initialPermissions,
  onSave,
}: CustomPermissionsDialogProps) {
  const { community, member } = useCommunity();
  const [permissions, setPermissions] = useState<PermissionMap>(
    initialPermissions || allPermissions(),
  );
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [saving, setSaving] = useState(false);

  function handleToggle(key: PermissionKey, level: 'read' | 'write', value: boolean) {
    setPermissions((prev) => {
      const updated = { ...prev };
      if (level === 'read' && !value) {
        updated[key] = { read: false, write: false };
      } else if (level === 'write' && value) {
        updated[key] = { read: true, write: true };
      } else {
        updated[key] = { ...updated[key], [level]: value };
      }
      return updated;
    });
  }

  async function handleSave() {
    if (saveAsTemplate && !templateName.trim()) {
      toast.error('Please enter a name for the template.');
      return;
    }

    setSaving(true);
    const supabase = createClient();

    // Generate a unique template ID
    const templateId = saveAsTemplate
      ? `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      : `__custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const newTemplate: RoleTemplate = {
      id: templateId,
      name: saveAsTemplate ? templateName.trim() : `Custom`,
      description: saveAsTemplate ? undefined : 'Custom permissions',
      is_default: false,
      permissions,
    };

    // Get current templates
    const stored = (community.theme?.role_templates ?? DEFAULT_ROLE_TEMPLATES) as RoleTemplate[];

    // If saving as template, add to community templates
    // If not saving as template, still add it (needed for permission resolution) but mark it as non-reusable
    const updated = [...stored, newTemplate];

    const { error } = await supabase
      .from('communities')
      .update({
        theme: {
          ...community.theme,
          role_templates: updated,
        },
      })
      .eq('id', community.id);

    setSaving(false);

    if (error) {
      toast.error('Failed to save permissions.');
      return;
    }

    if (saveAsTemplate) {
      logAuditEvent({
        communityId: community.id,
        actorId: member?.user_id,
        actorEmail: member?.email,
        action: 'role_template_created',
        targetType: 'community',
        targetId: community.id,
        metadata: { template_name: templateName.trim() },
      });
      toast.success(`Template "${templateName.trim()}" created.`);
    }

    onSave(templateId);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Custom Permissions</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {PERMISSION_GROUPS.map((group) => (
            <div key={group.label} className="space-y-2">
              <h4 className="text-label font-semibold text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider">
                {group.label}
              </h4>
              <div className="space-y-1">
                {group.keys.map((key) => {
                  const perm = permissions[key] || { read: false, write: false };
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between py-1.5 px-3 rounded-inner-card hover:bg-surface-light-2 dark:hover:bg-surface-dark-2"
                    >
                      <span className="text-body text-text-primary-light dark:text-text-primary-dark">
                        {PERMISSION_LABELS[key]}
                      </span>
                      <div className="flex items-center gap-5">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
                            Read
                          </span>
                          <Switch
                            checked={perm.read}
                            onCheckedChange={(v) => handleToggle(key, 'read', v)}
                          />
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
                            Write
                          </span>
                          <Switch
                            checked={perm.write}
                            onCheckedChange={(v) => handleToggle(key, 'write', v)}
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Save as template option */}
          <div className="border-t border-stroke-light dark:border-stroke-dark pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="save-as-template"
                checked={saveAsTemplate}
                onCheckedChange={(v) => setSaveAsTemplate(v === true)}
              />
              <Label
                htmlFor="save-as-template"
                className="text-body text-text-primary-light dark:text-text-primary-dark cursor-pointer"
              >
                Save as reusable template
              </Label>
            </div>
            {saveAsTemplate && (
              <div className="space-y-1.5 pl-6">
                <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                  Template name
                </Label>
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g. Grounds Committee Chair"
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Permissions'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
