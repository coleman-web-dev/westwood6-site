'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/shared/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { sendWelcomeInvites } from '@/lib/actions/email-actions';
import { toast } from 'sonner';
import { Copy, Mail, Check, UserPlus } from 'lucide-react';

interface InvitableMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export function StepSendInvites({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const { community } = useCommunity();
  const [members, setMembers] = useState<InvitableMember[]>([]);
  const [signedUpCount, setSignedUpCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [creatingAccounts, setCreatingAccounts] = useState(false);
  const [accountsCreated, setAccountsCreated] = useState(false);

  useEffect(() => {
    async function fetchMembers() {
      try {
        const supabase = createClient();

        // Fetch members with email but no user_id (haven't signed up yet)
        const { data: invitable, error: invError } = await supabase
          .from('members')
          .select('id, first_name, last_name, email')
          .eq('community_id', community.id)
          .eq('is_approved', true)
          .not('email', 'is', null)
          .is('user_id', null);

        if (invError) {
          console.error('Error fetching invitable members:', invError);
        } else {
          setMembers(
            (invitable || []).filter(
              (m): m is InvitableMember => m.email !== null,
            ),
          );
        }

        // Count members who already have a user_id (signed up)
        const { count, error: countError } = await supabase
          .from('members')
          .select('*', { count: 'exact', head: true })
          .eq('community_id', community.id)
          .eq('is_approved', true)
          .not('email', 'is', null)
          .not('user_id', 'is', null);

        if (countError) {
          console.error('Error counting signed up members:', countError);
        } else {
          setSignedUpCount(count ?? 0);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchMembers();
  }, [community.id]);

  async function handleSendInvites() {
    if (members.length === 0) return;

    setSending(true);
    try {
      const memberList = members.map((m) => ({
        email: m.email,
        name: `${m.first_name} ${m.last_name}`,
      }));

      const result = await sendWelcomeInvites(
        community.id,
        community.slug,
        community.name,
        memberList,
      );

      if (result.success) {
        toast.success(
          `Welcome emails queued for ${result.count} member${result.count !== 1 ? 's' : ''}.`,
        );
        setSent(true);
      } else {
        toast.error(result.error || 'Failed to send welcome emails.');
      }
    } catch (err) {
      console.error('Error sending invites:', err);
      toast.error('An unexpected error occurred.');
    } finally {
      setSending(false);
    }
  }

  async function handleCreateAccounts() {
    setCreatingAccounts(true);
    try {
      const res = await fetch('/api/stripe/pre-create-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ communityId: community.id }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Created " + data.created + " accounts. " + data.alreadyExists + " already existed.");
        setAccountsCreated(true);
      } else {
        toast.error(data.error || 'Failed to create accounts');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setCreatingAccounts(false);
    }
  }

  const handleCopyLink = useCallback(
    async (member: InvitableMember) => {
      const baseUrl =
        typeof window !== 'undefined' ? window.location.origin : '';
      const link = `${baseUrl}/${community.slug}?invite=true&email=${encodeURIComponent(member.email)}`;

      try {
        await navigator.clipboard.writeText(link);
        setCopiedId(member.id);
        toast.success('Invite link copied to clipboard.');
        setTimeout(() => setCopiedId(null), 2000);
      } catch {
        toast.error('Failed to copy link.');
      }
    },
    [community.slug],
  );

  return (
    <div className="bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark rounded-panel p-card-padding">
      <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark mb-1">
        Create Member Accounts
      </h2>
      <p className="text-body text-text-secondary-light dark:text-text-secondary-dark mb-6">
        Set up login accounts for your community members, then send welcome emails so they know how to sign in.
      </p>

      {loading ? (
        <div className="py-8 text-center">
          <p className="text-body text-text-muted-light dark:text-text-muted-dark">
            Loading members...
          </p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="mb-4 rounded-md border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-3">
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              <p className="text-body text-text-secondary-light dark:text-text-secondary-dark">
                <span className="font-semibold text-text-primary-light dark:text-text-primary-dark">
                  {members.length}
                </span>{' '}
                member{members.length !== 1 ? 's' : ''} with email, pending
                sign-up
              </p>
              <p className="text-body text-text-secondary-light dark:text-text-secondary-dark">
                <span className="font-semibold text-text-primary-light dark:text-text-primary-dark">
                  {signedUpCount}
                </span>{' '}
                already signed up
              </p>
            </div>
          </div>

          {members.length > 0 && (
            <>
              {/* Action buttons */}
              <div className="mb-4 space-y-2">
                <Button
                  type="button"
                  onClick={handleCreateAccounts}
                  disabled={creatingAccounts || accountsCreated}
                  variant="outline"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  {accountsCreated
                    ? 'Accounts Created'
                    : creatingAccounts
                      ? 'Creating...'
                      : `Create Login Accounts (${members.length})`}
                </Button>
                <Button
                  type="button"
                  onClick={handleSendInvites}
                  disabled={sending || sent}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  {sent
                    ? 'Emails Queued'
                    : sending
                      ? 'Sending...'
                      : `Send Welcome Emails (${members.length})`}
                </Button>
              </div>

              {/* Member list */}
              <div className="max-h-64 overflow-auto rounded-md border border-stroke-light dark:border-stroke-dark">
                <table className="w-full text-left">
                  <thead className="bg-surface-light dark:bg-surface-dark sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-label text-text-secondary-light dark:text-text-secondary-dark font-medium">
                        Name
                      </th>
                      <th className="px-3 py-2 text-label text-text-secondary-light dark:text-text-secondary-dark font-medium">
                        Email
                      </th>
                      <th className="px-3 py-2 text-label text-text-secondary-light dark:text-text-secondary-dark font-medium text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stroke-light dark:divide-stroke-dark">
                    {members.map((member) => (
                      <tr key={member.id}>
                        <td className="px-3 py-2 text-body text-text-primary-light dark:text-text-primary-dark">
                          {member.first_name} {member.last_name}
                        </td>
                        <td className="px-3 py-2 text-body text-text-secondary-light dark:text-text-secondary-dark">
                          {member.email}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyLink(member)}
                            title="Copy invite link"
                          >
                            {copiedId === member.id ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                            <span className="sr-only">Copy invite link</span>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {members.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-body text-text-muted-light dark:text-text-muted-dark">
                {signedUpCount > 0
                  ? 'All members with email addresses have already signed up.'
                  : 'No members with email addresses found. You can invite members later from the dashboard.'}
              </p>
            </div>
          )}
        </>
      )}

      <div className="flex justify-between pt-6">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>

        <Button type="button" onClick={onNext}>
          Next
        </Button>
      </div>
    </div>
  );
}
