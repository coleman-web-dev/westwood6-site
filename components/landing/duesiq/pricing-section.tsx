'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import { ScrollReveal, StaggerContainer, StaggerItem } from './scroll-reveal';

const plans = [
  {
    title: 'Essentials',
    description: 'For small communities getting started',
    annual: 89,
    monthly: 109,
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
  {
    title: 'Enterprise',
    description: 'For large communities and management companies',
    annual: null,
    monthly: null,
    highlighted: false,
    features: [
      '350+ units',
      'Everything in Professional + Accounting',
      'Multi-community management',
      'Custom reporting',
      'Priority support',
    ],
  },
];

export function PricingSection() {
  const [billing, setBilling] = useState<'annual' | 'monthly'>('annual');

  return (
    <section id="pricing" className="relative py-20 lg:py-28 section-flow">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <ScrollReveal className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-text-primary-light dark:text-text-primary-dark">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-text-secondary-light dark:text-text-secondary-dark">
            No setup fees. No hidden charges. Cancel monthly anytime.
          </p>
        </ScrollReveal>

        {/* Billing toggle */}
        <ScrollReveal delay={0.1} className="flex justify-center mb-12">
          <div className="inline-flex items-center gap-1 rounded-full bg-primary-100/40 dark:bg-primary-900/40 p-1 backdrop-blur-sm">
            <button
              onClick={() => setBilling('annual')}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                billing === 'annual'
                  ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Annual <span className="text-xs text-secondary-400 font-semibold ml-1">Save 20%</span>
            </button>
            <button
              onClick={() => setBilling('monthly')}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                billing === 'monthly'
                  ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Monthly
            </button>
          </div>
        </ScrollReveal>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5" stagger={0.08}>
          {plans.map((plan) => (
            <StaggerItem key={plan.title}>
              <div
                className={`glass-card rounded-2xl p-6 h-full flex flex-col relative ${
                  plan.highlighted ? 'ring-2 ring-secondary-400/40' : ''
                }`}
              >
                {plan.highlighted && plan.title === 'Professional' && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-secondary-400 text-white text-xs font-semibold">
                    Most Popular
                  </span>
                )}

                <h3 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark">
                  {plan.title}
                </h3>
                <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-1">
                  {plan.description}
                </p>

                <div className="mt-5 mb-6">
                  {plan.annual != null ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold tracking-tight text-text-primary-light dark:text-text-primary-dark">
                        ${billing === 'annual' ? plan.annual : plan.monthly}
                      </span>
                      <span className="text-sm text-text-muted-light dark:text-text-muted-dark">/month</span>
                    </div>
                  ) : (
                    <span className="text-4xl font-bold tracking-tight text-text-primary-light dark:text-text-primary-dark">
                      Custom
                    </span>
                  )}
                </div>

                <ul className="space-y-2.5 flex-1 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-text-secondary-light dark:text-text-secondary-dark">
                      <Check className="w-4 h-4 text-secondary-400 flex-shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  variant={plan.highlighted ? 'default' : 'outline'}
                  className="w-full"
                >
                  <a href="#demo">
                    {plan.annual == null ? 'Contact Us' : 'Request a Demo'}
                  </a>
                </Button>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <p className="text-center text-text-muted-light dark:text-text-muted-dark text-sm mt-8">
          Annual plans are billed upfront. Monthly plans can be cancelled anytime.{' '}
          <a href="#demo" className="underline hover:text-secondary-400 transition-colors">Request a demo</a> or{' '}
          <Link href="/signup" className="underline hover:text-secondary-400 transition-colors">sign up now</Link> to get started.
        </p>
      </div>
    </section>
  );
}
