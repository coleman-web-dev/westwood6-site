import { createAdminClient } from '@/lib/supabase/admin';
import type { EmailSettings } from '@/lib/types/database';

export interface ResolvedSender {
  from: string;
  replyTo?: string;
}

const DEFAULT_FROM_ADDRESS = 'no-reply@duesiq.com';

/**
 * Resolves the "from" and "reply-to" addresses for a community's outbound email.
 *
 * Resolution chain:
 * 1. custom_domain → use verified domain's default address
 * 2. subdomain → use configured subdomain address (pre-verified on duesiq.com)
 * 3. default → no-reply@duesiq.com with community name as display name
 *
 * Always falls back gracefully if a custom domain loses verification.
 */
export async function resolveSender(
  communityId: string,
  communityName: string,
  emailSettings?: EmailSettings | null,
): Promise<ResolvedSender> {
  const fromName = emailSettings?.from_name || communityName || 'DuesIQ';
  const replyTo = emailSettings?.reply_to || undefined;
  const mode = emailSettings?.sending_mode || 'default';

  // Scenario 3: Custom domain
  if (mode === 'custom_domain') {
    try {
      const supabase = createAdminClient();
      const { data: domain } = await supabase
        .from('community_email_domains')
        .select('is_active, status')
        .eq('community_id', communityId)
        .eq('domain_type', 'custom')
        .maybeSingle();

      if (domain?.is_active && domain.status === 'verified') {
        // Get the default address for this community
        const { data: addr } = await supabase
          .from('email_addresses')
          .select('address, display_name')
          .eq('community_id', communityId)
          .eq('is_default', true)
          .maybeSingle();

        if (addr) {
          const displayName = addr.display_name || fromName;
          return {
            from: `${displayName} <${addr.address}>`,
            replyTo: replyTo || addr.address,
          };
        }
      }
      // Domain not verified or no default address, fall through to default
    } catch {
      // DB error, fall through to default
    }
  }

  // Scenario 2: DuesIQ subdomain
  if (mode === 'subdomain' && emailSettings?.subdomain_address) {
    return {
      from: `${fromName} <${emailSettings.subdomain_address}>`,
      replyTo: replyTo || emailSettings.subdomain_address,
    };
  }

  // Scenario 1 / fallback: Default DuesIQ address
  const fromAddress = process.env.EMAIL_FROM_ADDRESS || DEFAULT_FROM_ADDRESS;
  return {
    from: `${fromName} <${fromAddress}>`,
    replyTo,
  };
}
