'use client';

import { Check, X } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/shared/ui/tooltip';
import {
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
} from '@/lib/types/permissions';
import type { RoleTemplate } from '@/lib/types/permissions';

interface TemplatePermissionTooltipProps {
  template: RoleTemplate;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function TemplatePermissionTooltip({
  template,
  children,
  side = 'right',
}: TemplatePermissionTooltipProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          side={side}
          className="max-w-xs p-3 space-y-2"
        >
          <p className="text-label font-semibold">{template.name}</p>
          {template.description && (
            <p className="text-meta text-muted-foreground">{template.description}</p>
          )}
          <div className="space-y-1.5">
            {PERMISSION_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </p>
                <div className="grid grid-cols-1 gap-0.5">
                  {group.keys.map((key) => {
                    const perm = template.permissions[key];
                    if (!perm) return null;
                    return (
                      <div key={key} className="flex items-center gap-1.5 text-[11px]">
                        <PermIcon active={perm.read} label="R" />
                        <PermIcon active={perm.write} label="W" />
                        <span className="text-foreground/80">
                          {PERMISSION_LABELS[key]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function PermIcon({ active, label }: { active: boolean; label: string }) {
  if (active) {
    return (
      <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-sm bg-emerald-500/20 text-emerald-500" title={`${label}: Yes`}>
        <Check className="h-2.5 w-2.5" />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-sm bg-red-500/10 text-red-400/60" title={`${label}: No`}>
      <X className="h-2.5 w-2.5" />
    </span>
  );
}

/** Standalone tooltip content (no wrapper) for use inside existing Tooltip structures */
export function TemplatePermissionSummary({ template }: { template: RoleTemplate }) {
  return (
    <div className="space-y-1.5">
      {template.description && (
        <p className="text-meta text-muted-foreground">{template.description}</p>
      )}
      {PERMISSION_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {group.label}
          </p>
          <div className="grid grid-cols-1 gap-0.5">
            {group.keys.map((key) => {
              const perm = template.permissions[key];
              if (!perm) return null;
              return (
                <div key={key} className="flex items-center gap-1.5 text-[11px]">
                  <PermIcon active={perm.read} label="R" />
                  <PermIcon active={perm.write} label="W" />
                  <span className="text-foreground/80">
                    {PERMISSION_LABELS[key]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
