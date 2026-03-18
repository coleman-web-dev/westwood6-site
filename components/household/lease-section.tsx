'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Switch } from '@/components/shared/ui/switch';
import { FileText, Upload, ExternalLink, Trash2, Loader2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Unit, LeaseNotificationRule } from '@/lib/types/database';

interface LeaseSectionProps {
  unit: Unit;
  onUnitUpdated: (unit: Unit) => void;
}

export function LeaseSection({ unit, onUnitUpdated }: LeaseSectionProps) {
  const { community, isBoard } = useCommunity();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local state for editable fields
  const [isLeased, setIsLeased] = useState(unit.is_leased);
  const [leaseStart, setLeaseStart] = useState(unit.lease_start_date ?? '');
  const [leaseExpiration, setLeaseExpiration] = useState(unit.lease_expiration_date ?? '');
  const [notificationRules, setNotificationRules] = useState<LeaseNotificationRule[]>(
    unit.lease_notification_rules?.length > 0
      ? unit.lease_notification_rules
      : community.default_lease_notification_rules ?? [{ days_before: 30 }]
  );
  const [newDaysBefore, setNewDaysBefore] = useState('');

  async function handleToggleLease(checked: boolean) {
    setIsLeased(checked);
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('units')
      .update({ is_leased: checked })
      .eq('id', unit.id);

    setSaving(false);
    if (error) {
      toast.error('Failed to update lease status.');
      setIsLeased(!checked);
      return;
    }
    onUnitUpdated({ ...unit, is_leased: checked });
  }

  async function handleSaveDates() {
    setSaving(true);
    const supabase = createClient();

    const updates: Record<string, unknown> = {
      lease_start_date: leaseStart || null,
      lease_expiration_date: leaseExpiration || null,
      lease_notification_rules: notificationRules,
    };

    const { error } = await supabase
      .from('units')
      .update(updates)
      .eq('id', unit.id);

    // Also save these rules as the community default for future units
    await supabase
      .from('communities')
      .update({ default_lease_notification_rules: notificationRules })
      .eq('id', community.id);

    setSaving(false);
    if (error) {
      toast.error('Failed to save lease details.');
      return;
    }

    onUnitUpdated({
      ...unit,
      lease_start_date: leaseStart || null,
      lease_expiration_date: leaseExpiration || null,
      lease_notification_rules: notificationRules,
    });
    toast.success('Lease details saved.');
  }

  async function handleUploadLease(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const supabase = createClient();

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${community.id}/household/${unit.id}/lease_${timestamp}_${safeName}`;

    const { error: storageError } = await supabase.storage
      .from('hoa-documents')
      .upload(filePath, file);

    if (storageError) {
      setUploading(false);
      toast.error('Failed to upload lease document.');
      return;
    }

    const { error } = await supabase
      .from('units')
      .update({ lease_document_path: filePath })
      .eq('id', unit.id);

    setUploading(false);
    if (error) {
      toast.error('Failed to save lease path.');
      return;
    }

    onUnitUpdated({ ...unit, lease_document_path: filePath });
    toast.success('Lease document uploaded.');

    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleViewLease() {
    if (!unit.lease_document_path) return;
    const supabase = createClient();
    const { data } = await supabase.storage
      .from('hoa-documents')
      .createSignedUrl(unit.lease_document_path, 60);

    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    } else {
      toast.error('Failed to open lease document.');
    }
  }

  async function handleRemoveLease() {
    if (!unit.lease_document_path) return;
    const supabase = createClient();
    await supabase.storage.from('hoa-documents').remove([unit.lease_document_path]);
    await supabase
      .from('units')
      .update({ lease_document_path: null })
      .eq('id', unit.id);

    onUnitUpdated({ ...unit, lease_document_path: null });
    toast.success('Lease document removed.');
  }

  function addNotificationRule() {
    const days = parseInt(newDaysBefore, 10);
    if (!days || days <= 0) {
      toast.error('Enter a valid number of days.');
      return;
    }
    if (notificationRules.some((r) => r.days_before === days)) {
      toast.error('This notification already exists.');
      return;
    }
    setNotificationRules((prev) =>
      [...prev, { days_before: days }].sort((a, b) => b.days_before - a.days_before)
    );
    setNewDaysBefore('');
  }

  function removeNotificationRule(days: number) {
    setNotificationRules((prev) => prev.filter((r) => r.days_before !== days));
  }

  if (!isBoard) {
    // Residents just see if the unit is marked as leased
    if (!isLeased) return null;

    return (
      <div className="space-y-2">
        <h3 className="text-section-title text-text-primary-light dark:text-text-primary-dark">
          Lease Information
        </h3>
        <p className="text-body text-text-secondary-light dark:text-text-secondary-dark">
          This unit is currently leased.
        </p>
        {unit.lease_expiration_date && (
          <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
            Lease expires: {new Date(unit.lease_expiration_date + 'T00:00:00').toLocaleDateString()}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-section-title text-text-primary-light dark:text-text-primary-dark">
        Lease Management
      </h3>

      {/* Lease toggle */}
      <div className="flex items-center gap-3">
        <Switch
          checked={isLeased}
          onCheckedChange={handleToggleLease}
          disabled={saving}
        />
        <Label className="text-body text-text-primary-light dark:text-text-primary-dark cursor-pointer">
          Unit is being leased
        </Label>
      </div>

      {isLeased && (
        <div className="space-y-4 pl-1">
          {/* Lease document */}
          <div className="space-y-2">
            <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Lease Document
            </Label>
            {unit.lease_document_path ? (
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-text-muted-light dark:text-text-muted-dark" />
                <span className="text-body text-text-primary-light dark:text-text-primary-dark">
                  Lease uploaded
                </span>
                <button
                  onClick={handleViewLease}
                  className="p-1 rounded text-secondary-500 hover:text-secondary-400 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={handleRemoveLease}
                  className="p-1 rounded text-text-muted-light dark:text-text-muted-dark hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleUploadLease}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Upload lease
                </Button>
              </>
            )}
          </div>

          {/* Lease dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Lease start
              </Label>
              <Input
                type="date"
                value={leaseStart}
                onChange={(e) => setLeaseStart(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Lease expiration
              </Label>
              <Input
                type="date"
                value={leaseExpiration}
                onChange={(e) => setLeaseExpiration(e.target.value)}
              />
            </div>
          </div>

          {/* Notification rules */}
          {leaseExpiration && (
            <div className="space-y-2">
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Expiry Notifications
              </Label>
              <div className="space-y-1.5">
                {notificationRules.map((rule) => (
                  <div
                    key={rule.days_before}
                    className="flex items-center gap-2 text-body text-text-primary-light dark:text-text-primary-dark"
                  >
                    <span>{rule.days_before} days before expiry</span>
                    <button
                      onClick={() => removeNotificationRule(rule.days_before)}
                      className="p-0.5 rounded text-text-muted-light dark:text-text-muted-dark hover:text-red-500 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    value={newDaysBefore}
                    onChange={(e) => setNewDaysBefore(e.target.value)}
                    placeholder="Days before"
                    className="w-32"
                  />
                  <Button variant="outline" size="sm" onClick={addNotificationRule}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add
                  </Button>
                </div>
                <p className="text-[10px] text-text-muted-light dark:text-text-muted-dark">
                  These notification preferences will be saved as the default for future leases.
                </p>
              </div>
            </div>
          )}

          <Button onClick={handleSaveDates} disabled={saving} size="sm">
            {saving ? 'Saving...' : 'Save Lease Details'}
          </Button>
        </div>
      )}
    </div>
  );
}
