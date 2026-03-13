'use client';

import { useState } from 'react';
import { useCommunity } from '@/lib/providers/community-provider';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/shared/ui/popover';
import { CreateCommunityDialog } from '@/components/settings/create-community-dialog';
import { ChevronDown, Check, Plus } from 'lucide-react';

export function CommunitySwitcher() {
  const { community, member, userCommunities, hasMultipleCommunities } = useCommunity();
  const isActuallySuperAdmin = member?.system_role === 'super_admin';
  const [open, setOpen] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Show switcher if multiple communities OR if super admin (for the Add action)
  if (!hasMultipleCommunities && !isActuallySuperAdmin) return null;

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className="flex items-center gap-1.5 h-8 pl-2.5 pr-2 rounded-pill bg-surface-light-2 dark:bg-surface-dark-2 border border-stroke-light dark:border-stroke-dark text-meta font-medium text-text-primary-light dark:text-text-primary-dark hover:bg-surface-light dark:hover:bg-surface-dark-2/80 focus:outline-none focus:ring-2 focus:ring-secondary-400/30 transition-all cursor-pointer"
          >
            <span className="max-w-[120px] truncate">{community.name}</span>
            <ChevronDown className="w-3.5 h-3.5 shrink-0 text-text-muted-light dark:text-text-muted-dark" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-56 p-1 bg-surface-light dark:bg-surface-dark border-stroke-light dark:border-stroke-dark rounded-inner-card"
        >
          <div className="flex flex-col">
            {userCommunities.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setOpen(false);
                  if (c.slug !== community.slug) {
                    window.location.href = `/${c.slug}/dashboard`;
                  }
                }}
                className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-sm text-meta font-medium text-text-primary-light dark:text-text-primary-dark hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors text-left"
              >
                <span className="w-4 shrink-0 flex items-center justify-center">
                  {c.slug === community.slug && (
                    <Check className="w-3.5 h-3.5 text-secondary-400" />
                  )}
                </span>
                <span className="truncate">{c.name}</span>
              </button>
            ))}

            {isActuallySuperAdmin && (
              <>
                <div className="h-px bg-stroke-light dark:bg-stroke-dark my-1" />
                <button
                  onClick={() => {
                    setOpen(false);
                    setShowCreateDialog(true);
                  }}
                  className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-sm text-meta font-medium text-text-secondary-light dark:text-text-secondary-dark hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors text-left"
                >
                  <span className="w-4 shrink-0 flex items-center justify-center">
                    <Plus className="w-3.5 h-3.5" />
                  </span>
                  <span>Add Community</span>
                </button>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <CreateCommunityDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </>
  );
}
