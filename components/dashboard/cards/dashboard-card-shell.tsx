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
    <Card className="h-full overflow-hidden rounded-inner-card shadow-surface-light dark:shadow-surface-dark">
      <CardHeader className="flex flex-row items-center gap-2 p-card-padding pb-2">
        <div className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-text-muted-light dark:text-text-muted-dark" />
        </div>
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle className="text-card-title">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-card-padding pt-0">
        {children}
      </CardContent>
    </Card>
  );
}
