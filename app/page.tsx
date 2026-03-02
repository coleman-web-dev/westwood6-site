import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Redirect logged-in users to their community dashboard
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
        redirect(`/${community.slug}/dashboard`);
      }
    }
  }

  // Not logged in or no approved membership
  redirect('/login');
}
