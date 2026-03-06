'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Badge } from '@/components/shared/ui/badge';
import { Switch } from '@/components/shared/ui/switch';
import { Loader2, Plus, Settings, Hash, PenLine } from 'lucide-react';
import { toast } from 'sonner';
import {
  getCheckSettings,
  updateCheckSettings,
  getCheckSequences,
  createCheckSequence,
  updateCheckSequence,
  getSignatures,
} from '@/lib/actions/check-actions';
import { SignatureUpload } from './signature-upload';
import { useCommunity } from '@/lib/providers/community-provider';
import type { CheckSettings, CheckNumberSequence } from '@/lib/types/check';

interface CheckSettingsProps {
  communityId: string;
}

interface MemberOption {
  id: string;
  name: string;
  email: string | null;
  system_role: string;
}

export function CheckSettingsPanel({ communityId }: CheckSettingsProps) {
  const { member } = useCommunity();
  const [settings, setSettings] = useState<CheckSettings>({
    signatures_required: 1,
    designated_signers: [],
    auto_approve_under: null,
  });
  const [sequences, setSequences] = useState<CheckNumberSequence[]>([]);
  const [boardMembers, setBoardMembers] = useState<MemberOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showNewSequence, setShowNewSequence] = useState(false);
  const [newSeqLabel, setNewSeqLabel] = useState('');
  const [newSeqStart, setNewSeqStart] = useState('1001');
  const [newSeqPrefix, setNewSeqPrefix] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const [settingsData, seqData, membersRes] = await Promise.all([
      getCheckSettings(communityId),
      getCheckSequences(communityId),
      supabase
        .from('members')
        .select('id, name, email, system_role')
        .eq('community_id', communityId)
        .in('system_role', ['board', 'manager', 'super_admin']),
    ]);

    setSettings(settingsData);
    setSequences(seqData as CheckNumberSequence[]);
    setBoardMembers((membersRes.data as MemberOption[]) || []);
    setLoading(false);
  }, [communityId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSaveSettings() {
    setSaving(true);
    const result = await updateCheckSettings(communityId, settings);
    setSaving(false);

    if (result.success) {
      toast.success('Check settings saved.');
    } else {
      toast.error(result.error || 'Failed to save settings.');
    }
  }

  async function handleCreateSequence() {
    if (!newSeqLabel.trim()) {
      toast.error('Please enter a label for the check sequence.');
      return;
    }

    const result = await createCheckSequence({
      communityId,
      bankAccountLabel: newSeqLabel,
      startingNumber: parseInt(newSeqStart) || 1001,
      prefix: newSeqPrefix || undefined,
    });

    if (result.success) {
      toast.success('Check sequence created.');
      setShowNewSequence(false);
      setNewSeqLabel('');
      setNewSeqStart('1001');
      setNewSeqPrefix('');
      fetchData();
    } else {
      toast.error(result.error || 'Failed to create sequence.');
    }
  }

  async function handleUpdateSequenceNumber(seqId: string, newNumber: string) {
    const num = parseInt(newNumber);
    if (isNaN(num) || num < 1) return;

    const result = await updateCheckSequence({
      communityId,
      sequenceId: seqId,
      nextCheckNumber: num,
    });

    if (result.success) {
      toast.success('Check sequence updated.');
      fetchData();
    } else {
      toast.error('Failed to update sequence.');
    }
  }

  function toggleSigner(memberId: string) {
    setSettings((prev) => ({
      ...prev,
      designated_signers: prev.designated_signers.includes(memberId)
        ? prev.designated_signers.filter((id) => id !== memberId)
        : [...prev.designated_signers, memberId],
    }));
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse h-32 rounded-panel bg-muted" />
        <div className="animate-pulse h-32 rounded-panel bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Check Number Sequences */}
      <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-text-muted-light dark:text-text-muted-dark" />
            <h3 className="text-section-title text-text-primary-light dark:text-text-primary-dark">
              Check Number Sequences
            </h3>
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowNewSequence(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Sequence
          </Button>
        </div>

        {sequences.length === 0 && !showNewSequence && (
          <p className="text-body text-text-muted-light dark:text-text-muted-dark">
            No check sequences configured. Add one to start writing checks.
          </p>
        )}

        {sequences.map((seq) => (
          <div
            key={seq.id}
            className="flex items-center gap-3 py-2 px-3 rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2"
          >
            <div className="flex-1">
              <div className="text-body font-medium text-text-primary-light dark:text-text-primary-dark">
                {seq.bank_account_label}
              </div>
              {seq.prefix && (
                <div className="text-meta text-text-muted-light dark:text-text-muted-dark">
                  Prefix: {seq.prefix}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-meta shrink-0">Next #</Label>
              <Input
                type="number"
                className="w-24 h-8 text-meta"
                defaultValue={seq.next_check_number}
                onBlur={(e) => handleUpdateSequenceNumber(seq.id, e.target.value)}
              />
            </div>
          </div>
        ))}

        {showNewSequence && (
          <div className="space-y-3 p-3 rounded-inner-card border border-stroke-light dark:border-stroke-dark">
            <div className="space-y-2">
              <Label className="text-meta">Account Label</Label>
              <Input
                value={newSeqLabel}
                onChange={(e) => setNewSeqLabel(e.target.value)}
                placeholder="e.g. Operating Account"
                className="h-8 text-body"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-meta">Starting Number</Label>
                <Input
                  type="number"
                  value={newSeqStart}
                  onChange={(e) => setNewSeqStart(e.target.value)}
                  className="h-8 text-body"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-meta">Prefix (optional)</Label>
                <Input
                  value={newSeqPrefix}
                  onChange={(e) => setNewSeqPrefix(e.target.value)}
                  placeholder="e.g. WC6-"
                  className="h-8 text-body"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setShowNewSequence(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleCreateSequence}>
                Create
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Approval Settings */}
      <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding space-y-4">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-text-muted-light dark:text-text-muted-dark" />
          <h3 className="text-section-title text-text-primary-light dark:text-text-primary-dark">
            Approval Settings
          </h3>
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-meta">Signatures Required</Label>
            <div className="flex items-center gap-3">
              {[1, 2, 3].map((n) => (
                <Button
                  key={n}
                  size="sm"
                  variant={settings.signatures_required === n ? 'default' : 'outline'}
                  onClick={() => setSettings((prev) => ({ ...prev, signatures_required: n }))}
                  className="w-10"
                >
                  {n}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-meta">Designated Signers</Label>
            <div className="space-y-1.5">
              {boardMembers.map((bm) => (
                <label
                  key={bm.id}
                  className="flex items-center gap-2 py-1.5 px-3 rounded-lg hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 cursor-pointer"
                >
                  <Switch
                    checked={settings.designated_signers.includes(bm.id)}
                    onCheckedChange={() => toggleSigner(bm.id)}
                  />
                  <span className="text-body text-text-primary-light dark:text-text-primary-dark flex-1">
                    {bm.name || bm.email}
                  </span>
                  <Badge variant="outline" className="text-meta">
                    {bm.system_role}
                  </Badge>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 space-y-2">
              <Label className="text-meta">Auto-approve checks under ($)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={settings.auto_approve_under !== null ? (settings.auto_approve_under / 100).toString() : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setSettings((prev) => ({
                    ...prev,
                    auto_approve_under: val ? Math.round(parseFloat(val) * 100) : null,
                  }));
                }}
                placeholder="No threshold"
                className="h-8 text-body max-w-[160px]"
              />
            </div>
          </div>

          <Button size="sm" onClick={handleSaveSettings} disabled={saving}>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
            Save Settings
          </Button>
        </div>
      </div>

      {/* Signatures */}
      <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding space-y-4">
        <div className="flex items-center gap-2">
          <PenLine className="h-4 w-4 text-text-muted-light dark:text-text-muted-dark" />
          <h3 className="text-section-title text-text-primary-light dark:text-text-primary-dark">
            Signatures
          </h3>
        </div>

        <p className="text-body text-text-secondary-light dark:text-text-secondary-dark">
          Upload signatures for board members who are designated signers. Signatures will appear on printed checks.
        </p>

        <div className="space-y-3">
          {settings.designated_signers.length > 0 ? (
            settings.designated_signers.map((signerId) => {
              const bm = boardMembers.find((m) => m.id === signerId);
              if (!bm) return null;
              return (
                <SignatureUpload
                  key={signerId}
                  communityId={communityId}
                  memberId={signerId}
                  memberName={bm.name || bm.email || 'Board Member'}
                />
              );
            })
          ) : (
            <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
              Select designated signers above to upload signatures.
            </p>
          )}

          {/* Current user's signature if they're a board member */}
          {member && !settings.designated_signers.includes(member.id) && (
            <SignatureUpload
              communityId={communityId}
              memberId={member.id}
              memberName="Your Signature"
            />
          )}
        </div>
      </div>
    </div>
  );
}
