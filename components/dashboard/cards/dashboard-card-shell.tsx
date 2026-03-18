'use client';

interface DashboardCardShellProps {
  title: string;
  children: React.ReactNode;
}

export function DashboardCardShell({ title, children }: DashboardCardShellProps) {
  return (
    <div className="h-full overflow-hidden rounded-panel p-card-padding bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark surface-elevation">
      <div className="drag-handle cursor-grab active:cursor-grabbing flex items-center justify-between mb-4 select-none">
        <h3 className="text-card-title text-text-primary-light dark:text-text-primary-dark">{title}</h3>
      </div>
      {children}
    </div>
  );
}
