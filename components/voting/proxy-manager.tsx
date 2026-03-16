'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
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
import { Input } from '@/components/shared/ui/input';
import { UserPlus, XCircle, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { logAuditEvent } from '@/lib/audit';
import type { ProxyAuthorization, VotingConfig } from '@/lib/types/database';
import { VOTING_CONFIG_DEFAULTS } from '@/lib/types/database';

interface ProxyWithNames extends ProxyAuthorization {
  grantee_name?: string;
  grantor_unit_number?: string;
}

interface ProxyManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProxyManager({ open, onOpenChange }: ProxyManagerProps) {
  const { community, member, unit } = useCommunity();
  const votingConfig: VotingConfig = { ...VOTING_CONFIG_DEFAULTS, ...(community?.theme?.voting_config as Partial<VotingConfig> | undefined) };

  const [proxies, setProxies] = useState<ProxyWithNames[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGrant, setShowGrant] = useState(false);
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [selectedGrantee, setSelectedGrantee] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !unit) return;
    loadProxies();
    loadMembers();
  }, [open, unit]);

  async function loadProxies() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('proxy_authorizations')
      .select('*, grantee:members!proxy_authorizations_grantee_member_id_fkey(first_name, last_name)')
      .eq('grantor_unit_id', unit!.id)
      .in('status', ['pending', 'active'])
      .order('created_at', { ascending: false });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enriched: ProxyWithNames[] = ((data ?? []) as any[]).map((p) => ({
      ...p,
      grantee_name: p.grantee ? `${p.grantee.first_name} ${p.grantee.last_name}` : 'Unknown',
    }));

    setProxies(enriched);
    setLoading(false);
  }

  async function loadMembers() {
    const supabase = createClient();
    const { data } = await supabase
      .from('members')
      .select('id, first_name, last_name')
      .eq('community_id', community.id)
      .eq('is_approved', true)
      .neq('id', member?.id ?? '');

    setMembers(
      (data ?? []).map((m) => ({
        id: m.id,
        name: `${m.first_name} ${m.last_name}`,
      })),
    );
  }

  async function handleGrant() {
    if (!selectedGrantee || !unit || !member) return;

    setSubmitting(true);
    const supabase = createClient();

    // Calculate expiration from voting config
    const defaultExpiry = new Date();
    defaultExpiry.setDate(defaultExpiry.getDate() + votingConfig.proxy_validity_days);
    const finalExpiresAt = expiresAt ? new Date(expiresAt).toISOString() : defaultExpiry.toISOString();

    const { error } = await supabase.from('proxy_authorizations').insert({
      community_id: community.id,
      grantor_unit_id: unit.id,
      grantor_member_id: member.id,
      grantee_member_id: selectedGrantee,
      status: 'active',
      authorized_at: new Date().toISOString(),
      expires_at: finalExpiresAt,
    });

    setSubmitting(false);

    if (error) {
      if (error.code === '23505') {
        toast.error('A proxy authorization already exists for this ballot/unit combination.');
      } else {
        toast.error('Failed to create proxy authorization.');
      }
      return;
    }

    logAuditEvent({
      communityId: community.id,
      actorId: member.user_id,
      actorEmail: member.email,
      action: 'proxy_granted',
      targetType: 'proxy',
      metadata: {
        grantee_member_id: selectedGrantee,
        expires_at: finalExpiresAt,
      },
    });

    toast.success('Proxy authorization granted.');
    setShowGrant(false);
    setSelectedGrantee('');
    setExpiresAt('');
    loadProxies();
  }

  async function handleRevoke(proxyId: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from('proxy_authorizations')
      .update({ status: 'revoked', revoked_at: new Date().toISOString() })
      .eq('id', proxyId);

    if (error) {
      toast.error('Failed to revoke proxy.');
      return;
    }

    logAuditEvent({
      communityId: community.id,
      actorId: member?.user_id,
      actorEmail: member?.email,
      action: 'proxy_revoked',
      targetType: 'proxy',
      targetId: proxyId,
    });

    toast.success('Proxy authorization revoked.');
    loadProxies();
  }

  if (!votingConfig.proxy_voting_allowed) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-secondary-500" />
            Proxy Voting
          </DialogTitle>
          <DialogDescription>
            Authorize another member to vote on your behalf.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-text-muted-light dark:text-text-muted-dark" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Active proxies */}
            {proxies.length > 0 ? (
              <div className="space-y-2">
                <p className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                  Active Authorizations
                </p>
                {proxies.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-inner-card border border-stroke-light dark:border-stroke-dark p-3"
                  >
                    <div>
                      <p className="text-body font-medium text-text-primary-light dark:text-text-primary-dark">
                        {p.grantee_name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[10px]">
                          {p.status}
                        </Badge>
                        {p.expires_at && (
                          <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
                            Expires {format(new Date(p.expires_at), 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRevoke(p.id)}
                      className="text-red-500 hover:text-red-600 shrink-0"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-body text-text-muted-light dark:text-text-muted-dark text-center py-4">
                No active proxy authorizations.
              </p>
            )}

            {/* Grant new proxy */}
            {showGrant ? (
              <div className="space-y-3 rounded-inner-card border border-stroke-light dark:border-stroke-dark p-3">
                <p className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                  Grant Proxy To
                </p>
                <Select value={selectedGrantee} onValueChange={setSelectedGrantee}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a member" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="space-y-1.5">
                  <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                    Expires (optional)
                  </label>
                  <Input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                  <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                    Defaults to {votingConfig.proxy_validity_days} days if not set.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowGrant(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleGrant} disabled={!selectedGrantee || submitting}>
                    {submitting ? 'Granting...' : 'Grant Proxy'}
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" className="w-full" onClick={() => setShowGrant(true)}>
                <UserPlus className="h-4 w-4 mr-1" />
                Grant Proxy Authorization
              </Button>
            )}
          </div>
        )}

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
