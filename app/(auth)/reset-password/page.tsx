'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { sendPasswordSetupLink } from '@/lib/actions/auth-actions';

type PageMode = 'loading' | 'request-reset' | 'set-password';

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordInner />
    </Suspense>
  );
}

function ResetPasswordInner() {
  const [mode, setMode] = useState<PageMode>('loading');
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    async function detectSession() {
      const supabase = createClient();

      // If we have a recovery token from our verify-recovery redirect,
      // verify it client-side to establish the session in the browser
      const token = searchParams.get('token');
      if (token) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'recovery',
        });

        if (error) {
          console.error('Recovery verification failed:', error);
          setVerifyError('This reset link has expired. Please request a new one.');
          setMode('request-reset');
          return;
        }

        // Session established, show set-password form
        setMode('set-password');
        return;
      }

      // No token: check if user already has a session (e.g. from Supabase callback)
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setMode('set-password');
      } else {
        setMode('request-reset');
      }
    }
    detectSession();
  }, [searchParams]);

  if (mode === 'loading') {
    return (
      <div className="rounded-panel p-card-padding bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark surface-elevation">
        <div className="text-center">
          <p className="text-body text-text-muted-light dark:text-text-muted-dark">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  if (mode === 'set-password') {
    return <SetPasswordForm />;
  }

  return <RequestResetForm initialError={verifyError} />;
}

function SetPasswordForm() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSetPassword(e: React.FormEvent) {
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

    setLoading(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);

    // Look up community slug and redirect to dashboard
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: memberRows } = await supabase
        .from('members')
        .select('community_id')
        .eq('user_id', user.id)
        .eq('is_approved', true);

      if (memberRows && memberRows.length === 1) {
        const { data: community } = await supabase
          .from('communities')
          .select('slug')
          .eq('id', memberRows[0].community_id)
          .single();

        if (community?.slug) {
          setTimeout(() => {
            router.push(`/${community.slug}/dashboard`);
          }, 1500);
          return;
        }
      } else if (memberRows && memberRows.length > 1) {
        // Multiple communities: redirect to login with community picker
        setTimeout(() => {
          router.push('/login?select_community=1');
        }, 1500);
        return;
      }
    }

    // Fallback if we cannot determine the community
    setTimeout(() => {
      router.push('/login');
    }, 1500);
  }

  if (success) {
    return (
      <div className="rounded-panel p-card-padding bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark surface-elevation">
        <div className="text-center mb-6">
          <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">
            Password updated
          </h1>
          <p className="text-body text-text-muted-light dark:text-text-muted-dark mt-2">
            Your password has been set. Redirecting you now...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-panel p-card-padding bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark surface-elevation">
      <div className="text-center mb-6">
        <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">
          Set new password
        </h1>
        <p className="text-body text-text-muted-light dark:text-text-muted-dark mt-1">
          Choose a password for your account
        </p>
      </div>

      <form onSubmit={handleSetPassword} className="space-y-4">
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
            New password
          </label>
          <input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            className="w-full h-10 px-3 rounded-pill bg-surface-light-2 dark:bg-surface-dark-2 border border-stroke-light dark:border-stroke-dark text-body text-text-primary-light dark:text-text-primary-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-secondary-400/30 transition-all"
          />
        </div>

        <div>
          <label
            htmlFor="confirm-password"
            className="text-label text-text-secondary-light dark:text-text-secondary-dark block mb-1.5"
          >
            Confirm password
          </label>
          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full h-10 px-3 rounded-pill bg-surface-light-2 dark:bg-surface-dark-2 border border-stroke-light dark:border-stroke-dark text-body text-text-primary-light dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-secondary-400/30 transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-10 rounded-pill bg-secondary-400 text-label font-semibold text-primary-900 hover:bg-secondary-300 active:bg-secondary-500 focus:outline-none focus:ring-2 focus:ring-secondary-300/40 transition-all shadow-lg shadow-secondary-400/20 disabled:opacity-50 disabled:pointer-events-none"
        >
          {loading ? 'Updating...' : 'Set password'}
        </button>

        <div className="text-center">
          <Link
            href="/login"
            className="text-meta text-secondary-500 dark:text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 transition-colors"
          >
            Back to login
          </Link>
        </div>
      </form>
    </div>
  );
}

function RequestResetForm({ initialError }: { initialError?: string | null }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(initialError || null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Send via our server action (Resend-based, branded email)
    // Always returns success to avoid leaking whether email exists
    await sendPasswordSetupLink(email);

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="rounded-panel p-card-padding bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark surface-elevation">
        <div className="text-center mb-6">
          <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">
            Check your email
          </h1>
          <p className="text-body text-text-muted-light dark:text-text-muted-dark mt-2">
            If an account exists for {email}, you will receive a password reset
            link shortly.
          </p>
        </div>
        <div className="flex justify-center">
          <Link
            href="/login"
            className="h-10 px-8 rounded-pill border border-stroke-light dark:border-stroke-dark text-label text-secondary-500 dark:text-secondary-400 hover:bg-secondary-50 dark:hover:bg-surface-dark-2 transition-colors inline-flex items-center justify-center"
          >
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-panel p-card-padding bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark surface-elevation">
      <div className="text-center mb-6">
        <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">
          Reset password
        </h1>
        <p className="text-body text-text-muted-light dark:text-text-muted-dark mt-1">
          Enter your email and we will send you a reset link
        </p>
      </div>

      <form onSubmit={handleReset} className="space-y-4">
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

        <button
          type="submit"
          disabled={loading}
          className="w-full h-10 rounded-pill bg-secondary-400 text-label font-semibold text-primary-900 hover:bg-secondary-300 active:bg-secondary-500 focus:outline-none focus:ring-2 focus:ring-secondary-300/40 transition-all shadow-lg shadow-secondary-400/20 disabled:opacity-50 disabled:pointer-events-none"
        >
          {loading ? 'Sending...' : 'Send reset link'}
        </button>

        <div className="text-center">
          <Link
            href="/login"
            className="text-meta text-secondary-500 dark:text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 transition-colors"
          >
            Back to login
          </Link>
        </div>
      </form>
    </div>
  );
}
