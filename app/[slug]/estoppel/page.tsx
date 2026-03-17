import { createAdminClient } from '@/lib/supabase/admin';
import { EstoppelRequestForm } from '@/components/estoppel/estoppel-request-form';
import type { EstoppelSettings } from '@/lib/types/database';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function EstoppelPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const supabase = createAdminClient();

  const { data: community } = await supabase
    .from('communities')
    .select('id, name, slug, address, theme')
    .eq('slug', slug)
    .single();

  if (!community) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas-light dark:bg-canvas-dark">
        <p className="text-text-muted-light dark:text-text-muted-dark">Community not found.</p>
      </div>
    );
  }

  const theme = community.theme as Record<string, unknown> | null;
  const estoppelSettings = theme?.estoppel_settings as EstoppelSettings | undefined;

  if (!estoppelSettings?.enabled || !estoppelSettings.template || !estoppelSettings.fields?.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas-light dark:bg-canvas-dark">
        <div className="text-center">
          <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark mb-2">
            {community.name}
          </h1>
          <p className="text-body text-text-muted-light dark:text-text-muted-dark">
            Estoppel certificate requests are not currently available for this community.
          </p>
        </div>
      </div>
    );
  }

  // Fetch unit numbers for lot/unit lookup
  const { data: units } = await supabase
    .from('units')
    .select('unit_number')
    .eq('community_id', community.id)
    .order('unit_number');

  const unitNumbers = (units || []).map((u) => u.unit_number);

  // Check for success redirect from Stripe
  const isSuccess = sp.success === 'true';

  return (
    <div className="min-h-screen bg-canvas-light dark:bg-canvas-dark">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark mb-1">
            {community.name}
          </h1>
          <p className="text-body text-text-muted-light dark:text-text-muted-dark">
            Estoppel Certificate Request
          </p>
        </div>

        {isSuccess ? (
          <div className="bg-surface-light dark:bg-surface-dark rounded-panel p-8 text-center">
            <div className="text-4xl mb-4">&#10003;</div>
            <h2 className="text-section-title text-text-primary-light dark:text-text-primary-dark mb-2">
              Request Submitted Successfully
            </h2>
            <p className="text-body text-text-secondary-light dark:text-text-secondary-dark">
              Your estoppel certificate request has been received and payment has been processed.
              The board will review your request and send the completed certificate to the email
              address you provided. Standard requests are processed within 10 business days.
              Expedited requests are processed within 3 business days.
            </p>
          </div>
        ) : (
          <EstoppelRequestForm
            communityId={community.id}
            communityName={community.name}
            communitySlug={community.slug}
            estoppelSettings={estoppelSettings}
            unitNumbers={unitNumbers}
          />
        )}
      </div>
    </div>
  );
}
