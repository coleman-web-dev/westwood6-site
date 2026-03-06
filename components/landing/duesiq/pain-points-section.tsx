'use client';

import { DollarSign, FileSpreadsheet, Puzzle } from 'lucide-react';
import { ScrollReveal, StaggerContainer, StaggerItem } from './scroll-reveal';

const painPoints = [
  {
    icon: DollarSign,
    title: 'Chasing late payments',
    description:
      'You send reminders, follow up manually, and still have homeowners who are months behind. It is exhausting and awkward.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Spreadsheet accounting',
    description:
      'Tracking dues in Excel, reconciling bank statements by hand, and hoping nothing falls through the cracks before the annual meeting.',
  },
  {
    icon: Puzzle,
    title: 'Juggling five different tools',
    description:
      'One app for payments, another for email, a shared drive for documents, a group chat for announcements. Nothing talks to anything.',
  },
];

export function PainPointsSection() {
  return (
    <section className="relative py-20 lg:py-28 section-flow">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <ScrollReveal className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-text-primary-light dark:text-text-primary-dark">
            Sound familiar?
          </h2>
          <p className="mt-4 text-lg text-text-secondary-light dark:text-text-secondary-dark">
            Most HOA boards spend hours every month on tasks that should be automated.
          </p>
        </ScrollReveal>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6" stagger={0.12}>
          {painPoints.map((point) => {
            const Icon = point.icon;
            return (
              <StaggerItem key={point.title}>
                <div className="glass-card glass-card-hover rounded-2xl p-8 h-full">
                  <div className="w-12 h-12 rounded-xl bg-secondary-400/10 flex items-center justify-center mb-5">
                    <Icon className="w-6 h-6 text-secondary-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark mb-2">
                    {point.title}
                  </h3>
                  <p className="text-text-secondary-light dark:text-text-secondary-dark leading-relaxed">
                    {point.description}
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
