'use client';

import { cn } from '@/lib/utils';
import type { LayoutTemplate } from '@/lib/types/landing';
import { LAYOUT_TEMPLATES } from '@/lib/types/landing';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/shared/ui/alert-dialog';
import { useState } from 'react';

interface Props {
  selected: LayoutTemplate;
  onSelect: (template: LayoutTemplate) => void;
}

// Simple wireframe SVG thumbnails for each template
function ClassicWireframe() {
  return (
    <svg viewBox="0 0 160 120" className="w-full h-full" fill="none">
      {/* Hero - full width */}
      <rect x="4" y="4" width="152" height="32" rx="2" fill="currentColor" opacity="0.15" />
      <rect x="50" y="14" width="60" height="4" rx="1" fill="currentColor" opacity="0.4" />
      <rect x="60" y="22" width="40" height="3" rx="1" fill="currentColor" opacity="0.25" />
      {/* Content rows - centered cards */}
      <rect x="20" y="42" width="120" height="4" rx="1" fill="currentColor" opacity="0.3" />
      <rect x="30" y="50" width="100" height="3" rx="1" fill="currentColor" opacity="0.15" />
      {/* 3 cards */}
      <rect x="16" y="60" width="38" height="24" rx="3" fill="currentColor" opacity="0.1" stroke="currentColor" strokeOpacity="0.2" strokeWidth="0.5" />
      <rect x="60" y="60" width="38" height="24" rx="3" fill="currentColor" opacity="0.1" stroke="currentColor" strokeOpacity="0.2" strokeWidth="0.5" />
      <rect x="104" y="60" width="38" height="24" rx="3" fill="currentColor" opacity="0.1" stroke="currentColor" strokeOpacity="0.2" strokeWidth="0.5" />
      {/* Footer */}
      <rect x="4" y="92" width="152" height="24" rx="2" fill="currentColor" opacity="0.06" />
      <rect x="55" y="102" width="50" height="3" rx="1" fill="currentColor" opacity="0.15" />
    </svg>
  );
}

function ModernWireframe() {
  return (
    <svg viewBox="0 0 160 120" className="w-full h-full" fill="none">
      {/* Hero - split layout */}
      <rect x="4" y="4" width="84" height="40" rx="2" fill="currentColor" opacity="0.15" />
      <rect x="92" y="4" width="64" height="40" rx="2" fill="currentColor" opacity="0.08" />
      <rect x="100" y="16" width="48" height="5" rx="1" fill="currentColor" opacity="0.4" />
      <rect x="100" y="26" width="36" height="3" rx="1" fill="currentColor" opacity="0.2" />
      {/* Two-column about */}
      <rect x="12" y="50" width="40" height="4" rx="1" fill="currentColor" opacity="0.35" />
      <rect x="12" y="58" width="2" height="12" rx="1" fill="currentColor" opacity="0.5" />
      <rect x="60" y="50" width="88" height="3" rx="1" fill="currentColor" opacity="0.15" />
      <rect x="60" y="56" width="80" height="3" rx="1" fill="currentColor" opacity="0.12" />
      <rect x="60" y="62" width="70" height="3" rx="1" fill="currentColor" opacity="0.1" />
      {/* Horizontal scroll cards */}
      <rect x="8" y="74" width="28" height="20" rx="10" fill="currentColor" opacity="0.08" stroke="currentColor" strokeOpacity="0.2" strokeWidth="0.5" />
      <rect x="40" y="74" width="28" height="20" rx="10" fill="currentColor" opacity="0.08" stroke="currentColor" strokeOpacity="0.2" strokeWidth="0.5" />
      <rect x="72" y="74" width="28" height="20" rx="10" fill="currentColor" opacity="0.08" stroke="currentColor" strokeOpacity="0.2" strokeWidth="0.5" />
      <rect x="104" y="74" width="28" height="20" rx="10" fill="currentColor" opacity="0.08" stroke="currentColor" strokeOpacity="0.2" strokeWidth="0.5" />
      <rect x="136" y="74" width="28" height="20" rx="10" fill="currentColor" opacity="0.05" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.5" />
      {/* Full-width band */}
      <rect x="4" y="100" width="152" height="16" rx="2" fill="currentColor" opacity="0.12" />
    </svg>
  );
}

function EditorialWireframe() {
  return (
    <svg viewBox="0 0 160 120" className="w-full h-full" fill="none">
      {/* Hero - large text only */}
      <rect x="4" y="4" width="152" height="36" rx="2" fill="currentColor" opacity="0.04" />
      <rect x="28" y="12" width="104" height="8" rx="1" fill="currentColor" opacity="0.3" />
      <rect x="50" y="26" width="60" height="3" rx="1" fill="currentColor" opacity="0.15" />
      {/* Narrow prose */}
      <rect x="36" y="46" width="88" height="3" rx="1" fill="currentColor" opacity="0.15" />
      <rect x="36" y="52" width="84" height="3" rx="1" fill="currentColor" opacity="0.12" />
      <rect x="36" y="58" width="78" height="3" rx="1" fill="currentColor" opacity="0.1" />
      {/* Divider */}
      <line x1="36" y1="68" x2="124" y2="68" stroke="currentColor" strokeOpacity="0.15" strokeWidth="0.5" />
      {/* Numbered items */}
      <circle cx="42" cy="78" r="5" fill="currentColor" opacity="0.08" />
      <rect x="52" y="76" width="72" height="3" rx="1" fill="currentColor" opacity="0.15" />
      <line x1="36" y1="86" x2="124" y2="86" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.5" />
      <circle cx="42" cy="94" r="5" fill="currentColor" opacity="0.08" />
      <rect x="52" y="92" width="68" height="3" rx="1" fill="currentColor" opacity="0.12" />
      <line x1="36" y1="102" x2="124" y2="102" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.5" />
      {/* Minimal footer */}
      <rect x="55" y="110" width="50" height="3" rx="1" fill="currentColor" opacity="0.1" />
    </svg>
  );
}

const WIREFRAMES: Record<LayoutTemplate, React.ComponentType> = {
  classic: ClassicWireframe,
  modern: ModernWireframe,
  editorial: EditorialWireframe,
};

export function LandingPageTemplatePicker({ selected, onSelect }: Props) {
  const [pendingTemplate, setPendingTemplate] = useState<LayoutTemplate | null>(null);

  function handleClick(id: LayoutTemplate) {
    if (id === selected) return;
    setPendingTemplate(id);
  }

  function confirmSwitch() {
    if (pendingTemplate) {
      onSelect(pendingTemplate);
      setPendingTemplate(null);
    }
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        {LAYOUT_TEMPLATES.map((tpl) => {
          const Wireframe = WIREFRAMES[tpl.id];
          const isSelected = tpl.id === selected;
          return (
            <button
              key={tpl.id}
              type="button"
              onClick={() => handleClick(tpl.id)}
              className={cn(
                'relative rounded-xl border-2 p-3 text-left transition-all hover:shadow-md',
                isSelected
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 shadow-sm'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              )}
            >
              <div className="aspect-[4/3] w-full rounded-lg bg-gray-100 dark:bg-gray-800 p-1 mb-2 text-gray-600 dark:text-gray-400">
                <Wireframe />
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {tpl.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                {tpl.description}
              </p>
              {isSelected && (
                <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center">
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <AlertDialog open={!!pendingTemplate} onOpenChange={() => setPendingTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch layout template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will adjust section styling and layout. Your content (text, images, links) will not change.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSwitch}>Switch Template</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
