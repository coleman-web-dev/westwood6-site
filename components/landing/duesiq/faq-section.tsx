'use client';

import { LandingFaqCollapsibleSection } from '@/components/landing';

const faqItems = [
  {
    question: 'What is DuesIQ?',
    answer:
      'DuesIQ is a modern HOA management platform that brings dues collection, accounting, amenity reservations, voting, document management, and homeowner communications into a single app. It is built specifically for self-managed HOAs and community associations.',
  },
  {
    question: 'How does payment processing work?',
    answer:
      'DuesIQ integrates with Stripe for payment processing. Homeowners can pay with credit card, debit card, or ACH bank transfer. Payments are deposited directly into your community\'s bank account. Stripe\'s processing fees apply (2.9% + 30 cents for cards, 0.8% capped at $5 for ACH).',
  },
  {
    question: 'Can we migrate from our current system?',
    answer:
      'Yes. DuesIQ includes a guided migration wizard that imports your homeowner data, syncs existing Stripe customers, and preserves payment history. Most communities complete migration in a single afternoon.',
  },
  {
    question: 'Are there setup fees or long-term contracts?',
    answer:
      'No setup fees and no long-term contracts. You pay month-to-month and can cancel anytime. We also offer annual billing with a discount.',
  },
  {
    question: 'How is our data secured?',
    answer:
      'DuesIQ uses bank-grade 256-bit TLS encryption, row-level security policies on all database tables, and SOC 2 compliant infrastructure through Supabase and Vercel. Payment data is handled entirely by Stripe and never touches our servers.',
  },
  {
    question: 'Do homeowners need to create accounts?',
    answer:
      'Yes, but the process is simple. The board sends welcome invitations by email, and homeowners click a link to set their password. No app download required. Everything works in the browser on desktop and mobile.',
  },
  {
    question: 'What payment methods are supported?',
    answer:
      'Credit cards (Visa, Mastercard, Amex, Discover), debit cards, and ACH bank transfers. Homeowners can save their payment method for faster checkout.',
  },
  {
    question: 'Is there a free trial?',
    answer:
      'We offer a personalized demo where we walk your board through the platform with your actual community data. Request a demo below and we will get you set up.',
  },
];

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
