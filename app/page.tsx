import { redirect } from 'next/navigation';
import { Metadata } from 'next';
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
import { faqItems } from '@/components/landing/duesiq/faq-data';
import { DemoRequestSection } from '@/components/landing/duesiq/demo-request-section';

export const metadata: Metadata = {
  title: 'DuesIQ - HOA Dues Collection & Community Management Software',
  description:
    'Modern HOA management software for dues collection, payment tracking, amenity reservations, voting, and homeowner communications. Built for self-managed community associations.',
  keywords: [
    'HOA management software',
    'HOA dues collection',
    'community association management',
    'HOA payment portal',
    'homeowner association software',
  ],
  alternates: {
    canonical: 'https://duesiq.com',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: 'DuesIQ',
      url: 'https://duesiq.com',
      logo: 'https://duesiq.com/static/favicons/android-chrome-512x512.png',
      description:
        'Modern HOA management software for dues collection, payment tracking, amenity reservations, voting, and homeowner communications.',
    },
    {
      '@type': 'SoftwareApplication',
      name: 'DuesIQ',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: 'https://duesiq.com',
      offers: [
        {
          '@type': 'Offer',
          name: 'Essentials',
          price: '89',
          priceCurrency: 'USD',
          description: 'For small communities up to 100 units',
        },
        {
          '@type': 'Offer',
          name: 'Professional',
          price: '179',
          priceCurrency: 'USD',
          description: 'For growing communities up to 350 units',
        },
        {
          '@type': 'Offer',
          name: 'Professional + Accounting',
          price: '249',
          priceCurrency: 'USD',
          description: 'Full financial management suite up to 350 units',
        },
      ],
    },
    {
      '@type': 'FAQPage',
      mainEntity: faqItems.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    },
  ],
};

export default async function HomePage() {
  const supabase = await createClient();
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
        redirect(`/${community.slug}/dashboard`);
      }
    } else if (memberRows && memberRows.length > 1) {
      redirect('/login?select_community=1');
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
