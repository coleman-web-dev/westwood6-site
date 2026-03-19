'use client';

import { GripHorizontal } from 'lucide-react';

interface DashboardCardShellProps {
  title: string;
  children: React.ReactNode;
}

export function DashboardCardShell({ title, children }: DashboardCardShellProps) {
  return (
    <div className="h-full overflow-hidden rounded-panel p-card-padding bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark surface-elevation relative group/card">
      <div className="drag-handle cursor-grab active:cursor-grabbing flex items-center justify-between mb-4 select-none">
        <h3 className="text-card-title text-text-primary-light dark:text-text-primary-dark">{title}</h3>
      </div>
      {children}
      {/* Resize grip indicator — visible on hover, hidden on mobile */}
      <div className="hidden sm:flex absolute bottom-1.5 right-1.5 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 pointer-events-none">
        <GripHorizontal className="w-3.5 h-3.5 text-text-muted-light dark:text-text-muted-dark rotate-[-45deg]" />
      </div>
    </div>
  );
}
