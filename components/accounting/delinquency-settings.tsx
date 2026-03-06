'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/shared/ui/dialog';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import {
  getDelinquencyRules,
  saveDelinquencyRuleAction,
  deleteDelinquencyRuleAction,
} from '@/lib/actions/accounting-actions';
import type { DelinquencyRule } from '@/lib/types/accounting';
import { toast } from 'sonner';

interface Props {
  communityId: string;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  reminder: { label: 'Reminder', color: 'text-yellow-500 bg-yellow-500/10' },
  late_notice: { label: 'Late Notice', color: 'text-orange-500 bg-orange-500/10' },
  lien_warning: { label: 'Lien Warning', color: 'text-warning-dot bg-warning-dot/10' },
  lien_filed: { label: 'Lien Filed', color: 'text-red-700 bg-red-700/10' },
};

export function DelinquencySettings({ communityId }: Props) {
  const [rules, setRules] = useState<DelinquencyRule[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDelinquencyRules(communityId);
      setRules(data);
    } catch {
      // ignore
    }
    setLoading(false);
  }, [communityId]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(ruleId: string) {
    if (!confirm('Delete this rule?')) return;
    await deleteDelinquencyRuleAction(communityId, ruleId);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-card-title text-text-primary-light dark:text-text-primary-dark">
            Delinquency Automation
          </h3>
          <p className="text-meta text-text-muted-light dark:text-text-muted-dark mt-0.5">
            Automatically send escalating notices for overdue invoices. Runs daily.
          </p>
        </div>
        <RuleDialog communityId={communityId} nextStep={rules.length + 1} onSaved={load} />
      </div>

      <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark">
        {loading ? (
          <div className="p-card-padding animate-pulse h-24 rounded bg-muted" />
        ) : rules.length === 0 ? (
          <div className="p-card-padding text-center">
            <p className="text-body text-text-muted-light dark:text-text-muted-dark">
              No delinquency rules configured.
            </p>
            <p className="text-meta text-text-muted-light dark:text-text-muted-dark mt-1">
              Create rules to automatically send reminders, late notices, and lien warnings.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-stroke-light dark:divide-stroke-dark">
            {rules.map((rule) => {
              const actionStyle = ACTION_LABELS[rule.action_type] || { label: rule.action_type, color: '' };
              return (
                <div key={rule.id} className="p-card-padding flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-body font-medium text-text-primary-light dark:text-text-primary-dark">
                        Step {rule.step_order}
                      </span>
                      <span className={`text-meta px-1.5 py-0.5 rounded ${actionStyle.color}`}>
                        {actionStyle.label}
                      </span>
                      <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
                        after {rule.days_overdue} days overdue
                      </span>
                    </div>
                    <div className="text-meta text-text-secondary-light dark:text-text-secondary-dark mt-1">
                      Subject: {rule.email_subject}
                    </div>
                    {rule.apply_late_fee && rule.late_fee_amount && (
                      <div className="text-meta text-warning-dot mt-0.5">
                        + Late fee: ${(rule.late_fee_amount / 100).toFixed(2)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <RuleDialog
                      communityId={communityId}
                      existing={rule}
                      nextStep={rule.step_order}
                      onSaved={load}
                      trigger={
                        <Button variant="ghost" size="sm">
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      }
                    />
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(rule.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-warning-dot" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light-2 dark:bg-surface-dark-2 p-card-padding">
        <h4 className="text-label text-text-secondary-light dark:text-text-secondary-dark font-medium mb-2">
          Template Variables
        </h4>
        <div className="text-meta text-text-muted-light dark:text-text-muted-dark space-y-0.5">
          <p><code className="bg-surface-light dark:bg-surface-dark px-1 rounded">{'{{homeowner_name}}'}</code> - Homeowner&apos;s full name</p>
          <p><code className="bg-surface-light dark:bg-surface-dark px-1 rounded">{'{{unit_number}}'}</code> - Unit/lot number</p>
          <p><code className="bg-surface-light dark:bg-surface-dark px-1 rounded">{'{{amount_due}}'}</code> - Outstanding balance</p>
          <p><code className="bg-surface-light dark:bg-surface-dark px-1 rounded">{'{{days_overdue}}'}</code> - Number of days past due</p>
        </div>
      </div>
    </div>
  );
}

function RuleDialog({ communityId, existing, nextStep, onSaved, trigger }: {
  communityId: string;
  existing?: DelinquencyRule;
  nextStep: number;
  onSaved: () => void;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [daysOverdue, setDaysOverdue] = useState(existing?.days_overdue?.toString() || '');
  const [actionType, setActionType] = useState<'reminder' | 'late_notice' | 'lien_warning' | 'lien_filed'>(
    (existing?.action_type as 'reminder' | 'late_notice' | 'lien_warning' | 'lien_filed') || 'reminder'
  );
  const [emailSubject, setEmailSubject] = useState(existing?.email_subject || '');
  const [emailBody, setEmailBody] = useState(existing?.email_body || '');
  const [applyLateFee, setApplyLateFee] = useState(existing?.apply_late_fee || false);
  const [lateFeeAmount, setLateFeeAmount] = useState(
    existing?.late_fee_amount ? (existing.late_fee_amount / 100).toString() : ''
  );
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = await saveDelinquencyRuleAction({
      communityId,
      id: existing?.id,
      stepOrder: existing?.step_order || nextStep,
      daysOverdue: parseInt(daysOverdue),
      actionType,
      emailSubject,
      emailBody,
      applyLateFee,
      lateFeeAmount: applyLateFee ? Math.round(parseFloat(lateFeeAmount || '0') * 100) : undefined,
    });
    setSaving(false);

    if (result.success) {
      toast.success(existing ? 'Rule updated' : 'Rule created');
      setOpen(false);
      onSaved();
    } else {
      toast.error(result.error || 'Failed to save rule');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add Rule
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-surface-light dark:bg-surface-dark border-stroke-light dark:border-stroke-dark max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-text-primary-light dark:text-text-primary-dark">
            {existing ? 'Edit' : 'New'} Delinquency Rule
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">Days Overdue</Label>
              <Input type="number" min="1" value={daysOverdue} onChange={(e) => setDaysOverdue(e.target.value)} className="mt-1" required />
            </div>
            <div>
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">Action Type</Label>
              <select value={actionType} onChange={(e) => setActionType(e.target.value as typeof actionType)} className="mt-1 w-full rounded-lg border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark px-3 py-2 text-body text-text-primary-light dark:text-text-primary-dark">
                <option value="reminder">Friendly Reminder</option>
                <option value="late_notice">Late Notice</option>
                <option value="lien_warning">Lien Warning</option>
                <option value="lien_filed">Lien Filed</option>
              </select>
            </div>
          </div>

          <div>
            <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">Email Subject</Label>
            <Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="e.g., Payment Reminder - HOA Dues" className="mt-1" required />
          </div>

          <div>
            <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">Email Body</Label>
            <textarea
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              placeholder={'Dear {{homeowner_name}},\n\nYour HOA dues of {{amount_due}} for unit {{unit_number}} are {{days_overdue}} days past due...'}
              className="mt-1 w-full rounded-lg border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark px-3 py-2 text-body text-text-primary-light dark:text-text-primary-dark h-32 resize-none"
              required
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={applyLateFee}
                onChange={(e) => setApplyLateFee(e.target.checked)}
                className="rounded border-stroke-light dark:border-stroke-dark"
              />
              <span className="text-body text-text-primary-light dark:text-text-primary-dark">
                Apply late fee
              </span>
            </label>
            {applyLateFee && (
              <Input
                type="number"
                step="0.01"
                min="0"
                value={lateFeeAmount}
                onChange={(e) => setLateFeeAmount(e.target.value)}
                placeholder="Amount ($)"
                className="w-32"
              />
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Rule'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
