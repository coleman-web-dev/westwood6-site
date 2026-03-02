'use client';

import ThemeSwitch from '@/components/shared/ThemeSwitch';
import { useCommunity } from '@/lib/providers/community-provider';
import { SearchIcon, BellIcon, MailIcon, MenuIcon } from 'lucide-react';

interface DashboardTopbarProps {
  onMenuClick: () => void;
}

export function DashboardTopbar({ onMenuClick }: DashboardTopbarProps) {
  const { member } = useCommunity();

  const initials = [member?.first_name?.[0], member?.last_name?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 h-topbar flex items-center gap-2 sm:gap-4 px-3 sm:px-app-padding border-b border-stroke-light dark:border-stroke-dark bg-canvas-light/80 dark:bg-canvas-dark/80 backdrop-blur-xl rounded-tl-app-frame">
      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 -ml-2 rounded-inner-card text-text-secondary-light dark:text-text-secondary-dark hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors"
      >
        <MenuIcon className="w-5 h-5" />
      </button>

      {/* Title */}
      <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">
        Dashboard
      </h1>

      {/* Search (centered) */}
      <div className="hidden sm:flex flex-1 justify-center">
        <div className="relative w-full max-w-xs">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted-light dark:text-text-muted-dark" />
          <input
            type="text"
            placeholder="Search"
            className="w-full h-9 pl-9 pr-4 bg-surface-light-2 dark:bg-surface-dark-2 border-0 rounded-pill text-body text-text-primary-light dark:text-text-primary-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-secondary-400/30 transition-all"
          />
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3 ml-auto">
        <ThemeSwitch />

        <button className="relative p-2 rounded-inner-card text-text-secondary-light dark:text-text-secondary-dark hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors">
          <BellIcon className="w-[18px] h-[18px]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-warning-dot rounded-full" />
        </button>
        <button className="p-2 rounded-inner-card text-text-secondary-light dark:text-text-secondary-dark hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors">
          <MailIcon className="w-[18px] h-[18px]" />
        </button>

        <div className="w-7 h-7 rounded-full bg-secondary-400 flex items-center justify-center text-meta font-semibold text-primary-900">
          {initials || '?'}
        </div>
      </div>
    </header>
  );
}
