'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const searchParams = useSearchParams();
  const communitySlug = searchParams.get('community') || '';

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    const { data: community, error: communityError } = await supabase
      .from('communities')
      .select('id')
      .eq('slug', communitySlug)
      .single();

    if (communityError || !community) {
      setError(
        'Community not found. Please check the link you were given and try again.',
      );
      setLoading(false);
      return;
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    const { error: requestError } = await supabase
      .from('signup_requests')
      .insert({
        community_id: community.id,
        user_id: authData.user?.id,
        email,
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        unit_number: unitNumber || null,
      });

    if (requestError) {
      setError('Something went wrong submitting your request. Please try again.');
      setLoading(false);
      return;
    }

    // Notify board members via notification bell
    void supabase.rpc('create_board_notifications', {
      p_community_id: community.id,
      p_type: 'signup_request',
      p_title: 'New access request',
      p_body: `${firstName.trim()} ${lastName.trim()} (${email}) has requested access to the community.`,
      p_reference_id: null,
      p_reference_type: 'signup_request',
    });

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="rounded-panel p-card-padding bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark surface-elevation">
        <div className="text-center mb-6">
          <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">
            Request submitted
          </h1>
          <p className="text-body text-text-muted-light dark:text-text-muted-dark mt-2">
            Your request has been sent to the community board for review. You
            will receive an email once your account is approved.
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
          Request access
        </h1>
        <p className="text-body text-text-muted-light dark:text-text-muted-dark mt-1">
          Submit your information for board approval
        </p>
      </div>

      <form onSubmit={handleSignup} className="space-y-4">
        {error && (
          <div className="rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2 border border-warning-dot/20 p-3 text-body text-warning-dot">
            {error}
          </div>
        )}

        {!communitySlug && (
          <div className="rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2 border border-secondary-400/20 p-3 text-body text-secondary-500 dark:text-secondary-400">
            No community specified. Please use the signup link provided by
            your HOA.
          </div>
        )}

        <div className="grid grid-cols-2 gap-grid-gap">
          <div>
            <label
              htmlFor="firstName"
              className="text-label text-text-secondary-light dark:text-text-secondary-dark block mb-1.5"
            >
              First name
            </label>
            <input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="w-full h-10 px-3 rounded-pill bg-surface-light-2 dark:bg-surface-dark-2 border border-stroke-light dark:border-stroke-dark text-body text-text-primary-light dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-secondary-400/30 transition-all"
            />
          </div>
          <div>
            <label
              htmlFor="lastName"
              className="text-label text-text-secondary-light dark:text-text-secondary-dark block mb-1.5"
            >
              Last name
            </label>
            <input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="w-full h-10 px-3 rounded-pill bg-surface-light-2 dark:bg-surface-dark-2 border border-stroke-light dark:border-stroke-dark text-body text-text-primary-light dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-secondary-400/30 transition-all"
            />
          </div>
        </div>

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
          <label
            htmlFor="password"
            className="text-label text-text-secondary-light dark:text-text-secondary-dark block mb-1.5"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full h-10 px-3 rounded-pill bg-surface-light-2 dark:bg-surface-dark-2 border border-stroke-light dark:border-stroke-dark text-body text-text-primary-light dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-secondary-400/30 transition-all"
          />
        </div>

        <div>
          <label
            htmlFor="unitNumber"
            className="text-label text-text-secondary-light dark:text-text-secondary-dark block mb-1.5"
          >
            Unit / address number{' '}
            <span className="text-text-muted-light dark:text-text-muted-dark">(optional)</span>
          </label>
          <input
            id="unitNumber"
            value={unitNumber}
            onChange={(e) => setUnitNumber(e.target.value)}
            placeholder="e.g. 204, Lot 12, 123 Oak St"
            className="w-full h-10 px-3 rounded-pill bg-surface-light-2 dark:bg-surface-dark-2 border border-stroke-light dark:border-stroke-dark text-body text-text-primary-light dark:text-text-primary-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-secondary-400/30 transition-all"
          />
        </div>

        <div>
          <label
            htmlFor="phone"
            className="text-label text-text-secondary-light dark:text-text-secondary-dark block mb-1.5"
          >
            Phone{' '}
            <span className="text-text-muted-light dark:text-text-muted-dark">(optional)</span>
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full h-10 px-3 rounded-pill bg-surface-light-2 dark:bg-surface-dark-2 border border-stroke-light dark:border-stroke-dark text-body text-text-primary-light dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-secondary-400/30 transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !communitySlug}
          className="w-full h-10 rounded-pill bg-secondary-400 text-label font-semibold text-primary-900 hover:bg-secondary-300 active:bg-secondary-500 focus:outline-none focus:ring-2 focus:ring-secondary-300/40 transition-all shadow-lg shadow-secondary-400/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Submitting...' : 'Submit request'}
        </button>

        <p className="text-center text-meta text-text-muted-light dark:text-text-muted-dark">
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-secondary-500 dark:text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 font-medium transition-colors"
          >
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
