'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/shared/ui/dialog';
import { Button } from '@/components/shared/ui/button';
import { Textarea } from '@/components/shared/ui/textarea';
import { Badge } from '@/components/shared/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { toast } from 'sonner';
import type { MaintenanceRequest, RequestStatus, Vendor } from '@/lib/types/database';

const STATUS_LABELS: Record<RequestStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

const STATUS_VARIANTS: Record<
  RequestStatus,
  'destructive' | 'default' | 'secondary' | 'outline'
> = {
  open: 'destructive',
  in_progress: 'default',
  resolved: 'secondary',
  closed: 'outline',
};

interface RequestDetailDialogProps {
  request: MaintenanceRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

export function RequestDetailDialog({
  request,
  open,
  onOpenChange,
  onUpdated,
}: RequestDetailDialogProps) {
  const { isBoard, community } = useCommunity();
  const [status, setStatus] = useState<RequestStatus>('open');
  const [adminNotes, setAdminNotes] = useState('');
  const [vendorId, setVendorId] = useState<string>('none');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [saving, setSaving] = useState(false);

  // Sync local state whenever the selected request changes
  useEffect(() => {
    if (request) {
      setStatus(request.status);
      setAdminNotes(request.admin_notes ?? '');
      setVendorId(request.vendor_id ?? 'none');
    }
  }, [request]);

  // Fetch vendors for assignment dropdown
  useEffect(() => {
    if (!isBoard || !community) return;
    const supabase = createClient();
    supabase
      .from('vendors')
      .select('*')
      .eq('community_id', community.id)
      .eq('status', 'active')
      .order('name')
      .then(({ data }) => setVendors((data as Vendor[]) || []));
  }, [isBoard, community]);

  async function handleSave() {
    if (!request) return;

    setSaving(true);
    const supabase = createClient();

    const { error } = await supabase
      .from('maintenance_requests')
      .update({
        status,
        admin_notes: adminNotes.trim() || null,
        vendor_id: vendorId === 'none' ? null : vendorId,
      })
      .eq('id', request.id);

    setSaving(false);

    if (error) {
      toast.error('Failed to update request. Please try again.');
      return;
    }

    toast.success('Request updated.');
    onOpenChange(false);
    onUpdated();
  }

  if (!request) return null;

  const createdDate = new Date(request.created_at).toLocaleDateString(
    undefined,
    { year: 'numeric', month: 'long', day: 'numeric' },
  );
  const updatedDate = new Date(request.updated_at).toLocaleDateString(
    undefined,
    { year: 'numeric', month: 'long', day: 'numeric' },
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{request.title}</DialogTitle>
          <DialogDescription>
            Submitted {createdDate}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Status badge (read-only display) */}
          {!isBoard && (
            <div className="flex items-center gap-2">
              <span className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Status:
              </span>
              <Badge variant={STATUS_VARIANTS[request.status]}>
                {STATUS_LABELS[request.status]}
              </Badge>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <span className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Description
            </span>
            <p className="text-body text-text-primary-light dark:text-text-primary-dark whitespace-pre-line">
              {request.description}
            </p>
          </div>

          {/* Last updated */}
          <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
            Last updated {updatedDate}
          </p>

          {/* Board-only editable fields */}
          {isBoard && (
            <>
              <div className="border-t border-stroke-light dark:border-stroke-dark pt-4 space-y-4">
                {/* Status select */}
                <div className="space-y-1.5">
                  <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                    Status
                  </label>
                  <Select
                    value={status}
                    onValueChange={(val) => setStatus(val as RequestStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Admin notes */}
                <div className="space-y-1.5">
                  <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                    Admin Notes
                  </label>
                  <Textarea
                    placeholder="Internal notes about this request..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="resize-none"
                    rows={4}
                  />
                </div>

                {/* Vendor assignment */}
                {vendors.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                      Assigned Vendor
                    </label>
                    <Select value={vendorId} onValueChange={setVendorId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select vendor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {vendors.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name}{v.company ? ` (${v.company})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Resident view: show admin notes if present (read-only) */}
          {!isBoard && request.admin_notes && (
            <div className="border-t border-stroke-light dark:border-stroke-dark pt-4 space-y-1.5">
              <span className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Notes from management
              </span>
              <p className="text-body text-text-primary-light dark:text-text-primary-dark whitespace-pre-line">
                {request.admin_notes}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button variant="outline">
              {isBoard ? 'Cancel' : 'Close'}
            </Button>
          </DialogClose>
          {isBoard && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
