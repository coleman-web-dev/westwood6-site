'use client';

import {
  CreditCard,
  BookOpen,
  Landmark,
  CalendarCheck,
  Vote,
  FileText,
  Wrench,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { StaggerContainer, StaggerItem } from './scroll-reveal';
import { ScrollReveal } from './scroll-reveal';

interface FeatureItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

const features: FeatureItem[] = [
  {
    icon: CreditCard,
    title: 'Dues & Payments',
    description:
      'Auto-invoicing, Stripe payment processing, partial payments, wallet credits, and late fee automation.',
  },
  {
    icon: BookOpen,
    title: 'Accounting',
    description:
      'Double-entry general ledger, chart of accounts, journal entries, and financial statements.',
  },
  {
    icon: Landmark,
    title: 'Bank Reconciliation',
    description:
      'Connect your bank via Plaid, auto-match transactions, and reconcile in minutes instead of hours.',
  },
  {
    icon: CalendarCheck,
    title: 'Amenity Reservations',
    description:
      'Online booking for pools, clubhouses, and courts with rental agreements and deposit tracking.',
  },
  {
    icon: Vote,
    title: 'Voting & Ballots',
    description:
      'Board elections, budget approvals, and amendments with quorum tracking and proxy support.',
  },
  {
    icon: FileText,
    title: 'Documents & Announcements',
    description:
      'Centralized document storage and community announcements with email notifications.',
  },
  {
    icon: Wrench,
    title: 'Maintenance Requests',
    description: 'Homeowners submit requests, board tracks and resolves them.',
  },
  {
    icon: Users,
    title: 'Homeowner Portal',
    description:
      'Each homeowner gets their own dashboard to view invoices, make payments, and stay informed.',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="relative py-20 lg:py-28 bg-primary-100/20 dark:bg-primary-900/10 section-flow">
      {/* Organic background accent */}
      <div className="absolute top-0 right-0 w-[350px] h-[350px] rounded-full bg-secondary-400/5 blur-3xl -z-0" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <ScrollReveal className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-text-primary-light dark:text-text-primary-dark">
            Everything your board needs
          </h2>
          <p className="mt-4 text-lg text-text-secondary-light dark:text-text-secondary-dark">
            From collecting dues to running elections, DuesIQ handles the full spectrum of HOA operations.
          </p>
        </ScrollReveal>

        <StaggerContainer
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5"
          stagger={0.06}
        >
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <StaggerItem key={feature.title}>
                <div className="glass-card glass-card-hover rounded-2xl p-6 h-full flex flex-col group">
                  <div className="w-10 h-10 rounded-lg bg-secondary-400/10 flex items-center justify-center mb-4 transition-colors group-hover:bg-secondary-400/20">
                    <Icon className="w-5 h-5 text-secondary-400" />
                  </div>
                  <h3 className="text-base font-semibold text-text-primary-light dark:text-text-primary-dark mb-1.5">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </div>
    </section>
  );
}
