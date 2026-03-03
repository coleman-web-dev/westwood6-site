'use client';

import React, { useState, useCallback } from 'react';
import { useCommunity } from '@/lib/providers/community-provider';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { CheckCircle } from 'lucide-react';
import { StepCommunityInfo } from './step-community-info';
import { StepImportUnits } from './step-import-units';
import { StepImportMembers } from './step-import-members';
import { StepAssessmentConfig } from './step-assessment-config';
import { StepSendInvites } from './step-send-invites';

const STEPS = [
  { key: 'info', label: 'Community Info' },
  { key: 'units', label: 'Import Units' },
  { key: 'members', label: 'Import Members' },
  { key: 'assessments', label: 'Assessments' },
  { key: 'invites', label: 'Send Invites' },
] as const;

type StepKey = (typeof STEPS)[number]['key'];

export function OnboardingWizard() {
  const { community } = useCommunity();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<StepKey>>(new Set());
  const [unitIds, setUnitIds] = useState<Record<string, string>>({});

  const markCompleteAndAdvance = useCallback(
    (stepIndex: number) => {
      const stepKey = STEPS[stepIndex].key;
      setCompletedSteps((prev) => {
        const next = new Set(prev);
        next.add(stepKey);
        return next;
      });

      if (stepIndex < STEPS.length - 1) {
        setCurrentStep(stepIndex + 1);
      } else {
        // All steps complete, save onboarding state
        saveOnboardingState();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [community],
  );

  const goBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    markCompleteAndAdvance(currentStep);
  }, [currentStep, markCompleteAndAdvance]);

  const handleUnitsImported = useCallback((ids: Record<string, string>) => {
    setUnitIds(ids);
  }, []);

  async function saveOnboardingState() {
    const supabase = createClient();
    const { error } = await supabase
      .from('communities')
      .update({
        theme: {
          ...community.theme,
          onboarding: {
            completed_steps: Array.from(completedSteps),
            completed_at: new Date().toISOString(),
          },
        },
      })
      .eq('id', community.id);

    if (error) {
      toast.error('Failed to save onboarding progress');
    } else {
      toast.success('Onboarding complete!');
    }
  }

  function renderStepContent() {
    switch (currentStep) {
      case 0:
        return <StepCommunityInfo onNext={handleNext} />;
      case 1:
        return (
          <StepImportUnits
            onNext={handleNext}
            onBack={goBack}
            onUnitsImported={handleUnitsImported}
          />
        );
      case 2:
        return (
          <StepImportMembers
            onNext={handleNext}
            onBack={goBack}
            unitIds={unitIds}
          />
        );
      case 3:
        return <StepAssessmentConfig onNext={handleNext} onBack={goBack} />;
      case 4:
        return <StepSendInvites onBack={goBack} />;
      default:
        return null;
    }
  }

  return (
    <div className="bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark rounded-panel p-card-padding">
      <h1 className="text-card-title text-text-primary-light dark:text-text-primary-dark mb-6">
        Community Onboarding
      </h1>

      {/* Progress indicator */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((step, i) => (
          <React.Fragment key={step.key}>
            {/* Step circle + label */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-meta font-semibold ${
                  completedSteps.has(step.key)
                    ? 'bg-secondary-400 text-white'
                    : i === currentStep
                      ? 'bg-secondary-400 text-white'
                      : 'bg-surface-light-2 text-text-muted-light dark:text-text-muted-dark'
                }`}
              >
                {completedSteps.has(step.key) ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`text-meta hidden sm:block ${
                  i === currentStep || completedSteps.has(step.key)
                    ? 'text-text-primary-light dark:text-text-primary-dark'
                    : 'text-text-muted-light dark:text-text-muted-dark'
                }`}
              >
                {step.label}
              </span>
            </div>
            {/* Connector line (except after last step) */}
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 ${
                  completedSteps.has(step.key)
                    ? 'bg-secondary-400'
                    : 'bg-stroke-light dark:bg-stroke-dark'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step content */}
      {renderStepContent()}
    </div>
  );
}
