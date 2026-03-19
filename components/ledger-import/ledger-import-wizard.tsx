'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { cn } from '@/lib/utils';

import { StepUpload } from './step-upload';
import { StepMapColumns } from './step-map-columns';
import { StepMatchUnits } from './step-match-units';
import { StepReview, type ImportConfig } from './step-review';
import { StepExecute } from './step-execute';

import {
  type ParsedLedgerRow,
  type ColumnMapping,
  type MatchedRow,
  type UnitRecord,
  type MemberRecord,
  autoMapLedgerColumns,
  matchRowsToUnits,
  getDistinctAmounts,
  buildDefaultChargeTypeMap,
  LEDGER_FIELDS,
} from '@/lib/utils/ledger-import';

interface LedgerImportWizardProps {
  onComplete?: () => void;
  onSkip?: () => void;
  showSkip?: boolean;
}

const STEPS = [
  { key: 'upload', label: 'Upload' },
  { key: 'map', label: 'Map Columns' },
  { key: 'match', label: 'Match Units' },
  { key: 'review', label: 'Review' },
  { key: 'import', label: 'Import' },
] as const;

type StepKey = (typeof STEPS)[number]['key'];

export function LedgerImportWizard({ onComplete, onSkip, showSkip = false }: LedgerImportWizardProps) {
  const { community } = useCommunity();
  const [currentStep, setCurrentStep] = useState<StepKey>('upload');
  const [completedSteps, setCompletedSteps] = useState<Set<StepKey>>(new Set());

  // Step 1 state
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedLedgerRow[]>([]);
  const [fileName, setFileName] = useState('');

  // Step 2 state
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});

  // Step 3 state
  const [matchedRows, setMatchedRows] = useState<MatchedRow[]>([]);
  const [units, setUnits] = useState<UnitRecord[]>([]);
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [skipUnmatched, setSkipUnmatched] = useState(true);

  // Step 4 state
  const [config, setConfig] = useState<ImportConfig>({
    assessmentId: null,
    serviceFeeHandling: 'auto_detect',
    postGlEntries: true,
    chargeTypeMap: {},
  });
  const [assessments, setAssessments] = useState<{ id: string; title: string }[]>([]);

  // Load units and members for matching
  useEffect(() => {
    const supabase = createClient();

    supabase
      .from('units')
      .select('id, unit_number, address')
      .eq('community_id', community.id)
      .eq('status', 'active')
      .order('unit_number', { ascending: true })
      .then(({ data }) => setUnits((data as UnitRecord[]) || []));

    supabase
      .from('members')
      .select('id, unit_id, first_name, last_name')
      .eq('community_id', community.id)
      .eq('is_approved', true)
      .then(({ data }) => setMembers((data as MemberRecord[]) || []));

    supabase
      .from('assessments')
      .select('id, title')
      .eq('community_id', community.id)
      .eq('is_active', true)
      .order('fiscal_year_start', { ascending: false })
      .then(({ data }) => setAssessments(data || []));
  }, [community.id]);

  // Step 1 handler
  const handleParsed = useCallback(
    (h: string[], r: ParsedLedgerRow[], fn: string) => {
      setHeaders(h);
      setRows(r);
      setFileName(fn);
      // Auto-map columns
      const mapping = autoMapLedgerColumns(h);
      setColumnMapping(mapping);
    },
    [],
  );

  // Check if column mapping is valid (all required fields mapped)
  const mappingValid = useMemo(() => {
    const usedFields = new Set(Object.values(columnMapping).filter(Boolean));
    return LEDGER_FIELDS.filter((f) => f.required).every((f) => usedFields.has(f.key));
  }, [columnMapping]);

  // Run matching when entering step 3
  const runMatching = useCallback(() => {
    const matched = matchRowsToUnits(rows, columnMapping, units, members);
    setMatchedRows(matched);
  }, [rows, columnMapping, units, members]);

  // Check if chargeType column is mapped
  const hasChargeTypeColumn = useMemo(
    () => Object.values(columnMapping).includes('chargeType'),
    [columnMapping],
  );

  // Step navigation
  function goNext() {
    const stepIndex = STEPS.findIndex((s) => s.key === currentStep);
    if (stepIndex < STEPS.length - 1) {
      setCompletedSteps((prev) => new Set([...prev, currentStep]));
      const nextStep = STEPS[stepIndex + 1].key;

      // Run matching before showing match step
      if (nextStep === 'match') {
        runMatching();
      }

      // Initialize charge type map when entering review step
      if (nextStep === 'review' && !hasChargeTypeColumn) {
        const importable = matchedRows.filter((r) => r.unitId);
        const amounts = getDistinctAmounts(importable);
        const defaultMap = buildDefaultChargeTypeMap(amounts);
        setConfig((prev) => ({
          ...prev,
          chargeTypeMap: { ...defaultMap, ...prev.chargeTypeMap },
        }));
      }

      setCurrentStep(nextStep);
    }
  }

  function goBack() {
    const stepIndex = STEPS.findIndex((s) => s.key === currentStep);
    if (stepIndex > 0) {
      setCurrentStep(STEPS[stepIndex - 1].key);
    }
  }

  function handleUpdateMatch(rowNumber: number, unitId: string | null) {
    setMatchedRows((prev) =>
      prev.map((mr) => {
        if (mr.row.rowNumber !== rowNumber) return mr;
        if (!unitId) {
          return { ...mr, unitId: null, unitLabel: null, confidence: 'unmatched' as const, score: 0 };
        }
        const unit = units.find((u) => u.id === unitId);
        return {
          ...mr,
          unitId,
          unitLabel: unit
            ? `Unit ${unit.unit_number}${unit.address ? ` - ${unit.address}` : ''}`
            : 'Unknown',
          confidence: 'exact' as const,
          score: 1.0,
        };
      }),
    );
  }

  const canGoNext = useMemo(() => {
    switch (currentStep) {
      case 'upload':
        return rows.length > 0;
      case 'map':
        return mappingValid;
      case 'match':
        return matchedRows.some((r) => r.unitId);
      case 'review':
        return true;
      case 'import':
        return false; // handled by the execute step
    }
  }, [currentStep, rows, mappingValid, matchedRows]);

  const stepIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((step, i) => {
          const isComplete = completedSteps.has(step.key);
          const isCurrent = step.key === currentStep;

          return (
            <div key={step.key} className="flex items-center gap-2">
              {i > 0 && (
                <div
                  className={cn(
                    'h-px w-6 sm:w-10',
                    isComplete || isCurrent
                      ? 'bg-secondary-400'
                      : 'bg-stroke-light dark:bg-stroke-dark',
                  )}
                />
              )}
              <div className="flex items-center gap-1.5">
                <div
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-meta font-semibold',
                    isComplete
                      ? 'bg-secondary-400 text-white'
                      : isCurrent
                        ? 'bg-secondary-100 dark:bg-secondary-900/30 text-secondary-600 dark:text-secondary-400 ring-2 ring-secondary-400'
                        : 'bg-surface-light-2 dark:bg-surface-dark-2 text-text-muted-light dark:text-text-muted-dark',
                  )}
                >
                  {isComplete ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span
                  className={cn(
                    'hidden sm:inline text-label',
                    isCurrent
                      ? 'font-semibold text-text-primary-light dark:text-text-primary-dark'
                      : 'text-text-muted-light dark:text-text-muted-dark',
                  )}
                >
                  {step.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
        {currentStep === 'upload' && <StepUpload onParsed={handleParsed} />}
        {currentStep === 'map' && (
          <StepMapColumns
            headers={headers}
            rows={rows}
            mapping={columnMapping}
            onMappingChange={setColumnMapping}
          />
        )}
        {currentStep === 'match' && (
          <StepMatchUnits
            matchedRows={matchedRows}
            units={units}
            onUpdateMatch={handleUpdateMatch}
            skipUnmatched={skipUnmatched}
            onSkipUnmatchedChange={setSkipUnmatched}
          />
        )}
        {currentStep === 'review' && (
          <StepReview
            matchedRows={matchedRows}
            skipUnmatched={skipUnmatched}
            config={config}
            onConfigChange={setConfig}
            assessments={assessments}
            hasChargeTypeColumn={hasChargeTypeColumn}
          />
        )}
        {currentStep === 'import' && (
          <StepExecute
            matchedRows={matchedRows.filter((r) => r.unitId)}
            config={config}
            communityId={community.id}
            fileName={fileName}
            onComplete={onComplete || (() => {})}
          />
        )}
      </div>

      {/* Navigation */}
      {currentStep !== 'import' && (
        <div className="flex items-center justify-between">
          <div>
            {stepIndex > 0 ? (
              <Button variant="outline" onClick={goBack}>
                Back
              </Button>
            ) : showSkip && onSkip ? (
              <Button variant="ghost" onClick={onSkip}>
                Skip
              </Button>
            ) : (
              <div />
            )}
          </div>
          <div className="flex items-center gap-2">
            {showSkip && onSkip && stepIndex > 0 && (
              <Button variant="ghost" onClick={onSkip}>
                Skip
              </Button>
            )}
            <Button onClick={goNext} disabled={!canGoNext}>
              {currentStep === 'review' ? 'Start Import' : 'Next'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
