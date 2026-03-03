'use client';

import { useCommunity } from '@/lib/providers/community-provider';
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard';
import { redirect } from 'next/navigation';

export default function OnboardingPage() {
  const { community, actualIsBoard } = useCommunity();

  // Only board members can access onboarding
  if (!actualIsBoard) {
    redirect(`/${community.slug}/dashboard`);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <OnboardingWizard />
    </div>
  );
}
