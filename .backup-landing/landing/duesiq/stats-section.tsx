'use client';

import { LandingStatsSection, LandingStatItem } from '@/components/landing';

export function StatsSection() {
  return (
    <LandingStatsSection
      withBackground
      variant="primary"
      columnsDesktop={4}
      columnsMobile={2}
    >
      <LandingStatItem
        value="Bank-grade"
        description="256-bit TLS encryption"
        variant="primary"
      />
      <LandingStatItem
        value="99.9%"
        description="Platform uptime"
        variant="primary"
      />
      <LandingStatItem
        value="PCI DSS"
        description="Compliant payments via Stripe"
        variant="primary"
      />
      <LandingStatItem
        value="SOC 2"
        description="Compliant infrastructure"
        variant="primary"
      />
    </LandingStatsSection>
  );
}
