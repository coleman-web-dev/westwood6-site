'use client';

import { useState } from 'react';
import { Button } from '@/components/shared/ui/button';
import { useCommunity } from '@/lib/providers/community-provider';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
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
import { Calendar, Loader2 } from 'lucide-react';

interface SubscriptionInfo {
  total: number;
}

export function BillingAnchorSection() {
  const { community, isBoard } = useCommunity();

  const [billingDay, setBillingDay] = useState('1');
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [result, setResult] = useState<{ updated: number; skipped: number; errors: string[] } | null>(null);

  async function loadSubscriptionInfo() {
    if (!community) return;
    setLoadingInfo(true);

    const supabase = createClient();
    const { count } = await supabase
      .from('units')
      .select('id', { count: 'exact', head: true })
      .eq('community_id', community.id)
      .not('stripe_subscription_id', 'is', null);

    setSubInfo({ total: count ?? 0 });
    setLoadingInfo(false);
  }

  async function handleUpdate() {
    if (!community) return;
    setShowConfirm(false);
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/stripe/update-billing-anchor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          communityId: community.id,
          billingDay: Number(billingDay),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || 'Failed to update billing anchor');
        return;
      }

      const data = await res.json();
      setResult(data);

      if (data.errors?.length > 0) {
        toast.warning(`Updated ${data.updated} subscriptions with ${data.errors.length} errors.`);
      } else {
        toast.success(`Updated ${data.updated} subscriptions to bill on the ${ordinal(Number(billingDay))}.`);
      }
    } catch {
      toast.error('Failed to update billing anchor');
    } finally {
      setLoading(false);
    }
  }

  if (!isBoard) return null;

  return (
    <div className="bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark rounded-panel p-card-padding space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Calendar className="h-5 w-5 text-secondary-500" />
        <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark">
          Auto-Pay Billing Date
        </h2>
      </div>
      <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
        Change the day of month when auto-pay subscriptions are billed.
        This sets a trial period on each subscription that ends on the chosen day,
        resetting the billing anchor without requiring homeowners to re-enroll.
      </p>

      <div className="flex items-end gap-4">
        <div className="space-y-1.5">
          <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
            Billing day of month
          </label>
          <div className="w-32">
            <Select value={billingDay} onValueChange={setBillingDay}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                  <SelectItem key={day} value={String(day)}>
                    {ordinal(day)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={async () => {
            await loadSubscriptionInfo();
            setShowConfirm(true);
          }}
          disabled={loading || loadingInfo}
          size="sm"
        >
          {(loading || loadingInfo) && (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          )}
          Update All Subscriptions
        </Button>
      </div>

      {result && (
        <div className="rounded-inner-card border border-stroke-light dark:border-stroke-dark p-3 space-y-1">
          <p className="text-body text-text-primary-light dark:text-text-primary-dark">
            {result.updated} subscription{result.updated !== 1 ? 's' : ''} updated
            {result.skipped > 0 && `, ${result.skipped} skipped`}
          </p>
          {result.errors.length > 0 && (
            <div className="space-y-0.5">
              <p className="text-label text-warning-dot font-medium">Errors:</p>
              {result.errors.map((err, i) => (
                <p key={i} className="text-meta text-text-muted-light dark:text-text-muted-dark">
                  {err}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change billing date?</AlertDialogTitle>
            <AlertDialogDescription>
              This will update {subInfo?.total ?? 0} active subscription{(subInfo?.total ?? 0) !== 1 ? 's' : ''} to
              bill on the {ordinal(Number(billingDay))} of each month. A trial period will be set on each
              subscription until the next {ordinal(Number(billingDay))}, during which no automatic charges will occur.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUpdate}>
              Update {subInfo?.total ?? 0} Subscription{(subInfo?.total ?? 0) !== 1 ? 's' : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
