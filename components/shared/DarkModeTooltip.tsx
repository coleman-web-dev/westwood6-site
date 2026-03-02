'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useUserPreferences } from '@/lib/hooks/use-user-preferences';

const TOOLTIP_ID = 'dark_mode_intro';

export function DarkModeTooltip() {
  const { loaded, isTooltipDismissed, dismissTooltip } = useUserPreferences();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (loaded && !isTooltipDismissed(TOOLTIP_ID)) {
      // Small delay so the page settles before showing
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [loaded, isTooltipDismissed]);

  function dismiss() {
    setVisible(false);
    dismissTooltip(TOOLTIP_ID);
  }

  if (!visible) return null;

  return (
    <div className="absolute top-full right-0 mt-3 z-50 w-56 animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Arrow pointing up at the toggle */}
      <div className="absolute -top-2 right-3 w-4 h-4 rotate-45 bg-card border-l border-t border-border" />

      <div className="relative rounded-lg bg-card border border-border shadow-lg p-3">
        <button
          onClick={dismiss}
          className="absolute top-2 right-2 p-0.5 rounded-sm hover:bg-muted transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>

        <p className="text-sm text-foreground pr-4">
          Prefer dark mode? Tap here to switch themes anytime.
        </p>
      </div>
    </div>
  );
}
