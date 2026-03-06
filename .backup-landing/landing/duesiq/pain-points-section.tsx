'use client';

import {
  LandingProductFeaturesGrid,
  LandingProductFeature,
} from '@/components/landing';
import { DollarSign, FileSpreadsheet, Puzzle } from 'lucide-react';

export function PainPointsSection() {
  return (
    <LandingProductFeaturesGrid
      title="Sound familiar?"
      description="Most HOA boards spend hours every month on tasks that should be automated."
      withBackground={false}
      variant="primary"
      numberOfColumns={3}
    >
      <LandingProductFeature
        title="Chasing late payments"
        description="You send reminders, follow up manually, and still have homeowners who are months behind. It is exhausting and awkward."
        imageSrc=""
        imageAlt=""
        variant="primary"
        withBackground
        leadingComponent={
          <DollarSign className="w-8 h-8 text-secondary-400" />
        }
      />
      <LandingProductFeature
        title="Spreadsheet accounting"
        description="Tracking dues in Excel, reconciling bank statements by hand, and hoping nothing falls through the cracks before the annual meeting."
        imageSrc=""
        imageAlt=""
        variant="primary"
        withBackground
        leadingComponent={
          <FileSpreadsheet className="w-8 h-8 text-secondary-400" />
        }
      />
      <LandingProductFeature
        title="Juggling five different tools"
        description="One app for payments, another for email, a shared drive for documents, a group chat for announcements. Nothing talks to anything."
        imageSrc=""
        imageAlt=""
        variant="primary"
        withBackground
        leadingComponent={
          <Puzzle className="w-8 h-8 text-secondary-400" />
        }
      />
    </LandingProductFeaturesGrid>
  );
}
