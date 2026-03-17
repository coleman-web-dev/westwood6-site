'use client';

import { useState, useEffect } from 'react';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { DnsInstructions } from '@/components/settings/email-dns-instructions';
import {
  Globe,
  Sparkles,
  Mail,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Loader2,
  Clock,
  Info,
  Check,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from '@/components/shared/ui/hover-card';
import type { EmailSettings, CommunityEmailDomain, EmailAddress, DnsRecord } from '@/lib/types/database';

type SendingMode = 'default' | 'subdomain' | 'custom_domain';

interface DomainOptionInfo {
  title: string;
  description: string;
  emailClients: string;
  pros: string[];
  cons: string[];
}

const OPTION_INFO: Record<SendingMode, DomainOptionInfo> = {
  custom_domain: {
    title: 'Your Own Domain',
    description:
      'Emails come from your community\'s own website address, like treasurer@westwood6.com. Board members can use this email right inside Gmail, Outlook, or Apple Mail on their phone or computer, just like any other email address.',
    emailClients:
      'Yes. Board members can add this to Gmail, Outlook, Apple Mail, or any other email app on their phone or computer.',
    pros: [
      'Looks the most professional to residents',
      'Board members can read and send emails from their phone or computer using Gmail, Outlook, or Apple Mail',
      'Create separate addresses for each role (treasurer@, president@, board@)',
      'When someone leaves the board, one click hands the email over to the new person and cuts off the old person\'s access',
      'Also works from the DuesIQ dashboard',
    ],
    cons: [
      'Someone with access to your website domain settings needs to add a few records (we walk you through it)',
      'Takes a few minutes to set up',
      'After setup, it can take up to 3 days for everything to go live',
    ],
  },
  subdomain: {
    title: 'Community Address',
    description:
      'Your community gets its own email address like westwood6@duesiq.com. Board members can read and send emails, but only from the DuesIQ website. It will not show up in Gmail or other email apps.',
    emailClients:
      'No. This only works on the DuesIQ website. You cannot add it to Gmail, Outlook, or other email apps.',
    pros: [
      'Ready to go instantly, no setup needed',
      'All board members share the same inbox on the DuesIQ website',
      'Great if your board mostly works from the dashboard',
    ],
    cons: [
      'Does not work in Gmail, Outlook, or Apple Mail',
      'Less professional looking than using your own domain',
      'Says "duesiq.com" instead of your community\'s name',
    ],
  },
  default: {
    title: 'Default',
    description:
      'Emails go out from a generic DuesIQ address (notifications@duesiq.com). This is one-way only. Residents receive emails from you, but there is no inbox for reading replies.',
    emailClients:
      'No. There is no inbox with this option, so there is nothing to add to Gmail or other apps.',
    pros: [
      'Nothing to set up, it just works',
      'Fine if you only need to send announcements and payment reminders',
    ],
    cons: [
      'No way to receive or read replies from residents',
      'Does not work in Gmail, Outlook, or Apple Mail',
      'Emails come from a generic address, not your community\'s name',
      'Residents cannot email the board back directly',
    ],
  },
};

function OptionInfoCard({ mode }: { mode: SendingMode }) {
  const info = OPTION_INFO[mode];
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className="p-0.5 rounded hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <Info className="h-3.5 w-3.5 text-text-muted-light dark:text-text-muted-dark" />
        </button>
      </HoverCardTrigger>
      <HoverCardContent
        side="bottom"
        align="start"
        className="w-80 bg-surface-light dark:bg-surface-dark border-stroke-light dark:border-stroke-dark p-4"
      >
        <div className="space-y-3">
          <p className="text-body text-text-secondary-light dark:text-text-secondary-dark">
            {info.description}
          </p>

          <div>
            <p className="text-meta font-semibold text-text-primary-light dark:text-text-primary-dark mb-1">
              Can I use this in Gmail or Outlook?
            </p>
            <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
              {info.emailClients}
            </p>
          </div>

          <div>
            <p className="text-meta font-semibold text-green-600 dark:text-green-400 mb-1">Pros</p>
            <ul className="space-y-1">
              {info.pros.map((pro) => (
                <li key={pro} className="flex items-start gap-1.5 text-meta text-text-secondary-light dark:text-text-secondary-dark">
                  <Check className="h-3 w-3 text-green-500 shrink-0 mt-0.5" />
                  <span>{pro}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-meta font-semibold text-red-500 dark:text-red-400 mb-1">Cons</p>
            <ul className="space-y-1">
              {info.cons.map((con) => (
                <li key={con} className="flex items-start gap-1.5 text-meta text-text-secondary-light dark:text-text-secondary-dark">
                  <X className="h-3 w-3 text-red-400 shrink-0 mt-0.5" />
                  <span>{con}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export function EmailDomainSetup() {
  const { community } = useCommunity();
  const emailSettings = community?.theme?.email_settings as EmailSettings | undefined;

  const [activeMode, setActiveMode] = useState<SendingMode>(emailSettings?.sending_mode || 'default');
  const [domain, setDomain] = useState<CommunityEmailDomain | null>(null);
  const [addresses, setAddresses] = useState<EmailAddress[]>([]);
  const [loading, setLoading] = useState(true);

  // Custom domain form
  const [domainInput, setDomainInput] = useState('');
  const [fromAddressInput, setFromAddressInput] = useState('');
  const [addingDomain, setAddingDomain] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [removingDomain, setRemovingDomain] = useState(false);
  const [activatingSubdomain, setActivatingSubdomain] = useState(false);

  // Fetch current domain status
  useEffect(() => {
    if (!community) return;

    async function fetchStatus() {
      try {
        const res = await fetch(`/api/email/domains/status?communityId=${community!.id}`);
        const data = await res.json();
        if (data.domain) {
          setDomain(data.domain);
          setAddresses(data.addresses || []);
          setActiveMode(data.domain.domain_type === 'subdomain' ? 'subdomain' : 'custom_domain');
        } else {
          setActiveMode(emailSettings?.sending_mode || 'default');
        }
      } catch {
        // Ignore fetch errors on load
      }
      setLoading(false);
    }

    fetchStatus();
  }, [community, emailSettings?.sending_mode]);

  async function handleActivateSubdomain() {
    if (!community) return;
    setActivatingSubdomain(true);

    try {
      const res = await fetch('/api/email/domains/subdomain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ communityId: community.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to activate subdomain');
        return;
      }

      setActiveMode('subdomain');
      toast.success(`Email address activated: ${data.address}`);
      // Refresh status
      const statusRes = await fetch(`/api/email/domains/status?communityId=${community.id}`);
      const statusData = await statusRes.json();
      if (statusData.domain) {
        setDomain(statusData.domain);
        setAddresses(statusData.addresses || []);
      }
    } catch {
      toast.error('Failed to activate subdomain');
    } finally {
      setActivatingSubdomain(false);
    }
  }

  async function handleAddDomain() {
    if (!community || !domainInput.trim() || !fromAddressInput.trim()) return;
    setAddingDomain(true);

    try {
      const res = await fetch('/api/email/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          communityId: community.id,
          domainName: domainInput.trim(),
          fromAddress: fromAddressInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to add domain');
        return;
      }

      setDomain(data.domain);
      setActiveMode('custom_domain');
      setDomainInput('');
      setFromAddressInput('');
      toast.success('Domain added. Add the DNS records below to verify.');

      // Refresh addresses
      const addrRes = await fetch(`/api/email/addresses?communityId=${community.id}`);
      const addrData = await addrRes.json();
      setAddresses(addrData.addresses || []);
    } catch {
      toast.error('Failed to add domain');
    } finally {
      setAddingDomain(false);
    }
  }

  async function handleVerify() {
    if (!community) return;
    setVerifying(true);

    try {
      const res = await fetch('/api/email/domains/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ communityId: community.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Verification failed');
        return;
      }

      if (data.isVerified) {
        toast.success('Domain verified! Emails will now send from your domain.');
      } else {
        toast.info('DNS records not yet verified. This can take up to 72 hours.');
      }

      // Refresh domain status
      const statusRes = await fetch(`/api/email/domains/status?communityId=${community.id}`);
      const statusData = await statusRes.json();
      if (statusData.domain) {
        setDomain(statusData.domain);
      }
    } catch {
      toast.error('Verification check failed');
    } finally {
      setVerifying(false);
    }
  }

  async function handleRemoveDomain() {
    if (!community) return;
    setRemovingDomain(true);

    try {
      const res = await fetch('/api/email/domains', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ communityId: community.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Failed to remove domain');
        return;
      }

      setDomain(null);
      setAddresses([]);
      setActiveMode('default');
      toast.success('Email domain removed. Reverting to default.');
    } catch {
      toast.error('Failed to remove domain');
    } finally {
      setRemovingDomain(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4">
        <Loader2 className="h-4 w-4 animate-spin text-text-muted-light dark:text-text-muted-dark" />
        <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
          Loading email configuration...
        </span>
      </div>
    );
  }

  const hasDomain = !!domain;
  const isCustom = domain?.domain_type === 'custom';
  const isSubdomain = domain?.domain_type === 'subdomain';

  return (
    <div className="space-y-4">
      <h3 className="text-label text-text-primary-light dark:text-text-primary-dark">
        Email Domain
      </h3>
      <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
        Choose the email address your community uses to send and receive emails.
        This applies to notifications, announcements, and the community inbox.
      </p>

      {/* Mode cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        {/* Custom domain (first - most professional) */}
        <button
          onClick={() => !isSubdomain && setActiveMode('custom_domain')}
          disabled={isSubdomain}
          className={cn(
            'text-left rounded-inner-card border p-3 transition-colors',
            (activeMode === 'custom_domain' || isCustom)
              ? 'border-secondary-400 bg-secondary-50/50 dark:bg-secondary-950/20'
              : 'border-stroke-light dark:border-stroke-dark hover:bg-surface-light-2 dark:hover:bg-surface-dark-2',
            isSubdomain && 'opacity-50 cursor-not-allowed',
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            <Globe className="h-4 w-4 text-primary-600 dark:text-primary-400" />
            <span className="text-body font-medium text-text-primary-light dark:text-text-primary-dark flex-1">
              Your Own Domain
            </span>
            <OptionInfoCard mode="custom_domain" />
          </div>
          <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
            Use your own domain like board@yourdomain.com. Works in Gmail, Outlook, and Apple Mail.
          </p>
        </button>

        {/* Subdomain */}
        <button
          onClick={() => !isCustom && setActiveMode('subdomain')}
          disabled={isCustom}
          className={cn(
            'text-left rounded-inner-card border p-3 transition-colors',
            (activeMode === 'subdomain' || isSubdomain)
              ? 'border-secondary-400 bg-secondary-50/50 dark:bg-secondary-950/20'
              : 'border-stroke-light dark:border-stroke-dark hover:bg-surface-light-2 dark:hover:bg-surface-dark-2',
            isCustom && 'opacity-50 cursor-not-allowed',
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-secondary-500" />
            <span className="text-body font-medium text-text-primary-light dark:text-text-primary-dark flex-1">
              Community Address
            </span>
            <OptionInfoCard mode="subdomain" />
          </div>
          <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
            Send and receive as {community?.slug}@duesiq.com. Dashboard only.
          </p>
        </button>

        {/* Default */}
        <button
          onClick={() => !hasDomain && setActiveMode('default')}
          disabled={hasDomain}
          className={cn(
            'text-left rounded-inner-card border p-3 transition-colors',
            activeMode === 'default' && !hasDomain
              ? 'border-secondary-400 bg-secondary-50/50 dark:bg-secondary-950/20'
              : 'border-stroke-light dark:border-stroke-dark hover:bg-surface-light-2 dark:hover:bg-surface-dark-2',
            hasDomain && 'opacity-50 cursor-not-allowed',
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            <Mail className="h-4 w-4 text-text-muted-light dark:text-text-muted-dark" />
            <span className="text-body font-medium text-text-primary-light dark:text-text-primary-dark flex-1">
              Default
            </span>
            <OptionInfoCard mode="default" />
          </div>
          <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
            Send notifications from notifications@duesiq.com. No inbox.
          </p>
        </button>
      </div>

      {/* Subdomain activation */}
      {activeMode === 'subdomain' && !isSubdomain && !hasDomain && (
        <div className="rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2 p-3">
          <p className="text-body text-text-secondary-light dark:text-text-secondary-dark mb-3">
            Activate <strong>{community?.slug}@duesiq.com</strong> as your community&apos;s email
            address. No DNS setup required.
          </p>
          <Button onClick={handleActivateSubdomain} disabled={activatingSubdomain} size="sm">
            {activatingSubdomain ? 'Activating...' : 'Activate Community Address'}
          </Button>
        </div>
      )}

      {/* Subdomain active indicator */}
      {isSubdomain && (
        <div className="flex items-center justify-between rounded-inner-card bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-body text-green-700 dark:text-green-300">
              Active: {addresses[0]?.address || `${community?.slug}@duesiq.com`}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemoveDomain}
            disabled={removingDomain}
            className="text-red-500 hover:text-red-600"
          >
            {removingDomain ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </Button>
        </div>
      )}

      {/* Custom domain setup */}
      {activeMode === 'custom_domain' && !isCustom && !hasDomain && (
        <div className="rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2 p-3 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-body text-text-secondary-light dark:text-text-secondary-dark">
              Requires DNS access to your domain.
            </span>
          </div>

          <div className="space-y-1.5">
            <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Domain name
            </Label>
            <Input
              value={domainInput}
              onChange={(e) => {
                setDomainInput(e.target.value);
                if (fromAddressInput && !fromAddressInput.endsWith(`@${e.target.value}`)) {
                  setFromAddressInput(`board@${e.target.value}`);
                } else if (!fromAddressInput && e.target.value) {
                  setFromAddressInput(`board@${e.target.value}`);
                }
              }}
              placeholder="westwoodcommunitysix.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Default from address
            </Label>
            <Input
              value={fromAddressInput}
              onChange={(e) => setFromAddressInput(e.target.value)}
              placeholder="board@westwoodcommunitysix.com"
            />
          </div>

          <Button
            onClick={handleAddDomain}
            disabled={addingDomain || !domainInput.trim() || !fromAddressInput.trim()}
            size="sm"
          >
            {addingDomain ? 'Adding Domain...' : 'Add Domain'}
          </Button>
        </div>
      )}

      {/* Custom domain DNS setup */}
      {isCustom && domain && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary-600 dark:text-primary-400" />
              <span className="text-body font-medium text-text-primary-light dark:text-text-primary-dark">
                {domain.domain_name}
              </span>
              {domain.is_active ? (
                <span className="inline-flex items-center gap-1 text-meta text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-3 w-3" /> Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-meta text-amber-600 dark:text-amber-400">
                  <Clock className="h-3 w-3" /> Pending verification
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemoveDomain}
              disabled={removingDomain}
              className="text-red-500 hover:text-red-600"
            >
              {removingDomain ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                </>
              )}
            </Button>
          </div>

          <DnsInstructions
            records={(domain.dns_records as DnsRecord[]) || []}
            onVerify={handleVerify}
            verifying={verifying}
          />
        </div>
      )}
    </div>
  );
}
