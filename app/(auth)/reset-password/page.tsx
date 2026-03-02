'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo: `${window.location.origin}/auth/callback?type=recovery` },
    );

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

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
