'use client';

import { StaggerContainer, StaggerItem } from './scroll-reveal';

const stats = [
  { value: 'Bank-grade', description: '256-bit TLS encryption' },
  { value: '99.9%', description: 'Platform uptime' },
  { value: 'PCI DSS', description: 'Compliant payments via Stripe' },
  { value: 'SOC 2', description: 'Compliant infrastructure' },
];

export function StatsSection() {
  return (
    <section className="relative py-16 lg:py-20 bg-primary-100/20 dark:bg-primary-900/10">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <StaggerContainer
          className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12"
          stagger={0.08}
        >
          {stats.map((stat) => (
            <StaggerItem key={stat.value}>
              <div className="text-center">
                <dt className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary-light dark:text-text-primary-dark">
                  {stat.value}
                </dt>
                <dd className="mt-1 text-sm text-text-secondary-light dark:text-text-secondary-dark">
                  {stat.description}
                </dd>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
