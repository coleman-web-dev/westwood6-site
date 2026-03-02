'use client';

import { SidebarTrigger } from '@/components/shared/ui/sidebar';
import { Separator } from '@/components/shared/ui/separator';
import ThemeSwitch from '@/components/shared/ThemeSwitch';
import { useCommunity } from '@/lib/providers/community-provider';

export function DashboardTopbar() {
  const { member, community } = useCommunity();

  return (
    <header className="flex h-topbar items-center gap-2 border-b border-border px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mx-2 h-4" />
      <span className="text-section-title">{community.name}</span>

      <div className="ml-auto flex items-center gap-3">
        <ThemeSwitch />
        <span className="text-label text-text-secondary-light dark:text-text-secondary-dark hidden sm:inline">
          {member?.first_name} {member?.last_name}
        </span>
      </div>
    </header>
  );
}
