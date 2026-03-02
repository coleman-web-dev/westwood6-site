'use client';

import { useEffect, useState } from 'react';
import { Wallet } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/shared/ui/button';

interface WalletCardProps {
  unitId: string;
  isBoard: boolean;
  onManageClick: () => void;
  refreshKey: number;
}

export function WalletCard({ unitId, isBoard, onManageClick, refreshKey }: WalletCardProps) {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    async function fetch() {
      const { data } = await supabase
        .from('unit_wallets')
        .select('balance')
        .eq('unit_id', unitId)
        .single();
      setBalance(data?.balance ?? 0);
      setLoading(false);
    }
    fetch();
  }, [unitId, refreshKey]);

  return (
    <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-inner-card bg-primary-100 dark:bg-primary-900">
          <Wallet className="h-5 w-5 text-primary-600 dark:text-primary-400" />
        </div>
        <div className="flex-1">
          <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
            Household Credit
          </p>
          {loading ? (
            <div className="animate-pulse h-8 w-24 rounded bg-muted" />
          ) : (
            <p className="text-metric-xl tabular-nums text-text-primary-light dark:text-text-primary-dark">
              ${((balance ?? 0) / 100).toFixed(2)}
            </p>
          )}
        </div>
      </div>
      {isBoard && (
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full"
          onClick={onManageClick}
        >
          Manage Credit
        </Button>
      )}
    </div>
  );
}
