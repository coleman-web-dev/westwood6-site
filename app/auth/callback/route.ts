import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const type = searchParams.get('type');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // For password recovery, redirect to a password update page
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/reset-password`);
      }

      // Look up user's community and redirect to dashboard
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
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
            return NextResponse.redirect(`${origin}/${community.slug}`);
          }
        }
      }

      // Fallback: user exists but no approved membership
      return NextResponse.redirect(`${origin}/login`);
    }
  }

  // Auth code exchange failed
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
