'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/shared/ui/dialog';
import { toast } from 'sonner';
import { logMfaEvent } from '@/lib/actions/auth-actions';
import { useCommunity } from '@/lib/providers/community-provider';

interface Factor {
  id: string;
  friendly_name: string | null;
  factor_type: string;
  status: string;
  created_at: string;
}

export function MfaSettings() {
  const { member } = useCommunity();
  const [factors, setFactors] = useState<Factor[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [unenrolling, setUnenrolling] = useState(false);

  // Enrollment state
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    loadFactors();
  }, []);

  async function loadFactors() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.auth.mfa.listFactors();
    if (data) {
      setFactors(data.totp || []);
    }
    setLoading(false);
  }

  const verifiedFactors = factors.filter((f) => f.status === 'verified');
  const isEnabled = verifiedFactors.length > 0;

  async function startEnrollment() {
    setEnrolling(true);
    setVerifyCode('');
    const supabase = createClient();
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Authenticator App',
    });

    if (error || !data) {
      toast.error('Failed to start MFA enrollment. Please try again.');
      setEnrolling(false);
      return;
    }

    setFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
  }

  async function verifyEnrollment() {
    if (!factorId || verifyCode.length !== 6) return;
    setVerifying(true);

    const supabase = createClient();

    const { data: challenge, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId });

    if (challengeError || !challenge) {
      toast.error('Failed to create MFA challenge.');
      setVerifying(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: verifyCode,
    });

    if (verifyError) {
      toast.error('Invalid code. Please check your authenticator app and try again.');
      setVerifying(false);
      return;
    }

    toast.success('Two-factor authentication enabled successfully.');
    await logMfaEvent(
      member?.user_id || '',
      member?.email || '',
      member?.community_id || '',
      'enrolled',
    );
    setEnrolling(false);
    setQrCode(null);
    setSecret(null);
    setFactorId(null);
    setVerifyCode('');
    setVerifying(false);
    loadFactors();
  }

  async function handleUnenroll() {
    if (!verifiedFactors[0]) return;
    setUnenrolling(true);

    const supabase = createClient();
    const { error } = await supabase.auth.mfa.unenroll({
      factorId: verifiedFactors[0].id,
    });

    if (error) {
      toast.error('Failed to disable MFA. Please try again.');
      setUnenrolling(false);
      return;
    }

    toast.success('Two-factor authentication has been disabled.');
    await logMfaEvent(
      member?.user_id || '',
      member?.email || '',
      member?.community_id || '',
      'removed',
    );
    setUnenrolling(false);
    loadFactors();
  }

  function cancelEnrollment() {
    // If we created an unverified factor, unenroll it
    if (factorId) {
      const supabase = createClient();
      supabase.auth.mfa.unenroll({ factorId });
    }
    setEnrolling(false);
    setQrCode(null);
    setSecret(null);
    setFactorId(null);
    setVerifyCode('');
  }

  if (loading) {
    return (
      <div className="bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark rounded-panel p-card-padding">
        <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark mb-4">
          Two-Factor Authentication
        </h2>
        <p className="text-body text-text-muted-light dark:text-text-muted-dark">
          Loading...
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark rounded-panel p-card-padding">
        <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark mb-2">
          Two-Factor Authentication
        </h2>
        <p className="text-body text-text-muted-light dark:text-text-muted-dark mb-4">
          Add an extra layer of security to your account using an authenticator app.
        </p>

        {isEnabled ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-inner-card bg-mint/10 border border-mint/20">
              <div className="w-2 h-2 rounded-full bg-mint" />
              <span className="text-body text-text-primary-light dark:text-text-primary-dark">
                Two-factor authentication is enabled
              </span>
            </div>

            <div className="text-meta text-text-muted-light dark:text-text-muted-dark">
              Enabled on{' '}
              {new Date(verifiedFactors[0].created_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleUnenroll}
              disabled={unenrolling}
              className="text-warning-dot border-warning-dot/30 hover:bg-warning-dot/10"
            >
              {unenrolling ? 'Disabling...' : 'Disable MFA'}
            </Button>
          </div>
        ) : (
          <Button onClick={startEnrollment}>Enable MFA</Button>
        )}
      </div>

      {/* Enrollment Dialog */}
      <Dialog open={enrolling} onOpenChange={(open) => !open && cancelEnrollment()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Up Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Scan the QR code below with your authenticator app (Google Authenticator,
              Authy, etc.), then enter the 6-digit code to verify.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {qrCode && (
              <div className="flex justify-center">
                <img
                  src={qrCode}
                  alt="MFA QR Code"
                  className="w-48 h-48 rounded-inner-card border border-stroke-light dark:border-stroke-dark"
                />
              </div>
            )}

            {secret && (
              <div className="text-center">
                <p className="text-meta text-text-muted-light dark:text-text-muted-dark mb-1">
                  Or enter this code manually:
                </p>
                <code className="text-body font-mono bg-surface-light-2 dark:bg-surface-dark-2 px-3 py-1.5 rounded-inner-card select-all">
                  {secret}
                </code>
              </div>
            )}

            <div>
              <label
                htmlFor="mfa-code"
                className="text-label text-text-secondary-light dark:text-text-secondary-dark block mb-1.5"
              >
                Verification Code
              </label>
              <input
                id="mfa-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={verifyCode}
                onChange={(e) =>
                  setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && verifyCode.length === 6) {
                    verifyEnrollment();
                  }
                }}
                className="w-full h-10 px-3 rounded-pill bg-surface-light-2 dark:bg-surface-dark-2 border border-stroke-light dark:border-stroke-dark text-body text-text-primary-light dark:text-text-primary-dark text-center font-mono text-lg tracking-[0.3em] placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-secondary-400/30 transition-all"
                autoFocus
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={cancelEnrollment}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={verifyEnrollment}
                disabled={verifying || verifyCode.length !== 6}
              >
                {verifying ? 'Verifying...' : 'Verify & Enable'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
