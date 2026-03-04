'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/shared/ui/alert-dialog';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  createCategorizationRule,
  deleteCategorizationRule,
  toggleCategorizationRule,
} from '@/lib/actions/banking-actions';
import type { CategorizationRuleWithAccount } from '@/lib/types/banking';
import type { Account } from '@/lib/types/accounting';

interface CategorizationRulesManagerProps {
  communityId: string;
}

export function CategorizationRulesManager({ communityId }: CategorizationRulesManagerProps) {
  const [rules, setRules] = useState<CategorizationRuleWithAccount[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Create form state
  const [pattern, setPattern] = useState('');
  const [matchField, setMatchField] = useState('name');
  const [accountId, setAccountId] = useState('');
  const [priority, setPriority] = useState('0');

  const fetchData = useCallback(async () => {
    const supabase = createClient();

    const [{ data: rulesData }, { data: accts }] = await Promise.all([
      supabase
        .from('categorization_rules')
        .select('*, account:accounts!inner(code, name)')
        .eq('community_id', communityId)
        .order('priority', { ascending: false }),
      supabase
        .from('accounts')
        .select('*')
        .eq('community_id', communityId)
        .eq('is_active', true)
        .order('code'),
    ]);

    setRules((rulesData as CategorizationRuleWithAccount[]) || []);
    setAccounts((accts as Account[]) || []);
    setLoading(false);
  }, [communityId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleCreate() {
    if (!pattern.trim() || !accountId) {
      toast.error('Pattern and account are required.');
      return;
    }
    setSaving(true);
    try {
      await createCategorizationRule(
        communityId,
        pattern.toLowerCase().trim(),
        matchField,
        accountId,
        parseInt(priority) || 0,
      );
      toast.success('Rule created.');
      setCreateOpen(false);
      resetForm();
      fetchData();
    } catch {
      toast.error('Failed to create rule.');
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteId) return;
    setSaving(true);
    try {
      await deleteCategorizationRule(communityId, deleteId);
      toast.success('Rule deleted.');
      setDeleteId(null);
      fetchData();
    } catch {
      toast.error('Failed to delete rule.');
    }
    setSaving(false);
  }

  async function handleToggle(ruleId: string, isActive: boolean) {
    try {
      await toggleCategorizationRule(communityId, ruleId, !isActive);
      fetchData();
    } catch {
      toast.error('Failed to update rule.');
    }
  }

  function resetForm() {
    setPattern('');
    setMatchField('name');
    setAccountId('');
    setPriority('0');
  }

  if (loading) {
    return (
      <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
        <div className="animate-pulse h-16 rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-body text-text-secondary-light dark:text-text-secondary-dark">
          {rules.length} rule{rules.length !== 1 ? 's' : ''}
        </p>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Rule
        </Button>
      </div>

      {rules.length === 0 ? (
        <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding text-center py-8">
          <p className="text-body text-text-muted-light dark:text-text-muted-dark">
            No categorization rules yet. Rules are created automatically when you categorize
            transactions with the &quot;Create rule&quot; option, or you can add them manually here.
          </p>
        </div>
      ) : (
        <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark overflow-hidden">
          <div className="px-card-padding py-2 bg-surface-light-2 dark:bg-surface-dark-2 border-b border-stroke-light dark:border-stroke-dark grid grid-cols-[1fr_120px_1fr_60px_60px_40px] gap-3 text-meta text-text-muted-light dark:text-text-muted-dark font-medium">
            <span>Pattern</span>
            <span>Match Field</span>
            <span>Account</span>
            <span className="text-center">Used</span>
            <span className="text-center">Active</span>
            <span />
          </div>

          <div className="divide-y divide-stroke-light dark:divide-stroke-dark">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="px-card-padding py-3 grid grid-cols-[1fr_120px_1fr_60px_60px_40px] gap-3 items-center"
              >
                <span className="text-body text-text-primary-light dark:text-text-primary-dark font-mono">
                  {rule.pattern}
                </span>
                <span className="text-meta text-text-muted-light dark:text-text-muted-dark capitalize">
                  {rule.match_field}
                </span>
                <span className="text-body text-text-primary-light dark:text-text-primary-dark">
                  {rule.account.code} - {rule.account.name}
                </span>
                <span className="text-meta text-text-muted-light dark:text-text-muted-dark text-center tabular-nums">
                  {rule.times_applied}
                </span>
                <div className="text-center">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2"
                    onClick={() => handleToggle(rule.id, rule.is_active)}
                  >
                    <Badge
                      variant={rule.is_active ? 'default' : 'outline'}
                      className="text-meta"
                    >
                      {rule.is_active ? 'On' : 'Off'}
                    </Badge>
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => setDeleteId(rule.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Rule Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Categorization Rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-meta">Pattern (substring match)</Label>
              <Input
                className="mt-1"
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                placeholder="e.g., trugreen, duke energy"
              />
            </div>
            <div>
              <Label className="text-meta">Match against</Label>
              <Select value={matchField} onValueChange={setMatchField}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Transaction Name</SelectItem>
                  <SelectItem value="merchant_name">Merchant Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-meta">Categorize to Account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.code} - {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-meta">Priority (higher = checked first)</Label>
              <Input
                className="mt-1"
                type="number"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                Create Rule
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rule</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this categorization rule. Future transactions will no
              longer be auto-categorized by this pattern.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={saving}>
              {saving ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
