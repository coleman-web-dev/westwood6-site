'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  checkIsFirstTimeUser,
  setupFirstTimePassword,
  logLoginAttempt,
} from '@/lib/actions/auth-actions';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

type CommunityOption = {
  id: string;
  slug: string;
  name: string;
};

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // First-time password setup state
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [settingUpPassword, setSettingUpPassword] = useState(false);

  // MFA state
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaVerifying, setMfaVerifying] = useState(false);

  // Community picker state
  const [showCommunityPicker, setShowCommunityPicker] = useState(false);
  const [communities, setCommunities] = useState<CommunityOption[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState('');

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');
  const selectCommunity = searchParams.get('select_community');

  // Handle redirect from OAuth callback when user has multiple communities
  useEffect(() => {
    if (selectCommunity === '1') {
      completeLogin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectCommunity]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsFirstTimeSetup(false);
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      logLoginAttempt(email, false);

      if (authError.message === 'Invalid login credentials') {
        // Check if this is a first-time pre-provisioned member
        const { isFirstTime } = await checkIsFirstTimeUser(email);
        if (isFirstTime) {
          // Show inline password creation form
          setIsFirstTimeSetup(true);
          setLoading(false);
          return;
        }
        // Not first-time: show generic error
        setError('The email or password you entered is incorrect.');
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

      // Fetch ALL approved memberships
      const { data: memberRows } = await supabase
        .from('members')
        .select('community_id')
        .eq('user_id', user.id)
        .eq('is_approved', true);

      if (!memberRows || memberRows.length === 0) {
        setError(
          'Your account is pending approval. You will be notified when access is granted.',
        );
        setLoading(false);
        return;
      }

      // Single community: redirect directly
      if (memberRows.length === 1) {
        const { data: community } = await supabase
          .from('communities')
          .select('slug')
          .eq('id', memberRows[0].community_id)
          .single();

        if (community?.slug) {
          router.push(redirect || `/${community.slug}/dashboard`);
          return;
        }
      }

      // Multiple communities: show picker
      const communityIds = memberRows.map((m) => m.community_id);
      const { data: communityList } = await supabase
        .from('communities')
        .select('id, slug, name')
        .in('id', communityIds)
        .order('name');

      if (communityList && communityList.length > 0) {
        setCommunities(communityList);
        setSelectedCommunity(communityList[0].slug);
        setShowCommunityPicker(true);
        setLoading(false);
        return;
      }
    }

    setError(
      'Your account is pending approval. You will be notified when access is granted.',
    );
    setLoading(false);
  }

  async function handleFirstTimeSetup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSettingUpPassword(true);

    const result = await setupFirstTimePassword(email, newPassword);
    if (!result.success) {
      setError(result.error || 'Failed to set up password. Please try again.');
      setSettingUpPassword(false);
      return;
    }

    // Password set successfully. Now sign in with it.
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: newPassword,
    });

    if (signInError) {
      setError('Password was set but sign-in failed. Please try signing in again.');
      setIsFirstTimeSetup(false);
      setSettingUpPassword(false);
      return;
    }

    logLoginAttempt(email, true);
    await completeLogin();
  }

  // State: Community picker (multi-community user)
  if (showCommunityPicker) {
    return (
      <div className="rounded-panel p-card-padding bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark surface-elevation">
        <div className="text-center mb-6">
          <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">
            Select Community
          </h1>
          <p className="text-body text-text-muted-light dark:text-text-muted-dark mt-2">
            Choose which community to manage.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="community-select"
              className="text-label text-text-secondary-light dark:text-text-secondary-dark block mb-1.5"
            >
              Community
            </label>
            <select
              id="community-select"
              value={selectedCommunity}
              onChange={(e) => setSelectedCommunity(e.target.value)}
              className="w-full h-10 px-3 rounded-pill bg-surface-light-2 dark:bg-surface-dark-2 border border-stroke-light dark:border-stroke-dark text-body text-text-primary-light dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-secondary-400/30 transition-all appearance-none"
            >
              {communities.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push(
                redirect || `/${selectedCommunity}/dashboard`,
              )
            }
            className="w-full h-10 rounded-pill bg-secondary-400 text-label font-semibold text-primary-900 hover:bg-secondary-300 active:bg-secondary-500 focus:outline-none focus:ring-2 focus:ring-secondary-300/40 transition-all shadow-lg shadow-secondary-400/20"
          >
            Continue
          </button>
        </div>
      </div>
    );
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

  // State: first-time member inline password creation
  if (isFirstTimeSetup) {
    return (
      <div className="rounded-panel p-card-padding bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark surface-elevation">
        <div className="text-center mb-6">
          <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">
            Welcome to DuesIQ
          </h1>
          <p className="text-body text-text-muted-light dark:text-text-muted-dark mt-2">
            We&apos;ve made some upgrades! Please create a password for your
            account.
          </p>
          <p className="text-meta text-text-muted-light dark:text-text-muted-dark mt-3">
            Setting up password for{' '}
            <strong className="text-text-primary-light dark:text-text-primary-dark">
              {email}
            </strong>
          </p>
        </div>

        <form onSubmit={handleFirstTimeSetup} className="space-y-4">
          {error && (
            <div className="rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2 border border-warning-dot/20 p-3 text-body text-warning-dot">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="new-password"
              className="text-label text-text-secondary-light dark:text-text-secondary-dark block mb-1.5"
            >
              New Password
            </label>
            <input
              id="new-password"
              type="password"
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              autoFocus
              className="w-full h-10 px-3 rounded-pill bg-surface-light-2 dark:bg-surface-dark-2 border border-stroke-light dark:border-stroke-dark text-body text-text-primary-light dark:text-text-primary-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-secondary-400/30 transition-all"
            />
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="text-label text-text-secondary-light dark:text-text-secondary-dark block mb-1.5"
            >
              Confirm Password
            </label>
            <input
              id="confirm-password"
              type="password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full h-10 px-3 rounded-pill bg-surface-light-2 dark:bg-surface-dark-2 border border-stroke-light dark:border-stroke-dark text-body text-text-primary-light dark:text-text-primary-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-secondary-400/30 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={settingUpPassword}
            className="w-full h-10 rounded-pill bg-secondary-400 text-label font-semibold text-primary-900 hover:bg-secondary-300 active:bg-secondary-500 focus:outline-none focus:ring-2 focus:ring-secondary-300/40 transition-all shadow-lg shadow-secondary-400/20 disabled:opacity-50 disabled:pointer-events-none"
          >
            {settingUpPassword
              ? 'Creating password...'
              : 'Create password & sign in'}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsFirstTimeSetup(false);
                setNewPassword('');
                setConfirmPassword('');
                setError(null);
              }}
              className="text-meta text-secondary-500 dark:text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 transition-colors"
            >
              Back to login
            </button>
          </div>
        </form>
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
