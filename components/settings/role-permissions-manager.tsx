'use client';

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Badge } from '@/components/shared/ui/badge';
import { Switch } from '@/components/shared/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/shared/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { toast } from 'sonner';
import { Plus, Shield, Trash2, Copy, Loader2 } from 'lucide-react';
import type { RoleTemplate, PermissionKey } from '@/lib/types/permissions';
import {
  PERMISSION_KEYS,
  PERMISSION_LABELS,
  PERMISSION_GROUPS,
  DEFAULT_ROLE_TEMPLATES,
  allPermissions,
} from '@/lib/types/permissions';
import { MemberRoleAssignment } from './member-role-assignment';

export function RolePermissionsManager() {
  const { community } = useCommunity();
  const [templates, setTemplates] = useState<RoleTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [cloneFrom, setCloneFrom] = useState<string>('');
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});

  const loadData = useCallback(async () => {
    const supabase = createClient();

    // Load templates from community theme
    const stored = (community.theme?.role_templates ?? DEFAULT_ROLE_TEMPLATES) as RoleTemplate[];
    setTemplates(stored);
    if (!selectedId && stored.length > 0) {
      setSelectedId(stored[0].id);
    }

    // Count members per template
    const { data: members } = await supabase
      .from('members')
      .select('role_template_id')
      .eq('community_id', community.id)
      .in('system_role', ['board', 'manager', 'super_admin']);

    const counts: Record<string, number> = {};
    for (const m of members || []) {
      const tid = m.role_template_id || 'unassigned';
      counts[tid] = (counts[tid] || 0) + 1;
    }
    setMemberCounts(counts);
  }, [community.id, community.theme?.role_templates, selectedId]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [community.id]);

  const selected = templates.find((t) => t.id === selectedId) || null;

  async function saveTemplates(updated: RoleTemplate[]) {
    setSaving(true);
    const supabase = createClient();

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
      toast.error('Failed to save role templates.');
      return false;
    }

    setTemplates(updated);
    toast.success('Role templates saved.');
    return true;
  }

  function handlePermissionToggle(
    key: PermissionKey,
    level: 'read' | 'write',
    value: boolean,
  ) {
    if (!selected) return;

    const updated = templates.map((t) => {
      if (t.id !== selected.id) return t;
      const newPerms = { ...t.permissions };
      newPerms[key] = { ...newPerms[key], [level]: value };
      // If turning off read, also turn off write
      if (level === 'read' && !value) {
        newPerms[key] = { read: false, write: false };
      }
      // If turning on write, also turn on read
      if (level === 'write' && value) {
        newPerms[key] = { ...newPerms[key], read: true, write: true };
      }
      return { ...t, permissions: newPerms };
    });

    setTemplates(updated);
  }

  async function handleSave() {
    await saveTemplates(templates);
  }

  async function handleCreateTemplate() {
    if (!newName.trim()) {
      toast.error('Please enter a name for the template.');
      return;
    }

    const id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    let basePermissions = allPermissions();

    if (cloneFrom) {
      const source = templates.find((t) => t.id === cloneFrom);
      if (source) {
        basePermissions = { ...source.permissions };
      }
    }

    const newTemplate: RoleTemplate = {
      id,
      name: newName.trim(),
      description: newDescription.trim() || undefined,
      is_default: false,
      permissions: basePermissions,
    };

    const updated = [...templates, newTemplate];
    const saved = await saveTemplates(updated);
    if (saved) {
      setSelectedId(id);
      setShowCreate(false);
      setNewName('');
      setNewDescription('');
      setCloneFrom('');
    }
  }

  async function handleDeleteTemplate(templateId: string) {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    const count = memberCounts[templateId] || 0;
    if (count > 0) {
      toast.error(
        `Cannot delete "${template.name}" because ${count} member${count > 1 ? 's are' : ' is'} assigned to it.`,
      );
      return;
    }

    const updated = templates.filter((t) => t.id !== templateId);
    const saved = await saveTemplates(updated);
    if (saved && selectedId === templateId) {
      setSelectedId(updated[0]?.id || null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Template selector + actions */}
      <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-text-muted-light dark:text-text-muted-dark" />
            <h3 className="text-section-title text-text-primary-light dark:text-text-primary-dark">
              Role Templates
            </h3>
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowCreate(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Create Template
          </Button>
        </div>

        <p className="text-body text-text-secondary-light dark:text-text-secondary-dark">
          Define what each role can see and do. Board members without an assigned template default to read-only access.
        </p>

        {/* Template list */}
        <div className="flex flex-wrap gap-2">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedId(t.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-pill text-label transition-colors ${
                selectedId === t.id
                  ? 'bg-primary-700 text-white dark:bg-primary-300 dark:text-primary-900'
                  : 'bg-surface-light-2 dark:bg-surface-dark-2 text-text-secondary-light dark:text-text-secondary-dark hover:bg-primary-100 dark:hover:bg-primary-800'
              }`}
            >
              {t.name}
              {(memberCounts[t.id] || 0) > 0 && (
                <Badge variant="outline" className="text-[10px] h-4 px-1">
                  {memberCounts[t.id]}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* Selected template info */}
        {selected && (
          <div className="flex items-center justify-between pt-2 border-t border-stroke-light dark:border-stroke-dark">
            <div>
              <p className="text-body font-medium text-text-primary-light dark:text-text-primary-dark">
                {selected.name}
              </p>
              {selected.description && (
                <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                  {selected.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selected.is_default && (
                <Badge variant="outline" className="text-meta">Default</Badge>
              )}
              {!selected.is_default && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-warning-dot hover:text-warning-dot"
                  onClick={() => handleDeleteTemplate(selected.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Permission matrix */}
      {selected && (
        <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-section-title text-text-primary-light dark:text-text-primary-dark">
              Permissions for {selected.name}
            </h3>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              Save Changes
            </Button>
          </div>

          {PERMISSION_GROUPS.map((group) => (
            <div key={group.label} className="space-y-2">
              <h4 className="text-label font-semibold text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider">
                {group.label}
              </h4>
              <div className="space-y-1">
                {group.keys.map((key) => {
                  const perm = selected.permissions[key] || { read: false, write: false };
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between py-2 px-3 rounded-inner-card hover:bg-surface-light-2 dark:hover:bg-surface-dark-2"
                    >
                      <span className="text-body text-text-primary-light dark:text-text-primary-dark">
                        {PERMISSION_LABELS[key]}
                      </span>
                      <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
                            Read
                          </span>
                          <Switch
                            checked={perm.read}
                            onCheckedChange={(v) => handlePermissionToggle(key, 'read', v)}
                          />
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
                            Write
                          </span>
                          <Switch
                            checked={perm.write}
                            onCheckedChange={(v) => handlePermissionToggle(key, 'write', v)}
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Member assignment section */}
      <MemberRoleAssignment templates={templates} onAssigned={loadData} />

      {/* Create template dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Role Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Template Name *
              </Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Grounds Committee Chair"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Description
              </Label>
              <Input
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Clone permissions from
              </Label>
              <Select value={cloneFrom} onValueChange={setCloneFrom}>
                <SelectTrigger>
                  <SelectValue placeholder="Start from scratch (all access)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Start from scratch (all access)</SelectItem>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      <Copy className="h-3 w-3 inline mr-1" />
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleCreateTemplate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
