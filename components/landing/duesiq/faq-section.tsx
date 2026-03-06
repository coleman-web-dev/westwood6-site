'use client';

import { LandingFaqCollapsibleSection } from '@/components/landing';
import { faqItems } from './faq-data';
import { ScrollReveal } from './scroll-reveal';

export function FaqSection() {
  return (
    <section id="faq">
      <ScrollReveal>
        <LandingFaqCollapsibleSection
          title="Frequently asked questions"
          description="Everything you need to know about DuesIQ."
          faqItems={faqItems}
          withBackground
          variant="primary"
        />
      </ScrollReveal>
    </section>
  );
}
