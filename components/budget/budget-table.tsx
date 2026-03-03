'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/shared/ui/button';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { AddLineItemDialog } from '@/components/budget/add-line-item-dialog';
import type { Budget, BudgetLineItem, BudgetCategory } from '@/lib/types/database';

const CATEGORY_LABELS: Record<BudgetCategory, string> = {
  dues: 'Dues',
  assessments: 'Assessments',
  amenity_fees: 'Amenity Fees',
  interest: 'Interest',
  maintenance: 'Maintenance',
  landscaping: 'Landscaping',
  insurance: 'Insurance',
  utilities: 'Utilities',
  management: 'Management',
  legal: 'Legal',
  reserves: 'Reserves',
  other: 'Other',
};

interface BudgetTableProps {
  budget: Budget;
  lineItems: BudgetLineItem[];
  onUpdated: () => void;
}

export function BudgetTable({ budget, lineItems, onUpdated }: BudgetTableProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const incomeItems = lineItems.filter((i) => i.is_income);
  const expenseItems = lineItems.filter((i) => !i.is_income);

  async function handleDelete(itemId: string) {
    setDeletingId(itemId);
    const supabase = createClient();
    const { error } = await supabase
      .from('budget_line_items')
      .delete()
      .eq('id', itemId);
    setDeletingId(null);

    if (error) {
      toast.error('Failed to delete line item.');
      return;
    }

    toast.success('Line item deleted.');
    onUpdated();
  }

  function renderSection(title: string, items: BudgetLineItem[]) {
    const totalBudgeted = items.reduce((s, i) => s + i.budgeted_amount, 0);
    const totalActual = items.reduce((s, i) => s + i.actual_amount, 0);

    return (
      <div>
        <h3 className="text-section-title text-text-primary-light dark:text-text-primary-dark mb-3">
          {title}
        </h3>
        {items.length === 0 ? (
          <p className="text-meta text-text-muted-light dark:text-text-muted-dark">No items.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-body">
              <thead>
                <tr className="text-left text-meta text-text-muted-light dark:text-text-muted-dark border-b border-stroke-light dark:border-stroke-dark">
                  <th className="pb-2 pr-4">Category</th>
                  <th className="pb-2 pr-4">Name</th>
                  <th className="pb-2 pr-4 text-right">Budgeted</th>
                  <th className="pb-2 pr-4 text-right">Actual</th>
                  <th className="pb-2 pr-4 text-right">Variance</th>
                  <th className="pb-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const variance = item.actual_amount - item.budgeted_amount;
                  return (
                    <tr key={item.id} className="border-b border-stroke-light/50 dark:border-stroke-dark/50">
                      <td className="py-2 pr-4 text-text-secondary-light dark:text-text-secondary-dark">
                        {CATEGORY_LABELS[item.category] || item.category}
                      </td>
                      <td className="py-2 pr-4 text-text-primary-light dark:text-text-primary-dark">
                        {item.name}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        ${(item.budgeted_amount / 100).toFixed(2)}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        ${(item.actual_amount / 100).toFixed(2)}
                      </td>
                      <td className={`py-2 pr-4 text-right tabular-nums ${variance > 0 ? 'text-red-600 dark:text-red-400' : variance < 0 ? 'text-green-600 dark:text-green-400' : ''}`}>
                        {variance === 0 ? '-' : `${variance > 0 ? '+' : ''}$${(variance / 100).toFixed(2)}`}
                      </td>
                      <td className="py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="h-7 w-7 p-0 text-text-muted-light dark:text-text-muted-dark hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                <tr className="font-semibold">
                  <td className="py-2 pr-4" colSpan={2}>Total</td>
                  <td className="py-2 pr-4 text-right tabular-nums">${(totalBudgeted / 100).toFixed(2)}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">${(totalActual / 100).toFixed(2)}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">
                    {(() => {
                      const v = totalActual - totalBudgeted;
                      return v === 0 ? '-' : `${v > 0 ? '+' : ''}$${(v / 100).toFixed(2)}`;
                    })()}
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark rounded-panel p-card-padding space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark">
          Line Items
        </h2>
        <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Item
        </Button>
      </div>

      {renderSection('Income', incomeItems)}
      {renderSection('Expenses', expenseItems)}

      <AddLineItemDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        budgetId={budget.id}
        onCreated={onUpdated}
      />
    </div>
  );
}
