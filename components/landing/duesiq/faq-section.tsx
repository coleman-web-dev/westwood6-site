'use client';

import { LandingFaqCollapsibleSection } from '@/components/landing';
import { faqItems } from './faq-data';

export function FaqSection() {
  return (
    <section id="faq">
      <LandingFaqCollapsibleSection
        title="Frequently asked questions"
        description="Everything you need to know about DuesIQ."
        faqItems={faqItems}
        withBackground
        variant="primary"
      />
    </section>
  );
}
