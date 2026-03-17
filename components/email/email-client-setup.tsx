'use client';

import { useState } from 'react';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/shared/ui/dialog';
import { Badge } from '@/components/shared/ui/badge';
import { cn } from '@/lib/utils';
import {
  Copy,
  Check,
  Loader2,
  Mail,
  ShieldAlert,
  KeyRound,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

interface SmtpCredentials {
  server: string;
  port: number;
  username: string;
  password: string;
  encryption: string;
}

interface EmailClientSetupProps {
  addressId: string;
  emailAddress: string;
  roleLabel: string | null;
  hasExistingCredentials: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCredentialsGenerated?: () => void;
}

type Tab = 'gmail' | 'outlook' | 'apple';

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success(`${label} copied`);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors"
      title={`Copy ${label}`}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-text-muted-light dark:text-text-muted-dark" />
      )}
    </button>
  );
}

function CredentialRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-inner-card border border-stroke-light dark:border-stroke-dark px-3 py-2">
      <div>
        <span className="text-meta text-text-muted-light dark:text-text-muted-dark block">
          {label}
        </span>
        <span className="text-body text-text-primary-light dark:text-text-primary-dark font-mono">
          {value}
        </span>
      </div>
      <CopyButton value={value} label={label} />
    </div>
  );
}

function StepItem({ number, children }: { number: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="w-6 h-6 rounded-full bg-secondary-400/15 text-secondary-500 flex items-center justify-center shrink-0 text-meta font-semibold">
        {number}
      </div>
      <div className="text-body text-text-secondary-light dark:text-text-secondary-dark pt-0.5">
        {children}
      </div>
    </div>
  );
}

export function EmailClientSetup({
  addressId,
  emailAddress,
  roleLabel,
  hasExistingCredentials,
  open,
  onOpenChange,
  onCredentialsGenerated,
}: EmailClientSetupProps) {
  const { community } = useCommunity();
  const [activeTab, setActiveTab] = useState<Tab>('gmail');
  const [generating, setGenerating] = useState(false);
  const [credentials, setCredentials] = useState<SmtpCredentials | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  async function handleGenerateCredentials() {
    if (!community) return;

    // If regenerating, show warning first
    if (hasExistingCredentials && !showWarning) {
      setShowWarning(true);
      return;
    }

    setGenerating(true);
    setShowWarning(false);

    try {
      const res = await fetch('/api/email/smtp-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addressId, communityId: community.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to generate credentials');
        return;
      }

      setCredentials(data.smtp);
      onCredentialsGenerated?.();
      toast.success('Credentials generated. Save the password now.');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  function handleClose(isOpen: boolean) {
    if (!isOpen) {
      // Reset state on close
      setCredentials(null);
      setShowWarning(false);
    }
    onOpenChange(isOpen);
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'gmail', label: 'Gmail' },
    { id: 'outlook', label: 'Outlook' },
    { id: 'apple', label: 'Apple Mail' },
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-secondary-500" />
            Set Up in Email App
          </DialogTitle>
          <DialogDescription>
            Use <strong>{emailAddress}</strong>
            {roleLabel ? ` (${roleLabel})` : ''} in your favorite email app so you can send and
            receive from your phone or computer.
          </DialogDescription>
        </DialogHeader>

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-stroke-light dark:border-stroke-dark">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-4 py-2 text-label transition-colors border-b-2 -mb-px',
                activeTab === tab.id
                  ? 'border-secondary-400 text-secondary-500'
                  : 'border-transparent text-text-muted-light dark:text-text-muted-dark hover:text-text-secondary-light dark:hover:text-text-secondary-dark'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-5 py-2">
          {/* Section 1: Receiving */}
          <div>
            <h4 className="text-label text-text-primary-light dark:text-text-primary-dark mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Receiving Emails
            </h4>
            <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
              Emails sent to {emailAddress} are automatically forwarded to your personal email.
              You will receive notifications just like any other email. This is already set up.
            </p>
          </div>

          {/* Section 2: Sending */}
          <div>
            <h4 className="text-label text-text-primary-light dark:text-text-primary-dark mb-2 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-secondary-500" />
              Sending Emails
            </h4>
            <p className="text-meta text-text-muted-light dark:text-text-muted-dark mb-3">
              To send emails as {emailAddress} from{' '}
              {activeTab === 'gmail'
                ? 'Gmail'
                : activeTab === 'outlook'
                  ? 'Outlook'
                  : 'Apple Mail'}
              , you need to generate credentials and add them to your email app.
            </p>

            {/* Generate / Regenerate credentials */}
            {!credentials ? (
              <div className="space-y-3">
                {showWarning && (
                  <div className="flex items-start gap-2 rounded-inner-card border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-3">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="text-meta text-amber-700 dark:text-amber-300">
                      This will revoke the current credentials. Anyone using the old credentials
                      will no longer be able to send from {emailAddress}. Continue?
                    </div>
                  </div>
                )}
                <Button
                  onClick={handleGenerateCredentials}
                  disabled={generating}
                  size="sm"
                  variant={showWarning ? 'destructive' : 'default'}
                >
                  {generating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : hasExistingCredentials ? (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  ) : (
                    <KeyRound className="h-4 w-4 mr-2" />
                  )}
                  {showWarning
                    ? 'Yes, regenerate credentials'
                    : hasExistingCredentials
                      ? 'Regenerate Credentials'
                      : 'Generate Credentials'}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Warning banner */}
                <div className="flex items-start gap-2 rounded-inner-card border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-3">
                  <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-meta text-amber-700 dark:text-amber-300">
                    <strong>Save the password now.</strong> It cannot be shown again. If you lose
                    it, you can regenerate new credentials.
                  </div>
                </div>

                {/* Credential fields */}
                <div className="space-y-2">
                  <CredentialRow label="SMTP Server" value={credentials.server} />
                  <CredentialRow label="Port" value={String(credentials.port)} />
                  <CredentialRow label="Username" value={credentials.username} />
                  <CredentialRow label="Password" value={credentials.password} />
                  <CredentialRow label="Encryption" value={credentials.encryption} />
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Step-by-step instructions */}
          <div>
            <h4 className="text-label text-text-primary-light dark:text-text-primary-dark mb-3 flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-text-muted-light dark:text-text-muted-dark" />
              {activeTab === 'gmail'
                ? 'Gmail Setup Steps'
                : activeTab === 'outlook'
                  ? 'Outlook Setup Steps'
                  : 'Apple Mail Setup Steps'}
            </h4>

            {activeTab === 'gmail' && (
              <div className="space-y-3">
                <StepItem number={1}>
                  Open <strong>Gmail</strong> on your computer (not the mobile app).
                </StepItem>
                <StepItem number={2}>
                  Click the <strong>gear icon</strong> (top right), then{' '}
                  <strong>See all settings</strong>.
                </StepItem>
                <StepItem number={3}>
                  Go to the <strong>Accounts and Import</strong> tab.
                </StepItem>
                <StepItem number={4}>
                  Under <strong>&quot;Send mail as&quot;</strong>, click{' '}
                  <strong>&quot;Add another email address&quot;</strong>.
                </StepItem>
                <StepItem number={5}>
                  Enter your name and <strong>{emailAddress}</strong>. Uncheck &quot;Treat as an
                  alias&quot;. Click <strong>Next Step</strong>.
                </StepItem>
                <StepItem number={6}>
                  Enter the SMTP credentials shown above:
                  <ul className="list-disc ml-4 mt-1 space-y-0.5">
                    <li>
                      SMTP Server: <code className="text-secondary-500">smtp.resend.com</code>
                    </li>
                    <li>
                      Port: <code className="text-secondary-500">587</code>
                    </li>
                    <li>
                      Username: <code className="text-secondary-500">resend</code>
                    </li>
                    <li>Password: the password shown above</li>
                    <li>
                      Connection: <strong>TLS</strong>
                    </li>
                  </ul>
                </StepItem>
                <StepItem number={7}>
                  Click <strong>Add Account</strong>. Gmail will send a confirmation email.
                </StepItem>
                <StepItem number={8}>
                  Check your inbox for the confirmation email and click the link or enter the code.
                </StepItem>
                <StepItem number={9}>
                  Done! When composing in Gmail, click the <strong>&quot;From&quot;</strong> field
                  to choose {emailAddress}.
                </StepItem>
              </div>
            )}

            {activeTab === 'outlook' && (
              <div className="space-y-3">
                <StepItem number={1}>
                  Open <strong>Outlook</strong> and go to{' '}
                  <strong>File &gt; Account Settings &gt; Account Settings</strong>.
                </StepItem>
                <StepItem number={2}>
                  Click <strong>New</strong> on the Email tab.
                </StepItem>
                <StepItem number={3}>
                  Choose <strong>Manual setup or additional server types</strong>, then click{' '}
                  <strong>Next</strong>.
                </StepItem>
                <StepItem number={4}>
                  Select <strong>POP or IMAP</strong>, then click <strong>Next</strong>.
                </StepItem>
                <StepItem number={5}>
                  Enter your name and <strong>{emailAddress}</strong> as the email address.
                </StepItem>
                <StepItem number={6}>
                  For outgoing mail server (SMTP), enter{' '}
                  <code className="text-secondary-500">smtp.resend.com</code>, port{' '}
                  <code className="text-secondary-500">587</code>.
                </StepItem>
                <StepItem number={7}>
                  Click <strong>More Settings &gt; Outgoing Server</strong> tab. Check &quot;My
                  outgoing server requires authentication&quot;. Enter username{' '}
                  <code className="text-secondary-500">resend</code> and the password shown above.
                </StepItem>
                <StepItem number={8}>
                  Under <strong>Advanced</strong>, set outgoing server encryption to{' '}
                  <strong>STARTTLS</strong>.
                </StepItem>
                <StepItem number={9}>
                  Click <strong>OK</strong>, then <strong>Next</strong> to complete setup.
                </StepItem>
              </div>
            )}

            {activeTab === 'apple' && (
              <div className="space-y-3">
                <StepItem number={1}>
                  Open <strong>System Settings</strong> (or System Preferences) and go to{' '}
                  <strong>Internet Accounts</strong>.
                </StepItem>
                <StepItem number={2}>
                  Click <strong>Add Account</strong>, then select <strong>Other Mail Account</strong>
                  .
                </StepItem>
                <StepItem number={3}>
                  Enter your name and <strong>{emailAddress}</strong>. Enter the password shown
                  above. Click <strong>Sign In</strong>.
                </StepItem>
                <StepItem number={4}>
                  If prompted for manual configuration, set the outgoing mail server to{' '}
                  <code className="text-secondary-500">smtp.resend.com</code>, port{' '}
                  <code className="text-secondary-500">587</code>, username{' '}
                  <code className="text-secondary-500">resend</code>.
                </StepItem>
                <StepItem number={5}>
                  Click <strong>Sign In</strong> to complete setup.
                </StepItem>
                <StepItem number={6}>
                  When composing in Mail, click the <strong>From</strong> field to select{' '}
                  {emailAddress}.
                </StepItem>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
