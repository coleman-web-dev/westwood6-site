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
  DialogDescription,
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
import {
  Plus,
  Star,
  Trash2,
  Loader2,
  User,
  Mail,
  Users,
  Smartphone,
  ArrowRightLeft,
  KeyRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { InboxAccessManager } from '@/components/email/inbox-access-manager';
import { EmailClientSetup } from '@/components/email/email-client-setup';
import type { EmailAddress, Member } from '@/lib/types/database';

export function EmailAddressManager() {
  const { community } = useCommunity();
  const [addresses, setAddresses] = useState<EmailAddress[]>([]);
  const [boardMembers, setBoardMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [accessManagerAddr, setAccessManagerAddr] = useState<EmailAddress | null>(null);

  // Email client setup dialog
  const [clientSetupAddr, setClientSetupAddr] = useState<EmailAddress | null>(null);

  // Transfer dialog
  const [transferAddr, setTransferAddr] = useState<EmailAddress | null>(null);
  const [transferMemberId, setTransferMemberId] = useState('');
  const [transferring, setTransferring] = useState(false);

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

  async function handleTransfer() {
    if (!community || !transferAddr || !transferMemberId) return;
    setTransferring(true);

    try {
      const res = await fetch('/api/email/addresses/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addressId: transferAddr.id,
          newMemberId: transferMemberId,
          communityId: community.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to transfer');
        return;
      }

      // Update local state
      setAddresses((prev) =>
        prev.map((a) =>
          a.id === transferAddr.id
            ? {
                ...a,
                assigned_to: transferMemberId,
                smtp_resend_key_id: null,
                smtp_created_at: null,
                smtp_created_for_member_id: null,
              }
            : a
        )
      );

      toast.success(
        `${transferAddr.address} transferred to ${data.newMember.name}.${data.smtpRevoked ? ' Old credentials have been revoked.' : ''}`
      );
      setTransferAddr(null);
      setTransferMemberId('');
    } catch {
      toast.error('Failed to transfer');
    } finally {
      setTransferring(false);
    }
  }

  function resetForm() {
    setNewAddress('');
    setNewDisplayName('');
    setNewRoleLabel('');
    setNewAssignedTo('');
    setNewForwardTo('');
  }

  function refreshAddress(addressId: string) {
    // After credential generation, update the local state to reflect SMTP status
    setAddresses((prev) =>
      prev.map((a) =>
        a.id === addressId
          ? {
              ...a,
              smtp_resend_key_id: 'generated', // We don't know the exact ID, just that it exists
              smtp_created_at: new Date().toISOString(),
            }
          : a
      )
    );
  }

  if (loading) {
    return null;
  }

  if (addresses.length === 0) {
    return null;
  }

  // For transfer dialog: members not currently assigned to this address
  const transferCandidates = transferAddr
    ? boardMembers.filter((m) => m.id !== transferAddr.assigned_to)
    : [];

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
          const isCustomDomain = !addr.address.endsWith('@duesiq.com');
          const hasSmtp = !!addr.smtp_resend_key_id;

          return (
            <div
              key={addr.id}
              className="rounded-inner-card border border-stroke-light dark:border-stroke-dark p-2.5"
            >
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-text-muted-light dark:text-text-muted-dark shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-body text-text-primary-light dark:text-text-primary-dark truncate">
                      {addr.address}
                    </span>
                    {addr.is_default && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        Default
                      </Badge>
                    )}
                    {addr.mailbox_type === 'full_inbox' && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        Inbox
                      </Badge>
                    )}
                    {addr.role_label && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {addr.role_label}
                      </Badge>
                    )}
                    {hasSmtp && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 border-green-300 dark:border-green-700 text-green-600 dark:text-green-400"
                      >
                        <KeyRound className="h-2.5 w-2.5 mr-0.5" />
                        Gmail
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
                  {/* Set up in email app (only for custom domain addresses) */}
                  {isCustomDomain && (
                    <button
                      onClick={() => setClientSetupAddr(addr)}
                      className="p-1 rounded hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors"
                      title="Set up in Gmail / email app"
                    >
                      <Smartphone className="h-3.5 w-3.5 text-text-muted-light dark:text-text-muted-dark" />
                    </button>
                  )}
                  {/* Transfer role (only for role addresses with an assignment) */}
                  {addr.address_type === 'role' && addr.assigned_to && (
                    <button
                      onClick={() => {
                        setTransferAddr(addr);
                        setTransferMemberId('');
                      }}
                      className="p-1 rounded hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors"
                      title="Transfer to another member"
                    >
                      <ArrowRightLeft className="h-3.5 w-3.5 text-text-muted-light dark:text-text-muted-dark" />
                    </button>
                  )}
                  {addr.mailbox_type === 'full_inbox' && (
                    <button
                      onClick={() => setAccessManagerAddr(addr)}
                      className="p-1 rounded hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors"
                      title="Manage inbox access"
                    >
                      <Users className="h-3.5 w-3.5 text-text-muted-light dark:text-text-muted-dark" />
                    </button>
                  )}
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
            </div>
          );
        })}
      </div>

      {/* Inbox access manager dialog */}
      {accessManagerAddr && (
        <InboxAccessManager
          emailAddressId={accessManagerAddr.id}
          emailAddress={accessManagerAddr.address}
          open={!!accessManagerAddr}
          onOpenChange={(open) => {
            if (!open) setAccessManagerAddr(null);
          }}
        />
      )}

      {/* Email client setup dialog */}
      {clientSetupAddr && (
        <EmailClientSetup
          addressId={clientSetupAddr.id}
          emailAddress={clientSetupAddr.address}
          roleLabel={clientSetupAddr.role_label}
          hasExistingCredentials={!!clientSetupAddr.smtp_resend_key_id}
          open={!!clientSetupAddr}
          onOpenChange={(open) => {
            if (!open) setClientSetupAddr(null);
          }}
          onCredentialsGenerated={() => refreshAddress(clientSetupAddr.id)}
        />
      )}

      {/* Transfer role dialog */}
      <Dialog
        open={!!transferAddr}
        onOpenChange={(open) => {
          if (!open) {
            setTransferAddr(null);
            setTransferMemberId('');
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer Role</DialogTitle>
            <DialogDescription>
              Reassign <strong>{transferAddr?.address}</strong>
              {transferAddr?.role_label ? ` (${transferAddr.role_label})` : ''} to a different
              board member. This will:
            </DialogDescription>
          </DialogHeader>

          <ul className="text-meta text-text-secondary-light dark:text-text-secondary-dark space-y-1 ml-4 list-disc">
            <li>Revoke the current member&apos;s email app credentials</li>
            <li>Remove their inbox access</li>
            <li>Grant the new member inbox access and forwarding</li>
          </ul>

          <div className="space-y-3 py-2">
            {transferAddr?.assigned_to && (
              <div className="text-meta text-text-muted-light dark:text-text-muted-dark">
                Currently assigned to:{' '}
                <strong>
                  {boardMembers.find((m) => m.id === transferAddr.assigned_to)?.first_name}{' '}
                  {boardMembers.find((m) => m.id === transferAddr.assigned_to)?.last_name}
                </strong>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-label">Transfer to</Label>
              <Select value={transferMemberId} onValueChange={setTransferMemberId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new member..." />
                </SelectTrigger>
                <SelectContent>
                  {transferCandidates.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.first_name} {m.last_name}
                      {m.board_title ? ` (${m.board_title})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setTransferAddr(null);
                setTransferMemberId('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleTransfer} disabled={transferring || !transferMemberId}>
              {transferring ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Transfer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
