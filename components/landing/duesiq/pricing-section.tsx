'use client';

import { useState } from 'react';
import {
  LandingPricingSection,
  LandingPricingPlan,
} from '@/components/landing';

const plans = [
  {
    title: 'Essentials',
    description: 'For small communities getting started',
    annual: 89,
    monthly: 109,
    href: '#demo',
    ctaText: 'Request a Demo',
    highlighted: false,
    features: [
      'Up to 100 units',
      'Dues collection & auto-invoicing',
      'Stripe payment processing',
      'Homeowner portal',
      'Announcements & documents',
      'Email notifications',
      'Basic financial reports',
    ],
  },
  {
    title: 'Professional',
    description: 'For growing communities that need more',
    annual: 179,
    monthly: 219,
    href: '#demo',
    ctaText: 'Request a Demo',
    highlighted: true,
    features: [
      'Up to 350 units',
      'Everything in Essentials',
      'Amenity reservations & agreements',
      'Voting & ballots with proxy support',
      'Maintenance request tracking',
      'Late fee automation',
      'Violations & ARC tracking',
      'Bulk email communications',
    ],
  },
  {
    title: 'Professional + Accounting',
    description: 'Full financial management suite',
    annual: 249,
    monthly: 299,
    href: '#demo',
    ctaText: 'Request a Demo',
    highlighted: true,
    features: [
      'Up to 350 units',
      'Everything in Professional',
      'Double-entry general ledger',
      'Bank reconciliation (Plaid)',
      'Auto-categorization rules',
      'Balance sheet & income statement',
      'Budget tracking & vendor management',
    ],
  },
];

export function PricingSection() {
  const [billing, setBilling] = useState<'annual' | 'monthly'>('annual');

  return (
    <section id="pricing">
      {/* Billing toggle */}
      <div className="w-full flex justify-center mb-2">
        <div className="inline-flex items-center gap-1 rounded-full bg-primary-100/30 dark:bg-primary-900/30 p-1">
          <button
            onClick={() => setBilling('annual')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              billing === 'annual'
                ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Annual <span className="text-xs text-secondary-400 font-semibold ml-1">Save 20%</span>
          </button>
          <button
            onClick={() => setBilling('monthly')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              billing === 'monthly'
                ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      <LandingPricingSection
        title="Simple, transparent pricing"
        description="No setup fees. No hidden charges. Cancel monthly anytime."
        variant="primary"
      >
        {plans.map((plan) => (
          <LandingPricingPlan
            key={plan.title}
            title={plan.title}
            description={plan.description}
            price={`$${billing === 'annual' ? plan.annual : plan.monthly}`}
            priceSuffix="/month"
            href={plan.href}
            ctaText={plan.ctaText}
            highlighted={plan.highlighted}
          >
            {plan.features.map((feature) => (
              <p key={feature}>{feature}</p>
            ))}
          </LandingPricingPlan>
        ))}

        <LandingPricingPlan
          title="Enterprise"
          description="For large communities and management companies"
          price="Custom"
          priceSuffix=""
          href="#demo"
          ctaText="Contact Us"
          highlighted
        >
          <p>350+ units</p>
          <p>Everything in Professional + Accounting</p>
          <p>Multi-community management</p>
          <p>Custom reporting</p>
          <p>Priority support</p>
        </LandingPricingPlan>
      </LandingPricingSection>

      <p className="text-center text-text-secondary-light dark:text-text-secondary-dark text-sm pb-12 -mt-8">
        Annual plans are billed upfront. Monthly plans can be cancelled anytime.{' '}
        <a href="#demo" className="underline hover:text-secondary-400">Request a demo</a> to get started.
      </p>
    </section>
  );
}
