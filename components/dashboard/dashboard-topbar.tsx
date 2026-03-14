'use client';

import Link from 'next/link';
import ThemeSwitch from '@/components/shared/ThemeSwitch';
import { useCommunity } from '@/lib/providers/community-provider';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { ViewModeToggle } from './view-mode-toggle';
import { CommunitySwitcher } from './community-switcher';
import { SearchIcon, MailIcon, MessageSquareIcon, MenuIcon } from 'lucide-react';
import { useKBar } from '@shipixen/kbar';

interface DashboardTopbarProps {
  onMenuClick: () => void;
}

export function DashboardTopbar({ onMenuClick }: DashboardTopbarProps) {
  const { member, community, actualIsBoard } = useCommunity();
  const { query } = useKBar();

  const initials = [member?.first_name?.[0], member?.last_name?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 h-topbar flex items-center gap-1.5 sm:gap-4 px-3 sm:px-app-padding border-b border-stroke-light dark:border-stroke-dark bg-canvas-light/80 dark:bg-canvas-dark/80 backdrop-blur-xl">
      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 -ml-2 rounded-inner-card text-text-secondary-light dark:text-text-secondary-dark hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors"
      >
        <MenuIcon className="w-5 h-5" />
      </button>

      {/* Title */}
      <h1 className="text-[18px] sm:text-page-title text-text-primary-light dark:text-text-primary-dark">
        Dashboard
      </h1>

      {/* View mode toggle (board members only) */}
      {actualIsBoard && (
        <div className="ml-2 sm:ml-4">
          <ViewModeToggle />
        </div>
      )}

      {/* Search (centered) */}
      <div className="hidden sm:flex flex-1 justify-center">
        <button
          onClick={() => query.toggle()}
          className="flex items-center gap-2 w-full max-w-xs h-9 pl-3 pr-3 bg-surface-light-2 dark:bg-surface-dark-2 border-0 rounded-pill text-body text-text-muted-light dark:text-text-muted-dark hover:bg-surface-light dark:hover:bg-surface-dark-2/80 focus:outline-none focus:ring-2 focus:ring-secondary-400/30 transition-all cursor-pointer"
        >
          <SearchIcon className="w-4 h-4 shrink-0" />
          <span className="flex-1 text-left">Search</span>
          <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark text-[10px] font-medium text-text-muted-light dark:text-text-muted-dark">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1.5 sm:gap-3 ml-auto">
        {/* Mobile search button */}
        <button
          onClick={() => query.toggle()}
          className="sm:hidden p-2 rounded-inner-card text-text-secondary-light dark:text-text-secondary-dark hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors"
        >
          <SearchIcon className="w-[18px] h-[18px]" />
        </button>

        {/* Community switcher */}
        <CommunitySwitcher />

        <ThemeSwitch />

        <NotificationBell />
        {actualIsBoard && (
          <Link
            href={`/${community.slug}/email`}
            className="relative p-2 rounded-inner-card text-text-secondary-light dark:text-text-secondary-dark hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors"
          >
            <MailIcon className="w-[18px] h-[18px]" />
          </Link>
        )}
        <Link
          href={`/${community.slug}/bulletin-board`}
          className="relative p-2 rounded-inner-card text-text-secondary-light dark:text-text-secondary-dark hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors"
        >
          <MessageSquareIcon className="w-[18px] h-[18px]" />
        </Link>

        <div className="w-7 h-7 rounded-full bg-secondary-400 flex items-center justify-center text-meta font-semibold text-primary-900">
          {initials || '?'}
        </div>
      </div>
    </header>
  );
}
