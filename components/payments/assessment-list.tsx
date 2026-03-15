'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import { toast } from 'sonner';
import { logAuditEvent } from '@/lib/audit';
import { generateInvoicesForAssessment } from '@/lib/utils/generate-assessment-invoices';
import { applyWalletToInvoiceBatch } from '@/lib/utils/apply-wallet-to-invoices';
import type { Assessment, Unit, PaymentFrequency } from '@/lib/types/database';

interface AssessmentListProps {
  assessments: Assessment[];
  loading: boolean;
  onAssessmentUpdated: () => void;
}

export function AssessmentList({ assessments, loading, onAssessmentUpdated }: AssessmentListProps) {
  const { community, member } = useCommunity();
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function handleGenerateInvoices(assessment: Assessment) {
    setGeneratingId(assessment.id);
    const supabase = createClient();

    // Fetch active units
    const { data: unitData } = await supabase
      .from('units')
      .select('*')
      .eq('community_id', community.id)
      .eq('status', 'active');

    const units = (unitData as Unit[]) ?? [];

    if (units.length === 0) {
      toast.error('No active units found.');
      setGeneratingId(null);
      return;
    }

    const defaultFreq = (community.theme?.payment_settings?.default_frequency ?? 'quarterly') as PaymentFrequency;
    const invoices = generateInvoicesForAssessment(assessment, units, defaultFreq);

    if (invoices.length === 0) {
      toast.error('No invoices to generate for this assessment period.');
      setGeneratingId(null);
      return;
    }

    const { data: inserted, error } = await supabase
      .from('invoices')
      .insert(invoices)
      .select('id, amount, unit_id, title');

    if (error || !inserted) {
      setGeneratingId(null);
      toast.error('Failed to generate invoices. Please try again.');
      return;
    }

    // Auto-apply wallet balances to new invoices
    const walletResult = await applyWalletToInvoiceBatch(
      supabase,
      inserted as { id: string; amount: number; unit_id: string; title: string }[],
      community.id,
      member?.id ?? null
    );

    setGeneratingId(null);

    logAuditEvent({
      communityId: community.id,
      actorId: member?.user_id,
      actorEmail: member?.email,
      action: 'invoices_generated',
      targetType: 'assessment',
      targetId: assessment.id,
      metadata: { title: assessment.title, invoice_count: invoices.length, unit_count: units.length },
    });

    if (walletResult.totalApplied > 0) {
      const appliedDollars = (walletResult.totalApplied / 100).toFixed(2);
      toast.success(
        `${invoices.length} invoices generated for ${units.length} units. $${appliedDollars} applied from wallet credits (${walletResult.unitsAffected} unit${walletResult.unitsAffected !== 1 ? 's' : ''}).`
      );
    } else {
      toast.success(`${invoices.length} invoices generated for ${units.length} units.`);
    }
    onAssessmentUpdated();
  }

  async function handleToggleActive(assessment: Assessment) {
    setTogglingId(assessment.id);
    const supabase = createClient();

    const { error } = await supabase
      .from('assessments')
      .update({ is_active: !assessment.is_active })
      .eq('id', assessment.id);

    setTogglingId(null);

    if (error) {
      toast.error('Failed to update assessment. Please try again.');
      return;
    }

    logAuditEvent({
      communityId: community.id,
      actorId: member?.user_id,
      actorEmail: member?.email,
      action: assessment.is_active ? 'assessment_deactivated' : 'assessment_activated',
      targetType: 'assessment',
      targetId: assessment.id,
      metadata: { title: assessment.title },
    });
    toast.success(assessment.is_active ? 'Assessment deactivated.' : 'Assessment activated.');
    onAssessmentUpdated();
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding space-y-3"
          >
            <div className="animate-pulse h-5 w-2/3 rounded bg-muted" />
            <div className="animate-pulse h-4 w-1/3 rounded bg-muted" />
            <div className="animate-pulse h-4 w-1/4 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (assessments.length === 0) {
    return (
      <p className="text-body text-text-muted-light dark:text-text-muted-dark">
        No assessments created yet. Create one to start generating invoices.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {assessments.map((assessment) => {
        const isGenerating = generatingId === assessment.id;
        const isToggling = togglingId === assessment.id;
        const startDate = new Date(assessment.fiscal_year_start + 'T00:00:00');
        const endDate = new Date(assessment.fiscal_year_end + 'T00:00:00');

        return (
          <div
            key={assessment.id}
            className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-card-title text-text-primary-light dark:text-text-primary-dark">
                    {assessment.title}
                  </h3>
                  <Badge variant={assessment.is_active ? 'secondary' : 'outline'}>
                    {assessment.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <Badge variant={assessment.type === 'special' ? 'default' : 'outline'}
                    className={assessment.type === 'special' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' : ''}>
                    {assessment.type === 'special' ? 'Special' : 'Regular'}
                  </Badge>
                </div>

                {assessment.description && (
                  <p className="text-body text-text-secondary-light dark:text-text-secondary-dark mt-1">
                    {assessment.description}
                  </p>
                )}

                {assessment.type === 'special' && assessment.installments && assessment.installment_start_date ? (
                  <p className="text-meta text-text-muted-light dark:text-text-muted-dark mt-2">
                    {assessment.installments === 1
                      ? `Lump sum due ${new Date(assessment.installment_start_date + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}`
                      : `${assessment.installments} monthly installments starting ${new Date(assessment.installment_start_date + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}`}
                  </p>
                ) : (
                  <p className="text-meta text-text-muted-light dark:text-text-muted-dark mt-2">
                    {startDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    {' - '}
                    {endDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                )}
              </div>

              <div className="text-right shrink-0">
                <p className="text-metric-l tabular-nums text-text-primary-light dark:text-text-primary-dark">
                  ${(assessment.annual_amount / 100).toFixed(2)}
                </p>
                <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                  {assessment.type === 'special' ? 'total' : 'per year'}
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-3 pt-3 border-t border-stroke-light dark:border-stroke-dark">
              {assessment.is_active && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleGenerateInvoices(assessment)}
                  disabled={isGenerating}
                >
                  {isGenerating ? 'Generating...' : 'Generate Invoices'}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggleActive(assessment)}
                disabled={isToggling}
                className={assessment.is_active ? 'text-destructive hover:text-destructive' : ''}
              >
                {isToggling
                  ? 'Updating...'
                  : assessment.is_active
                    ? 'Deactivate'
                    : 'Activate'}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
