'use client';

import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { AlertTriangle, CheckCircle, Printer } from 'lucide-react';
import type { Vendor } from '@/lib/types/database';

interface VendorListProps {
  vendors: Vendor[];
  loading: boolean;
  onSelect: (v: Vendor) => void;
  onWriteCheck?: (v: Vendor) => void;
}

export function VendorList({ vendors, loading, onSelect, onWriteCheck }: VendorListProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding space-y-3"
          >
            <div className="animate-pulse h-5 w-2/3 rounded bg-muted" />
            <div className="animate-pulse h-4 w-1/3 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (vendors.length === 0) {
    return (
      <p className="text-body text-text-muted-light dark:text-text-muted-dark">
        No vendors found.
      </p>
    );
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-3">
      {vendors.map((v) => {
        const insuranceExpired = v.insurance_expiry && v.insurance_expiry < today;
        const insuranceSoon = v.insurance_expiry && !insuranceExpired && (() => {
          const expiry = new Date(v.insurance_expiry + 'T00:00:00');
          const diff = (expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
          return diff <= 30;
        })();

        return (
          <button
            key={v.id}
            type="button"
            onClick={() => onSelect(v)}
            className="w-full text-left rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding hover:border-secondary-400/40 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-card-title text-text-primary-light dark:text-text-primary-dark">
                    {v.company || v.name}
                  </h3>
                  <Badge variant="outline" className="text-meta">
                    {v.vendor_categories?.name ?? 'General'}
                  </Badge>
                  {v.status === 'inactive' && (
                    <Badge variant="secondary" className="text-meta">Inactive</Badge>
                  )}
                  {insuranceExpired && (
                    <span className="flex items-center gap-1 text-meta text-destructive">
                      <AlertTriangle className="h-3 w-3" />
                      Insurance expired
                    </span>
                  )}
                  {insuranceSoon && (
                    <span className="flex items-center gap-1 text-meta text-yellow-600 dark:text-yellow-400">
                      <AlertTriangle className="h-3 w-3" />
                      Expiring soon
                    </span>
                  )}
                  {v.w9_on_file ? (
                    <span className="flex items-center gap-1 text-meta text-green-600 dark:text-green-400">
                      <CheckCircle className="h-3 w-3" />
                      W-9
                    </span>
                  ) : (
                    <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
                      No W-9
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                  {v.company && (
                    <p className="text-meta text-text-secondary-light dark:text-text-secondary-dark">
                      {v.name}
                    </p>
                  )}
                  {v.phone && (
                    <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                      {v.phone}
                    </p>
                  )}
                  {v.email && (
                    <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                      {v.email}
                    </p>
                  )}
                  <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                    {v.tax_id ? 'TIN on file' : 'No TIN'}
                  </p>
                </div>
              </div>
              {onWriteCheck && (
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 self-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    onWriteCheck(v);
                  }}
                >
                  <Printer className="h-3.5 w-3.5 mr-1.5" />
                  Print Check
                </Button>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
