import Link from 'next/link';

interface Props {
  slug: string;
  isMember: boolean;
  communityName: string;
}

export function LoginCtaSection({ slug, isMember, communityName }: Props) {
  return (
    <section
      className="py-16 px-6"
      style={{ backgroundColor: 'var(--landing-primary)' }}
    >
      <div className="mx-auto max-w-xl text-center">
        <h2 className="text-2xl font-semibold text-white mb-3">
          {isMember ? 'Welcome back!' : `Join ${communityName}`}
        </h2>
        <p className="text-white/70 mb-8 text-sm">
          {isMember
            ? 'Access your dashboard to manage payments, view documents, and stay connected.'
            : 'Sign in to your account or request access to get started.'}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {isMember ? (
            <Link
              href={`/${slug}/dashboard`}
              className="inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'var(--landing-accent)',
                color: 'white',
              }}
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                href={`/login?redirect=/${slug}/dashboard`}
                className="inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--landing-accent)',
                  color: 'white',
                }}
              >
                Member Login
              </Link>
              <Link
                href={`/signup?community=${slug}`}
                className="inline-flex items-center justify-center rounded-lg border border-white/30 px-6 py-3 text-sm font-medium text-white hover:bg-white/10 transition-colors"
              >
                Request Access
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
