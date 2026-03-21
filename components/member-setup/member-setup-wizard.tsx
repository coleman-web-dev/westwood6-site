'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { StepProfile } from './step-profile';
import { StepNotifications } from './step-notifications';
import { StepPaymentPreferences } from './step-payment-preferences';
import { StepComplete } from './step-complete';

interface Step {
  key: string;
  label: string;
}

export function MemberSetupWizard() {
  const { community, member } = useCommunity();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const allowFlexible =
    (community.theme?.payment_settings as Record<string, unknown> | undefined)
      ?.allow_flexible_frequency === true;

  const steps: Step[] = useMemo(() => {
    const base: Step[] = [
      { key: 'profile', label: 'Your Info' },
      { key: 'notifications', label: 'Notifications' },
    ];
    if (allowFlexible) {
      base.push({ key: 'payments', label: 'Payments' });
    }
    base.push({ key: 'done', label: 'Done' });
    return base;
  }, [allowFlexible]);

  const completeSetup = useCallback(async () => {
    if (!member) return;
    const supabase = createClient();
    const { error } = await supabase
      .from('members')
      .update({ setup_completed_at: new Date().toISOString() })
      .eq('id', member.id);

    if (error) {
      toast.error('Failed to save. Please try again.');
      return;
    }

    router.replace(`/${community.slug}/dashboard`);
  }, [member, community.slug, router]);

  const handleNext = useCallback(() => {
    const stepKey = steps[currentStep].key;
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.add(stepKey);
      return next;
    });

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, steps]);

  const handleBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  function renderStepContent() {
    const stepKey = steps[currentStep].key;
    switch (stepKey) {
      case 'profile':
        return <StepProfile onNext={handleNext} />;
      case 'notifications':
        return <StepNotifications onNext={handleNext} onBack={handleBack} />;
      case 'payments':
        return <StepPaymentPreferences onNext={handleNext} onBack={handleBack} />;
      case 'done':
        return <StepComplete onComplete={completeSetup} />;
      default:
        return null;
    }
  }

  return (
    <div className="bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark rounded-panel p-card-padding">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-card-title text-text-primary-light dark:text-text-primary-dark">
          Welcome to {community.name}
        </h1>
        {steps[currentStep].key !== 'done' && (
          <button
            type="button"
            onClick={completeSetup}
            className="text-meta text-text-muted-light dark:text-text-muted-dark hover:text-text-primary-light dark:hover:text-text-primary-dark transition-colors"
          >
            Skip setup
          </button>
        )}
      </div>

      {/* Progress indicator */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, i) => (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-meta font-semibold ${
                  completedSteps.has(step.key)
                    ? 'bg-secondary-400 text-white'
                    : i === currentStep
                      ? 'bg-secondary-400 text-white'
                      : 'bg-surface-light-2 dark:bg-surface-dark-2 text-text-muted-light dark:text-text-muted-dark'
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

            {/* Connector line */}
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-px mx-2 ${
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
