'use client';

import {
  LandingPricingSection,
  LandingPricingPlan,
} from '@/components/landing';

export function PricingSection() {
  return (
    <section id="pricing">
      <LandingPricingSection
        title="Simple, transparent pricing"
        description="No setup fees. No hidden charges. Cancel anytime."
        variant="primary"
      >
        <LandingPricingPlan
          title="Essentials"
          description="For small communities getting started"
          price="$79"
          priceSuffix="/month"
          href="#demo"
          ctaText="Request a Demo"
        >
          <p>Up to 75 units</p>
          <p>Dues collection & auto-invoicing</p>
          <p>Stripe payment processing</p>
          <p>Homeowner portal</p>
          <p>Announcements & documents</p>
          <p>Email notifications</p>
          <p>Basic financial reports</p>
        </LandingPricingPlan>

        <LandingPricingPlan
          title="Professional + Accounting"
          description="Full financial management suite"
          price="$249"
          priceSuffix="/month"
          href="#demo"
          ctaText="Request a Demo"
          featured
          highlighted
        >
          <p>Up to 500 units</p>
          <p>Everything in Essentials</p>
          <p>Amenity reservations & agreements</p>
          <p>Voting & ballots with proxy support</p>
          <p>Maintenance request tracking</p>
          <p>Late fee automation</p>
          <p>Double-entry general ledger</p>
          <p>Bank reconciliation (Plaid)</p>
          <p>Auto-categorization rules</p>
          <p>Balance sheet & income statement</p>
          <p>Budget tracking & vendor management</p>
        </LandingPricingPlan>

        <LandingPricingPlan
          title="Enterprise"
          description="For large communities and management companies"
          price="Custom"
          priceSuffix=""
          href="#demo"
          ctaText="Contact Us"
        >
          <p>500+ units</p>
          <p>Everything in Professional + Accounting</p>
          <p>Dedicated account manager</p>
          <p>Custom integrations</p>
          <p>Priority support</p>
          <p>Multi-community management</p>
          <p>Custom reporting</p>
        </LandingPricingPlan>
      </LandingPricingSection>

      <p className="text-center text-text-secondary-light dark:text-text-secondary-dark text-sm pb-12 -mt-8">
        All plans include a free onboarding call. <a href="#demo" className="underline hover:text-secondary-400">Request a demo</a> to get started.
      </p>
    </section>
  );
}
