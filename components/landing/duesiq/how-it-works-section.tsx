'use client';

import { Upload, Mail, Banknote, type LucideIcon } from 'lucide-react';
import { ScrollReveal, StaggerContainer, StaggerItem } from './scroll-reveal';

interface Step {
  icon: LucideIcon;
  number: string;
  title: string;
  description: string;
}

const steps: Step[] = [
  {
    icon: Upload,
    number: '01',
    title: 'Import your community',
    description:
      'Upload a CSV of your homeowners, units, and dues. We handle the rest of the setup, including syncing with your existing Stripe account.',
  },
  {
    icon: Mail,
    number: '02',
    title: 'Invite homeowners',
    description:
      'Send welcome emails in bulk. Homeowners set their password, log in, and see their invoices and payment history immediately.',
  },
  {
    icon: Banknote,
    number: '03',
    title: 'Start collecting',
    description:
      'Automatic invoicing, payment reminders, and real-time tracking. Homeowners pay online with credit card or ACH.',
  },
];

export function HowItWorksSection() {
  return (
    <section className="relative py-20 lg:py-28 section-flow">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <ScrollReveal className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-text-primary-light dark:text-text-primary-dark">
            Up and running in days, not months
          </h2>
          <p className="mt-4 text-lg text-text-secondary-light dark:text-text-secondary-dark">
            No lengthy onboarding process. Import your community data and start collecting dues right away.
          </p>
        </ScrollReveal>

        <StaggerContainer className="relative" stagger={0.15}>
          {/* Connecting line (desktop only) */}
          <div className="hidden lg:block absolute top-[72px] left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] h-px bg-gradient-to-r from-secondary-400/30 via-secondary-400/50 to-secondary-400/30" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <StaggerItem key={step.number}>
                  <div className="flex flex-col items-center text-center group">
                    {/* Step number + icon */}
                    <div className="relative mb-6">
                      <div className="w-[88px] h-[88px] rounded-2xl glass-card flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
                        <Icon className="w-8 h-8 text-secondary-400" />
                      </div>
                      <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-secondary-400 text-white text-xs font-bold flex items-center justify-center shadow-lg">
                        {step.number}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark mb-2">
                      {step.title}
                    </h3>
                    <p className="text-text-secondary-light dark:text-text-secondary-dark leading-relaxed max-w-xs">
                      {step.description}
                    </p>
                  </div>
                </StaggerItem>
              );
            })}
          </div>
        </StaggerContainer>
      </div>
    </section>
  );
}
