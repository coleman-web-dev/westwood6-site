'use client';

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { PiggyBank } from 'lucide-react';
import { BudgetOverview } from '@/components/budget/budget-overview';
import { BudgetTable } from '@/components/budget/budget-table';
import { CreateBudgetDialog } from '@/components/budget/create-budget-dialog';
import { ReserveFundCard } from '@/components/budget/reserve-fund-card';
import type { Budget, BudgetLineItem } from '@/lib/types/database';

export default function BudgetPage() {
  const { isBoard, community, member } = useCommunity();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [lineItems, setLineItems] = useState<BudgetLineItem[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const fetchBudgets = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('budgets')
      .select('*')
      .eq('community_id', community.id)
      .order('fiscal_year', { ascending: false });

    const list = (data as Budget[]) || [];
    setBudgets(list);

    if (list.length > 0 && !selectedYear) {
      setSelectedYear(String(list[0].fiscal_year));
    }
    setLoading(false);
  }, [community.id, selectedYear]);

  const fetchLineItems = useCallback(async () => {
    if (!selectedYear) return;
    const budget = budgets.find((b) => String(b.fiscal_year) === selectedYear);
    if (!budget) { setLineItems([]); return; }

    const supabase = createClient();
    const { data } = await supabase
      .from('budget_line_items')
      .select('*')
      .eq('budget_id', budget.id)
      .order('is_income', { ascending: false })
      .order('category');

    setLineItems((data as BudgetLineItem[]) || []);
  }, [selectedYear, budgets]);

  useEffect(() => { fetchBudgets(); }, [fetchBudgets]);
  useEffect(() => { fetchLineItems(); }, [fetchLineItems]);

  if (!isBoard) {
    return (
      <div className="space-y-6">
        <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">Budget</h1>
        <p className="text-body text-text-muted-light dark:text-text-muted-dark">
          Budget information is only available to board members.
        </p>
      </div>
    );
  }

  const selectedBudget = budgets.find((b) => String(b.fiscal_year) === selectedYear) || null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PiggyBank className="h-6 w-6 text-text-primary-light dark:text-text-primary-dark" />
          <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">
            Budget & Reserves
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {budgets.length > 0 && (
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Fiscal Year" />
              </SelectTrigger>
              <SelectContent>
                {budgets.map((b) => (
                  <SelectItem key={b.fiscal_year} value={String(b.fiscal_year)}>
                    FY {b.fiscal_year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button onClick={() => setCreateOpen(true)}>New Budget</Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
              <div className="animate-pulse h-20 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <div className="bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark rounded-panel p-card-padding">
          <p className="text-body text-text-muted-light dark:text-text-muted-dark">
            No budgets created yet. Create your first budget to start tracking income, expenses, and reserves.
          </p>
        </div>
      ) : selectedBudget ? (
        <>
          <BudgetOverview budget={selectedBudget} lineItems={lineItems} />
          <BudgetTable
            budget={selectedBudget}
            lineItems={lineItems}
            onUpdated={fetchLineItems}
          />
          <ReserveFundCard budgets={budgets} />
        </>
      ) : null}

      <CreateBudgetDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        communityId={community.id}
        memberId={member?.id || null}
        existingYears={budgets.map((b) => b.fiscal_year)}
        onCreated={() => {
          fetchBudgets();
          setCreateOpen(false);
        }}
      />
    </div>
  );
}
