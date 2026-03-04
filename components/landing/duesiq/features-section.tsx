'use client';

import {
  LandingBentoGridSection,
  LandingBentoGridIconItem,
} from '@/components/landing';
import {
  CreditCard,
  BookOpen,
  Landmark,
  CalendarCheck,
  Vote,
  FileText,
  Wrench,
  Users,
} from 'lucide-react';

export function FeaturesSection() {
  return (
    <section id="features">
      <LandingBentoGridSection
        title="Everything your board needs"
        description="From collecting dues to running elections, DuesIQ handles the full spectrum of HOA operations."
        withBackground
        variant="primary"
      >
        <LandingBentoGridIconItem
          icon={<CreditCard className="w-8 h-8" />}
          topText="Dues & Payments"
          bottomText="Auto-invoicing, Stripe payment processing, partial payments, wallet credits, and late fee automation."
          colSpan={2}
          variant="primary"
        />
        <LandingBentoGridIconItem
          icon={<BookOpen className="w-8 h-8" />}
          topText="Accounting"
          bottomText="Double-entry general ledger, chart of accounts, journal entries, and financial statements."
          colSpan={2}
          variant="primary"
        />
        <LandingBentoGridIconItem
          icon={<Landmark className="w-8 h-8" />}
          topText="Bank Reconciliation"
          bottomText="Connect your bank via Plaid, auto-match transactions, and reconcile in minutes instead of hours."
          colSpan={2}
          variant="primary"
        />
        <LandingBentoGridIconItem
          icon={<CalendarCheck className="w-8 h-8" />}
          topText="Amenity Reservations"
          bottomText="Online booking for pools, clubhouses, and courts with rental agreements and deposit tracking."
          colSpan={2}
          variant="primary"
        />
        <LandingBentoGridIconItem
          icon={<Vote className="w-8 h-8" />}
          topText="Voting & Ballots"
          bottomText="Board elections, budget approvals, and amendments with quorum tracking and proxy support."
          colSpan={2}
          variant="primary"
        />
        <LandingBentoGridIconItem
          icon={<FileText className="w-8 h-8" />}
          topText="Documents & Announcements"
          bottomText="Centralized document storage and community announcements with email notifications."
          colSpan={2}
          variant="primary"
        />
        <LandingBentoGridIconItem
          icon={<Wrench className="w-8 h-8" />}
          topText="Maintenance Requests"
          bottomText="Homeowners submit requests, board tracks and resolves them."
          colSpan={2}
          variant="primary"
        />
        <LandingBentoGridIconItem
          icon={<Users className="w-8 h-8" />}
          topText="Homeowner Portal"
          bottomText="Each homeowner gets their own dashboard to view invoices, make payments, and stay informed."
          colSpan={2}
          variant="primary"
        />
      </LandingBentoGridSection>
    </section>
  );
}
