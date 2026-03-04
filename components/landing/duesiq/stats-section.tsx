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
        value="329"
        description="Homes managed"
        variant="primary"
      />
      <LandingStatItem
        value="99.9%"
        description="Platform uptime"
        variant="primary"
      />
      <LandingStatItem
        value="Bank-grade"
        description="256-bit encryption"
        variant="primary"
      />
      <LandingStatItem
        value="5 min"
        description="Average setup time"
        variant="primary"
      />
    </LandingStatsSection>
  );
}
