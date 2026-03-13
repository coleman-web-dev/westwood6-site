'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { toast } from 'sonner';
import type { PaymentFrequency, Assessment, Unit } from '@/lib/types/database';
import { generateRemainingInvoicesForUnit } from '@/lib/utils/generate-assessment-invoices';

const FREQUENCY_LABELS: Record<PaymentFrequency, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  semi_annual: 'Semi-Annual',
  annual: 'Annual',
};

interface FrequencySelectorProps {
  onFrequencyChanged?: () => void;
}

export function FrequencySelector({ onFrequencyChanged }: FrequencySelectorProps) {
  const { community, unit, isBoard, canManageHousehold } = useCommunity();
  const [saving, setSaving] = useState(false);

  const paymentSettings = community.theme?.payment_settings;
  const allowFlexible = paymentSettings?.allow_flexible_frequency ?? false;
  const defaultFreq = paymentSettings?.default_frequency ?? 'quarterly';

  // Only show if flexible frequency is enabled
  if (!allowFlexible) return null;

  // Only owner/member roles or board can change (not tenant/minor)
  const canChange = isBoard || canManageHousehold;
  if (!canChange || !unit) return null;

  const currentFrequency = unit.payment_frequency ?? defaultFreq;

  async function handleChange(value: string) {
    if (!unit) return;

    const newFreq = value as PaymentFrequency;
    if (newFreq === currentFrequency) return;

    setSaving(true);
    const supabase = createClient();

    // Update unit preference
    const { error: unitError } = await supabase
      .from('units')
      .update({ payment_frequency: newFreq })
      .eq('id', unit.id);

    if (unitError) {
      setSaving(false);
      toast.error('Failed to update payment frequency.');
      return;
    }

    // Void future pending invoices from assessments and regenerate
    const { data: futureInvoices } = await supabase
      .from('invoices')
      .select('id, assessment_id, amount, status')
      .eq('unit_id', unit.id)
      .not('assessment_id', 'is', null)
      .eq('status', 'pending')
      .gte('due_date', new Date().toISOString().split('T')[0]);

    if (futureInvoices && futureInvoices.length > 0) {
      // Void existing future pending invoices
      const futureIds = futureInvoices.map((inv) => inv.id);
      await supabase
        .from('invoices')
        .update({ status: 'voided', notes: 'Voided: payment frequency changed to ' + FREQUENCY_LABELS[newFreq] })
        .in('id', futureIds);

      // Get active assessments and regenerate invoices
      const assessmentIds = [...new Set(futureInvoices.map((inv) => inv.assessment_id).filter(Boolean))];
      if (assessmentIds.length > 0) {
        const { data: assessments } = await supabase
          .from('assessments')
          .select('*')
          .in('id', assessmentIds)
          .eq('is_active', true);

        if (assessments && assessments.length > 0) {
          const updatedUnit: Unit = { ...unit, payment_frequency: newFreq };

          for (const assessment of assessments as Assessment[]) {
            // Calculate what has already been paid for this assessment
            const { data: paidInvoices } = await supabase
              .from('invoices')
              .select('amount')
              .eq('unit_id', unit.id)
              .eq('assessment_id', assessment.id)
              .eq('status', 'paid');

            const paidAmount = (paidInvoices ?? []).reduce((sum, inv) => sum + inv.amount, 0);
            const newInvoices = generateRemainingInvoicesForUnit(assessment, updatedUnit, newFreq, paidAmount);

            if (newInvoices.length > 0) {
              await supabase.from('invoices').insert(newInvoices);
            }
          }
        }
      }
    }

    setSaving(false);
    toast.success('Payment frequency updated to ' + FREQUENCY_LABELS[newFreq] + '. Future invoices have been adjusted.');
    onFrequencyChanged?.();
  }

  return (
    <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="text-body text-text-primary-light dark:text-text-primary-dark">
            Payment Frequency
          </p>
          <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
            Choose how often you receive assessment invoices
          </p>
        </div>
        <div className="w-44 shrink-0">
          <Select
            value={currentFrequency}
            onValueChange={handleChange}
            disabled={saving}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="semi_annual">Semi-Annual</SelectItem>
              <SelectItem value="annual">Annual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {saving && (
        <p className="text-meta text-text-muted-light dark:text-text-muted-dark mt-2">
          Updating invoices...
        </p>
      )}
    </div>
  );
}
