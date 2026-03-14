'use client';

import { useCommunity } from '@/lib/providers/community-provider';
import { Mail, Send, Inbox, Star } from 'lucide-react';

export default function EmailPage() {
  const { isBoard } = useCommunity();

  if (!isBoard) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-body text-text-muted-light dark:text-text-muted-dark">
          Email is only available for board members.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">
        Email
      </h1>

      <div className="grid gap-grid-gap lg:grid-cols-[240px_1fr]">
        {/* Sidebar - folders */}
        <div className="bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark rounded-panel p-card-padding space-y-1">
          <button className="flex items-center gap-3 w-full px-3 py-2 rounded-inner-card bg-secondary-400/15 text-secondary-400 text-body font-medium">
            <Inbox className="w-4 h-4" />
            Inbox
          </button>
          <button className="flex items-center gap-3 w-full px-3 py-2 rounded-inner-card text-text-secondary-light dark:text-text-secondary-dark hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors text-body">
            <Send className="w-4 h-4" />
            Sent
          </button>
          <button className="flex items-center gap-3 w-full px-3 py-2 rounded-inner-card text-text-secondary-light dark:text-text-secondary-dark hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors text-body">
            <Star className="w-4 h-4" />
            Starred
          </button>
        </div>

        {/* Main content area */}
        <div className="bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark rounded-panel p-card-padding">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-surface-light-2 dark:bg-surface-dark-2 flex items-center justify-center mb-4">
              <Mail className="w-8 h-8 text-text-muted-light dark:text-text-muted-dark" />
            </div>
            <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark mb-2">
              Email coming soon
            </h2>
            <p className="text-body text-text-muted-light dark:text-text-muted-dark max-w-sm">
              Send and receive emails directly from DuesIQ using your community&apos;s
              email address. Configure your sending address in Settings first.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
