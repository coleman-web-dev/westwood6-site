'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * Tenant-facing account status card.
 * Shows only whether the account is current or past due, no dollar amounts.
 */
export function AccountStatusCard() {
  const { unit } = useCommunity();
  const [status, setStatus] = useState<'loading' | 'current' | 'past_due'>('loading');

  useEffect(() => {
    if (!unit) {
      setStatus('current');
      return;
    }

    let active = true;
    const supabase = createClient();

    async function check() {
      const { data: overdueInvoices } = await supabase
        .from('invoices')
        .select('id')
        .eq('unit_id', unit!.id)
        .in('status', ['overdue', 'partial'])
        .limit(1);

      if (!active) return;
      setStatus(overdueInvoices && overdueInvoices.length > 0 ? 'past_due' : 'current');
    }

    check();
    return () => { active = false; };
  }, [unit]);

  if (status === 'loading') {
    return (
      <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
        <div className="animate-pulse h-8 w-40 rounded bg-muted" />
      </div>
    );
  }

  const isCurrent = status === 'current';

  return (
    <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
      <p className="text-meta text-text-muted-light dark:text-text-muted-dark mb-3">
        Account Status
      </p>
      <div className="flex items-center gap-3">
        {isCurrent ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
        )}
        <div>
          <p className="text-section-title text-text-primary-light dark:text-text-primary-dark">
            {isCurrent ? 'Good Standing' : 'Past Due'}
          </p>
          <p className="text-meta text-text-secondary-light dark:text-text-secondary-dark mt-0.5">
            {isCurrent
              ? 'All assessments are current.'
              : 'This account has overdue assessments. Please contact the property owner.'}
          </p>
        </div>
      </div>
    </div>
  );
}
