import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/shared/Header';
import { Footer } from '@/components/shared/Footer';
import { HeroSection } from '@/components/landing/duesiq/hero-section';
import { PainPointsSection } from '@/components/landing/duesiq/pain-points-section';
import { FeaturesSection } from '@/components/landing/duesiq/features-section';
import { HowItWorksSection } from '@/components/landing/duesiq/how-it-works-section';
import { StatsSection } from '@/components/landing/duesiq/stats-section';
import { PricingSection } from '@/components/landing/duesiq/pricing-section';
import { TestimonialsSection } from '@/components/landing/duesiq/testimonials-section';
import { FaqSection } from '@/components/landing/duesiq/faq-section';
import { DemoRequestSection } from '@/components/landing/duesiq/demo-request-section';

export default async function HomePage() {
  const supabase = await createClient();
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
        redirect(`/${community.slug}/dashboard`);
      }
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <PainPointsSection />
        <FeaturesSection />
        <HowItWorksSection />
        <StatsSection />
        <PricingSection />
        <TestimonialsSection />
        <FaqSection />
        <DemoRequestSection />
      </main>
      <Footer />
    </div>
  );
}
