'use client';

import { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/shared/ui/button';

interface StepCompleteProps {
  onComplete: () => void;
}

export function StepComplete({ onComplete }: StepCompleteProps) {
  const [loading, setLoading] = useState(false);

  function handleClick() {
    setLoading(true);
    onComplete();
  }

  return (
    <div className="flex flex-col items-center text-center py-8">
      <CheckCircle className="h-14 w-14 text-secondary-400 mb-4" />
      <h2 className="text-page-title text-text-primary-light dark:text-text-primary-dark mb-2">
        You&apos;re all set!
      </h2>
      <p className="text-body text-text-secondary-light dark:text-text-secondary-dark mb-8 max-w-sm">
        Your preferences have been saved. You can change these anytime in Settings.
      </p>
      <Button onClick={handleClick} disabled={loading} size="lg">
        {loading ? 'Loading...' : 'Go to Dashboard'}
      </Button>
    </div>
  );
}
