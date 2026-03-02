import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Button } from '@/components/shared/ui/button';
import type { Community } from '@/lib/types/database';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function CommunityLandingPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: community } = await supabase
    .from('communities')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!community) return null;

  const c = community as Community;

  const { data: { user } } = await supabase.auth.getUser();
  let isMember = false;

  if (user) {
    const { data: member } = await supabase
      .from('members')
      .select('id')
      .eq('user_id', user.id)
      .eq('community_id', c.id)
      .eq('is_approved', true)
      .single();
    isMember = !!member;
  }

  return (
    <div className="min-h-screen bg-canvas-light dark:bg-canvas-dark">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="text-center mb-12">
          {c.logo_url && (
            <img
              src={c.logo_url}
              alt={`${c.name} logo`}
              className="mx-auto mb-6 h-20 w-20 rounded-panel object-cover"
            />
          )}
          <h1 className="text-page-title font-display text-3xl font-bold tracking-tight">
            {c.name}
          </h1>
          {c.address && (
            <p className="mt-2 text-body text-text-secondary-light dark:text-text-secondary-dark">
              {c.address}
            </p>
          )}
        </div>

        <div className="rounded-panel bg-card p-8 shadow-surface-light dark:shadow-surface-dark mb-8">
          <h2 className="text-section-title mb-4">Community Information</h2>
          <div className="space-y-2 text-body">
            {c.email && (
              <p>
                <span className="text-text-muted-light dark:text-text-muted-dark">Email:</span>{' '}
                <a href={`mailto:${c.email}`} className="text-secondary-500 hover:underline">{c.email}</a>
              </p>
            )}
            {c.phone && (
              <p>
                <span className="text-text-muted-light dark:text-text-muted-dark">Phone:</span>{' '}
                <a href={`tel:${c.phone}`} className="text-secondary-500 hover:underline">{c.phone}</a>
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-4">
          {isMember ? (
            <Link href={`/${slug}/dashboard`}>
              <Button size="lg">Go to Dashboard</Button>
            </Link>
          ) : (
            <>
              <Link href={`/login?redirect=/${slug}/dashboard`}>
                <Button size="lg">Member Login</Button>
              </Link>
              <Link href={`/signup?community=${slug}`}>
                <Button variant="outline" size="lg">Request Access</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
