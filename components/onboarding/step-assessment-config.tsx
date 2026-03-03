'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { toast } from 'sonner';
import type { Assessment, Unit, PaymentFrequency } from '@/lib/types/database';
import {
  getPeriods,
  generateInvoicesForAssessment,
} from '@/lib/utils/generate-assessment-invoices';

export function StepAssessmentConfig({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const { community } = useCommunity();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    annual_amount: '',
    fiscal_year_start: '',
    fiscal_year_end: '',
    frequency: 'monthly' as PaymentFrequency,
  });

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const previewPeriods = useMemo(() => {
    if (!form.fiscal_year_start || !form.fiscal_year_end) return [];
    try {
      return getPeriods(
        form.frequency,
        form.fiscal_year_start,
        form.fiscal_year_end,
      );
    } catch {
      return [];
    }
  }, [form.frequency, form.fiscal_year_start, form.fiscal_year_end]);

  const perPeriodAmount = useMemo(() => {
    const annualCents = Math.round(parseFloat(form.annual_amount || '0') * 100);
    if (previewPeriods.length === 0 || annualCents <= 0) return 0;
    return annualCents / previewPeriods.length / 100;
  }, [form.annual_amount, previewPeriods]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.title.trim()) {
      toast.error('Assessment title is required.');
      return;
    }

    const annualDollars = parseFloat(form.annual_amount);
    if (!annualDollars || annualDollars <= 0) {
      toast.error('Please enter a valid annual amount.');
      return;
    }

    if (!form.fiscal_year_start || !form.fiscal_year_end) {
      toast.error('Fiscal year start and end dates are required.');
      return;
    }

    if (form.fiscal_year_start >= form.fiscal_year_end) {
      toast.error('Fiscal year end must be after the start date.');
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const annualAmountCents = Math.round(annualDollars * 100);

      // 1. Insert the assessment
      const { data: assessment, error: assessmentError } = await supabase
        .from('assessments')
        .insert({
          community_id: community.id,
          title: form.title.trim(),
          annual_amount: annualAmountCents,
          fiscal_year_start: form.fiscal_year_start,
          fiscal_year_end: form.fiscal_year_end,
          is_active: true,
        })
        .select()
        .single();

      if (assessmentError || !assessment) {
        toast.error(
          'Failed to create assessment: ' +
            (assessmentError?.message || 'Unknown error'),
        );
        return;
      }

      // 2. Fetch all units for the community
      const { data: units, error: unitsError } = await supabase
        .from('units')
        .select('*')
        .eq('community_id', community.id)
        .eq('status', 'active');

      if (unitsError) {
        toast.error('Failed to fetch units: ' + unitsError.message);
        return;
      }

      if (!units || units.length === 0) {
        toast.success(
          'Assessment created. No active units found, so no invoices were generated.',
        );
        onNext();
        return;
      }

      // 3. Generate invoice rows
      const typedAssessment: Assessment = assessment;
      const typedUnits: Unit[] = units;
      const invoiceRows = generateInvoicesForAssessment(
        typedAssessment,
        typedUnits,
        form.frequency,
      );

      if (invoiceRows.length === 0) {
        toast.success(
          'Assessment created but no invoice periods fall within the fiscal year.',
        );
        onNext();
        return;
      }

      // 4. Bulk insert invoices
      const { error: invoiceError } = await supabase
        .from('invoices')
        .insert(invoiceRows);

      if (invoiceError) {
        toast.error('Failed to generate invoices: ' + invoiceError.message);
        return;
      }

      toast.success(
        `Assessment created with ${invoiceRows.length} invoices across ${units.length} units.`,
      );
      onNext();
    } catch (err) {
      console.error('Error creating assessment:', err);
      toast.error('An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark rounded-panel p-card-padding">
      <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark mb-1">
        Assessment Configuration
      </h2>
      <p className="text-body text-text-secondary-light dark:text-text-secondary-dark mb-6">
        Set up your community&apos;s annual assessment. This will automatically
        generate invoices for all active units based on the selected payment
        frequency.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label
            htmlFor="assessment-title"
            className="text-label text-text-secondary-light dark:text-text-secondary-dark"
          >
            Assessment Title *
          </Label>
          <Input
            id="assessment-title"
            value={form.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="e.g. 2026 Annual HOA Dues"
            required
          />
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="annual-amount"
            className="text-label text-text-secondary-light dark:text-text-secondary-dark"
          >
            Annual Amount (USD) *
          </Label>
          <Input
            id="annual-amount"
            type="number"
            min="0"
            step="0.01"
            value={form.annual_amount}
            onChange={(e) => handleChange('annual_amount', e.target.value)}
            placeholder="e.g. 1200.00"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label
              htmlFor="fiscal-start"
              className="text-label text-text-secondary-light dark:text-text-secondary-dark"
            >
              Fiscal Year Start *
            </Label>
            <Input
              id="fiscal-start"
              type="date"
              value={form.fiscal_year_start}
              onChange={(e) =>
                handleChange('fiscal_year_start', e.target.value)
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="fiscal-end"
              className="text-label text-text-secondary-light dark:text-text-secondary-dark"
            >
              Fiscal Year End *
            </Label>
            <Input
              id="fiscal-end"
              type="date"
              value={form.fiscal_year_end}
              onChange={(e) => handleChange('fiscal_year_end', e.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="frequency"
            className="text-label text-text-secondary-light dark:text-text-secondary-dark"
          >
            Payment Frequency *
          </Label>
          <Select
            value={form.frequency}
            onValueChange={(val) =>
              handleChange('frequency', val as PaymentFrequency)
            }
          >
            <SelectTrigger id="frequency">
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="semi_annual">Semi-Annual</SelectItem>
              <SelectItem value="annual">Annual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {previewPeriods.length > 0 && form.annual_amount && (
          <div className="rounded-md border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-3">
            <p className="text-label text-text-secondary-light dark:text-text-secondary-dark mb-1">
              Invoice Preview
            </p>
            <p className="text-body text-text-primary-light dark:text-text-primary-dark">
              <span className="font-semibold">{previewPeriods.length}</span>{' '}
              invoice{previewPeriods.length !== 1 ? 's' : ''} will be generated
              per unit at approximately{' '}
              <span className="font-semibold">
                ${perPeriodAmount.toFixed(2)}
              </span>{' '}
              each.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {previewPeriods.map((p, i) => (
                <span
                  key={i}
                  className="inline-block rounded bg-primary-100 dark:bg-primary-900/30 px-2 py-0.5 text-meta text-text-primary-light dark:text-text-primary-dark"
                >
                  {p.label}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between pt-4">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>

          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onNext}>
              Skip
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Creating...' : 'Create Assessment & Continue'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
