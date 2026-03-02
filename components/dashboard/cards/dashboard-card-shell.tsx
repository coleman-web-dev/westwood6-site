'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { GripVertical } from 'lucide-react';

interface DashboardCardShellProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

export function DashboardCardShell({ title, icon, children }: DashboardCardShellProps) {
  return (
    <Card className="h-full overflow-hidden rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark surface-elevation">
      <CardHeader className="flex flex-row items-center gap-3 p-card-padding pb-3">
        <div className="cursor-grab active:cursor-grabbing text-text-muted-light dark:text-text-muted-dark hover:text-text-secondary-light dark:hover:text-text-secondary-dark transition-colors">
          <GripVertical className="h-3.5 w-3.5" />
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-icon-glow">
            {icon}
          </div>
          <CardTitle className="text-card-title text-text-primary-light dark:text-text-primary-dark">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-card-padding pb-card-padding pt-0">
        {children}
      </CardContent>
    </Card>
  );
}
