'use client';

import { useCommunity } from '@/lib/providers/community-provider';
import { Shield, User } from 'lucide-react';

export function ViewModeToggle() {
  const { actualIsBoard, viewMode, setViewMode } = useCommunity();

  if (!actualIsBoard) return null;

  const isAdmin = viewMode === 'admin';

  return (
    <div className="flex items-center bg-surface-light-2 dark:bg-surface-dark-2 rounded-pill p-0.5">
      <button
        type="button"
        onClick={() => setViewMode('admin')}
        className={`
          flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-meta font-medium transition-all
          ${
            isAdmin
              ? 'bg-secondary-400 text-primary-900 shadow-sm'
              : 'text-text-muted-light dark:text-text-muted-dark hover:text-text-primary-light dark:hover:text-text-primary-dark'
          }
        `}
      >
        <Shield className="h-3 w-3" />
        <span className="hidden sm:inline">Admin</span>
      </button>
      <button
        type="button"
        onClick={() => setViewMode('personal')}
        className={`
          flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-meta font-medium transition-all
          ${
            !isAdmin
              ? 'bg-secondary-400 text-primary-900 shadow-sm'
              : 'text-text-muted-light dark:text-text-muted-dark hover:text-text-primary-light dark:hover:text-text-primary-dark'
          }
        `}
      >
        <User className="h-3 w-3" />
        <span className="hidden sm:inline">Personal</span>
      </button>
    </div>
  );
}
