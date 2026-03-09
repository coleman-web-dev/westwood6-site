'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  sendPasswordSetupLink,
  logLoginAttempt,
} from '@/lib/actions/auth-actions';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(false);
  const [setupLinkSent, setSetupLinkSent] = useState(false);
  const [sendingSetupLink, setSendingSetupLink] = useState(false);

  // MFA state
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaVerifying, setMfaVerifying] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNeedsPasswordSetup(false);
    setSetupLinkSent(false);
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      logLoginAttempt(email, false);
      // Show both the error and a "first time?" option so users who need
      // to set their password can do so, without revealing whether the
      // email exists in the system (prevents email enumeration).
      if (authError.message === 'Invalid login credentials') {
        setError(authError.message);
        setNeedsPasswordSetup(true);
      } else {
        setError(authError.message);
      }
      setLoading(false);
      return;
    }

    // Check if MFA is required
    const { data: aalData } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (
      aalData &&
      aalData.currentLevel === 'aal1' &&
      aalData.nextLevel === 'aal2'
    ) {
      // User has MFA enrolled, need to verify
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const totpFactor = factorsData?.totp?.find(
        (f: { status: string }) => f.status === 'verified',
      );

      if (totpFactor) {
        setMfaRequired(true);
        setMfaFactorId(totpFactor.id);
        setLoading(false);
        return;
      }
    }

    // No MFA needed, proceed with redirect
    await completeLogin();
  }

  async function handleMfaVerify() {
    if (!mfaFactorId || mfaCode.length !== 6) return;
    setMfaVerifying(true);
    setError(null);

    const supabase = createClient();

    const { data: challenge, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId: mfaFactorId });

    if (challengeError || !challenge) {
      setError('Failed to create MFA challenge. Please try again.');
      setMfaVerifying(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: mfaFactorId,
      challengeId: challenge.id,
      code: mfaCode,
    });

    if (verifyError) {
      setError(
        'Invalid code. Please check your authenticator app and try again.',
      );
      setMfaCode('');
      setMfaVerifying(false);
      return;
    }

    await completeLogin();
  }

  async function completeLogin() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      logLoginAttempt(email, true, user.id);

      const { data: member } = await supabase
        .from('members')
        .select('community_id')
        .eq('user_id', user.id)
        .eq('is_approved', true)
        .single();

      if (member?.community_id) {
        const { data: community } = await supabase
          .from('communities')
          .select('slug')
          .eq('id', member.community_id)
          .single();

        if (community?.slug) {
          router.push(redirect || `/${community.slug}/dashboard`);
          return;
        }
      }
    }

    setError(
      'Your account is pending approval. You will be notified when access is granted.',
    );
    setLoading(false);
  }

  async function handleSendSetupLink() {
    setSendingSetupLink(true);
    setError(null);
    const result = await sendPasswordSetupLink(email);
    setSendingSetupLink(false);
    if (result.success) {
      setSetupLinkSent(true);
    } else {
      setError(result.error || 'Failed to send setup link');
    }
  }

  // State: MFA verification required
  if (mfaRequired) {
    return (
      <div className="rounded-panel p-card-padding bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark surface-elevation">
        <div className="text-center mb-6">
          <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">
            Two-factor authentication
          </h1>
          <p className="text-body text-text-muted-light dark:text-text-muted-dark mt-2">
            Enter the 6-digit code from your authenticator app.
          </p>
        </div>

        <div className="space-y-4">
          {error && (
            <div className="rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2 border border-warning-dot/20 p-3 text-body text-warning-dot">
              {error}
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
              value={mfaCode}
              onChange={(e) =>
                setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter' && mfaCode.length === 6) {
                  handleMfaVerify();
                }
              }}
              className="w-full h-10 px-3 rounded-pill bg-surface-light-2 dark:bg-surface-dark-2 border border-stroke-light dark:border-stroke-dark text-body text-text-primary-light dark:text-text-primary-dark text-center font-mono text-lg tracking-[0.3em] placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-secondary-400/30 transition-all"
              autoFocus
            />
          </div>

          <button
            type="button"
            onClick={handleMfaVerify}
            disabled={mfaVerifying || mfaCode.length !== 6}
            className="w-full h-10 rounded-pill bg-secondary-400 text-label font-semibold text-primary-900 hover:bg-secondary-300 active:bg-secondary-500 focus:outline-none focus:ring-2 focus:ring-secondary-300/40 transition-all shadow-lg shadow-secondary-400/20 disabled:opacity-50 disabled:pointer-events-none"
          >
            {mfaVerifying ? 'Verifying...' : 'Verify'}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setMfaRequired(false);
                setMfaFactorId(null);
                setMfaCode('');
                setError(null);
              }}
              className="text-meta text-secondary-500 dark:text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 transition-colors"
            >
              Back to login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // State: setup link sent successfully
  if (setupLinkSent) {
    return (
      <div className="rounded-panel p-card-padding bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark surface-elevation">
        <div className="text-center mb-6">
          <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">
            Check your email
          </h1>
          <p className="text-body text-text-muted-light dark:text-text-muted-dark mt-2">
            We sent a link to <strong>{email}</strong> to set your password.
            Click the link in your email, then come back and sign in.
          </p>
        </div>
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => {
              setSetupLinkSent(false);
              setNeedsPasswordSetup(false);
              setError(null);
            }}
            className="h-10 px-8 rounded-pill border border-stroke-light dark:border-stroke-dark text-label text-secondary-500 dark:text-secondary-400 hover:bg-secondary-50 dark:hover:bg-surface-dark-2 transition-colors inline-flex items-center justify-center"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  // State: needs password setup (login failed, offer first-time setup)
  if (needsPasswordSetup) {
    return (
      <div className="rounded-panel p-card-padding bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark surface-elevation">
        <div className="text-center mb-6">
          <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">
            Unable to sign in
          </h1>
          <p className="text-body text-text-muted-light dark:text-text-muted-dark mt-2">
            The email or password you entered is incorrect. If this is your
            first time signing in, you may need to set up your password.
          </p>
        </div>

        <div className="space-y-4">
          {error && (
            <div className="rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2 border border-warning-dot/20 p-3 text-body text-warning-dot">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleSendSetupLink}
            disabled={sendingSetupLink}
            className="w-full h-10 rounded-pill bg-secondary-400 text-label font-semibold text-primary-900 hover:bg-secondary-300 active:bg-secondary-500 focus:outline-none focus:ring-2 focus:ring-secondary-300/40 transition-all shadow-lg shadow-secondary-400/20 disabled:opacity-50 disabled:pointer-events-none"
          >
            {sendingSetupLink ? 'Sending...' : 'Send password setup link'}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setNeedsPasswordSetup(false);
                setError(null);
              }}
              className="text-meta text-secondary-500 dark:text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Default state: regular login form
  return (
    <div className="rounded-panel p-card-padding bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark surface-elevation">
      <div className="text-center mb-6">
        <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">
          Welcome back
        </h1>
        <p className="text-body text-text-muted-light dark:text-text-muted-dark mt-1">
          Sign in to your household account
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        {error && (
          <div className="rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2 border border-warning-dot/20 p-3 text-body text-warning-dot">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="text-label text-text-secondary-light dark:text-text-secondary-dark block mb-1.5"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full h-10 px-3 rounded-pill bg-surface-light-2 dark:bg-surface-dark-2 border border-stroke-light dark:border-stroke-dark text-body text-text-primary-light dark:text-text-primary-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-secondary-400/30 transition-all"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="password"
              className="text-label text-text-secondary-light dark:text-text-secondary-dark"
            >
              Password
            </label>
            <Link
              href="/reset-password"
              className="text-meta text-secondary-500 dark:text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full h-10 px-3 rounded-pill bg-surface-light-2 dark:bg-surface-dark-2 border border-stroke-light dark:border-stroke-dark text-body text-text-primary-light dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-secondary-400/30 transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-10 rounded-pill bg-secondary-400 text-label font-semibold text-primary-900 hover:bg-secondary-300 active:bg-secondary-500 focus:outline-none focus:ring-2 focus:ring-secondary-300/40 transition-all shadow-lg shadow-secondary-400/20 disabled:opacity-50 disabled:pointer-events-none"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>

        <p className="text-center text-meta text-text-muted-light dark:text-text-muted-dark">
          Need an account?{' '}
          <Link
            href="/signup"
            className="text-secondary-500 dark:text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 font-medium transition-colors"
          >
            Request access
          </Link>
        </p>
      </form>
    </div>
  );
}
