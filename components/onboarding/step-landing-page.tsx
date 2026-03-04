'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/shared/ui/button';
import { useCommunity } from '@/lib/providers/community-provider';
import { Globe, ArrowRight, SkipForward } from 'lucide-react';

export function StepLandingPage({ onBack }: { onBack: () => void }) {
  const { community } = useCommunity();
  const router = useRouter();
  const [completing, setCompleting] = useState(false);

  function handleSetupLandingPage() {
    router.push(`/${community.slug}/settings?tab=landing`);
  }

  function handleComplete() {
    setCompleting(true);
    router.push(`/${community.slug}/dashboard`);
  }

  return (
    <div className="bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark rounded-panel p-card-padding">
      <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark mb-1">
        Public Landing Page
      </h2>
      <p className="text-body text-text-secondary-light dark:text-text-secondary-dark mb-6">
        Set up a public-facing page for your community. Visitors can see info about
        your HOA, board members, amenities, documents, and more before logging in.
      </p>

      <div className="rounded-xl border border-stroke-light dark:border-stroke-dark p-6 text-center space-y-4 mb-6">
        <div className="mx-auto w-12 h-12 rounded-full bg-secondary-400/10 flex items-center justify-center">
          <Globe className="h-6 w-6 text-secondary-400" />
        </div>
        <div>
          <p className="text-body text-text-primary-light dark:text-text-primary-dark font-medium mb-1">
            Your landing page will be visible at
          </p>
          <p className="text-label text-secondary-400 font-mono">
            {typeof window !== 'undefined' ? window.location.origin : ''}
            /{community.slug}
          </p>
        </div>
        <p className="text-meta text-text-muted-light dark:text-text-muted-dark max-w-md mx-auto">
          Choose a theme, toggle sections like hero banner, about, board members,
          gallery, FAQ, and more. You can also use AI to generate sample text for each field.
        </p>
        <Button onClick={handleSetupLandingPage}>
          <Globe className="h-4 w-4 mr-1.5" />
          Set Up Landing Page
          <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleComplete}
          disabled={completing}
        >
          <SkipForward className="h-4 w-4 mr-1.5" />
          {completing ? 'Finishing...' : 'Skip & Finish Setup'}
        </Button>
      </div>
    </div>
  );
}
