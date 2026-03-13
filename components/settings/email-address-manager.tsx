'use client';

import { useState, useEffect } from 'react';
import { useCommunity } from '@/lib/providers/community-provider';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/shared/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { Badge } from '@/components/shared/ui/badge';
import { Plus, Star, Trash2, Loader2, User, Mail } from 'lucide-react';
import { toast } from 'sonner';
import type { EmailAddress, Member } from '@/lib/types/database';

export function EmailAddressManager() {
  const { community } = useCommunity();
  const [addresses, setAddresses] = useState<EmailAddress[]>([]);
  const [boardMembers, setBoardMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  // Form state
  const [newAddress, setNewAddress] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRoleLabel, setNewRoleLabel] = useState('');
  const [newAssignedTo, setNewAssignedTo] = useState('');
  const [newForwardTo, setNewForwardTo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!community) return;

    async function load() {
      const [addrRes, membersRes] = await Promise.all([
        fetch(`/api/email/addresses?communityId=${community!.id}`),
        (async () => {
          const supabase = createClient();
          return supabase
            .from('members')
            .select('id, first_name, last_name, email, system_role, board_title')
            .eq('community_id', community!.id)
            .in('system_role', ['board', 'manager', 'super_admin'])
            .order('first_name');
        })(),
      ]);

      const addrData = await addrRes.json();
      setAddresses(addrData.addresses || []);
      setBoardMembers((membersRes.data as Member[]) || []);
      setLoading(false);
    }

    load();
  }, [community]);

  async function handleAdd() {
    if (!community || !newAddress.trim()) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/email/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          communityId: community.id,
          address: newAddress.trim(),
          displayName: newDisplayName.trim() || null,
          addressType: 'role',
          roleLabel: newRoleLabel.trim() || null,
          assignedTo: newAssignedTo || null,
          forwardTo: newForwardTo.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to create address');
        return;
      }

      setAddresses((prev) => [...prev, data.address]);
      setAddOpen(false);
      resetForm();
      toast.success('Email address created');
    } catch {
      toast.error('Failed to create address');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(addressId: string) {
    if (!community) return;

    try {
      const res = await fetch('/api/email/addresses', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ communityId: community.id, addressId }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete address');
        return;
      }

      setAddresses((prev) => prev.filter((a) => a.id !== addressId));
      toast.success('Address removed');
    } catch {
      toast.error('Failed to delete address');
    }
  }

  async function handleSetDefault(addressId: string) {
    if (!community) return;

    try {
      const res = await fetch('/api/email/addresses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          communityId: community.id,
          addressId,
          isDefault: true,
        }),
      });

      if (!res.ok) {
        toast.error('Failed to set default');
        return;
      }

      setAddresses((prev) =>
        prev.map((a) => ({ ...a, is_default: a.id === addressId })),
      );
      toast.success('Default address updated');
    } catch {
      toast.error('Failed to set default');
    }
  }

  function resetForm() {
    setNewAddress('');
    setNewDisplayName('');
    setNewRoleLabel('');
    setNewAssignedTo('');
    setNewForwardTo('');
  }

  if (loading) {
    return null;
  }

  if (addresses.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-label text-text-primary-light dark:text-text-primary-dark">
          Email Addresses
        </h3>
        <Button variant="ghost" size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Address
        </Button>
      </div>

      <div className="space-y-2">
        {addresses.map((addr) => {
          const assignedMember = boardMembers.find((m) => m.id === addr.assigned_to);

          return (
            <div
              key={addr.id}
              className="flex items-center gap-3 rounded-inner-card border border-stroke-light dark:border-stroke-dark p-2.5"
            >
              <Mail className="h-4 w-4 text-text-muted-light dark:text-text-muted-dark shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-body text-text-primary-light dark:text-text-primary-dark truncate">
                    {addr.address}
                  </span>
                  {addr.is_default && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      Default
                    </Badge>
                  )}
                  {addr.role_label && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {addr.role_label}
                    </Badge>
                  )}
                </div>
                {(assignedMember || addr.forward_to) && (
                  <div className="flex items-center gap-2 text-meta text-text-muted-light dark:text-text-muted-dark">
                    {assignedMember && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {assignedMember.first_name} {assignedMember.last_name}
                      </span>
                    )}
                    {addr.forward_to && (
                      <span>Forwards to {addr.forward_to}</span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!addr.is_default && (
                  <button
                    onClick={() => handleSetDefault(addr.id)}
                    className="p-1 rounded hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors"
                    title="Set as default"
                  >
                    <Star className="h-3.5 w-3.5 text-text-muted-light dark:text-text-muted-dark" />
                  </button>
                )}
                {!addr.is_default && (
                  <button
                    onClick={() => handleDelete(addr.id)}
                    className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add address dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Email Address</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-label">Email address</Label>
              <Input
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="president@yourdomain.com"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-label">Display name (optional)</Label>
              <Input
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                placeholder="Jane Smith, President"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-label">Role label (optional)</Label>
              <Input
                value={newRoleLabel}
                onChange={(e) => setNewRoleLabel(e.target.value)}
                placeholder="President, Treasurer, ARC Chair..."
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-label">Assign to board member</Label>
              <Select value={newAssignedTo} onValueChange={setNewAssignedTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Select member..." />
                </SelectTrigger>
                <SelectContent>
                  {boardMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.first_name} {m.last_name}
                      {m.board_title ? ` (${m.board_title})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-label">Forward emails to (optional)</Label>
              <Input
                type="email"
                value={newForwardTo}
                onChange={(e) => setNewForwardTo(e.target.value)}
                placeholder="jane@gmail.com"
              />
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                Inbound emails will be forwarded here as notifications.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={submitting || !newAddress.trim()}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Add Address'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
