'use client';

import { useState } from 'react';
import { Button } from '@/components/shared/ui/button';
import { useCommunity } from '@/lib/providers/community-provider';
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
import { toast } from 'sonner';

export function BillingDatePicker() {
  const { community } = useCommunity();

  const [billingDay, setBillingDay] = useState('1');
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleUpdate() {
    setShowConfirm(false);
    setLoading(true);

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
        toast.error(data?.error || 'Failed to update billing date');
        return;
      }

      const data = await res.json();
      const date = new Date(data.nextBillingDate);
      toast.success(
        `Billing date updated. Your next charge will be ${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`
      );
    } catch {
      toast.error('Failed to update billing date');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <Calendar className="h-4 w-4 text-text-muted-light dark:text-text-muted-dark" />
        <span className="text-meta text-text-secondary-light dark:text-text-secondary-dark">
          Bill on the
        </span>
        <div className="w-24">
          <Select value={billingDay} onValueChange={setBillingDay}>
            <SelectTrigger className="h-8 text-meta">
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
        <span className="text-meta text-text-secondary-light dark:text-text-secondary-dark">
          of each month
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowConfirm(true)}
          disabled={loading}
        >
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Change
        </Button>
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change billing date?</AlertDialogTitle>
            <AlertDialogDescription>
              Your auto-pay will be updated to charge on the {ordinal(Number(billingDay))} of
              each month. No charges will occur between now and the next {ordinal(Number(billingDay))}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUpdate}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
