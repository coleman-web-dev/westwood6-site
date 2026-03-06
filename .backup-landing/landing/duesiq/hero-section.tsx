'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  LandingPrimaryImageCtaSection,
  LandingLeadingPill,
  LandingFlickeringGridCtaBg,
} from '@/components/landing';
import { Button } from '@/components/shared/ui/button';

function DashboardPreview() {
  return (
    <>
      <Image
        className="w-full rounded-md shadow-md dark:hidden"
        src="/static/images/dashboard-light.png"
        alt="DuesIQ dashboard preview"
        width={1000}
        height={1000}
      />
      <Image
        className="w-full rounded-md shadow-md hidden dark:block"
        src="/static/images/dashboard-dark.png"
        alt="DuesIQ dashboard preview"
        width={1000}
        height={1000}
      />
    </>
  );
}

export function HeroSection() {
  return (
    <LandingPrimaryImageCtaSection
      title="Dues collection, accounting, and community management. All in one place."
      description="Stop chasing payments and juggling spreadsheets. DuesIQ gives your HOA board a single platform to manage finances, communications, amenities, and more."
      leadingComponent={
        <LandingLeadingPill
          text="Built for self-managed HOAs"
          textVariant="primary"
          borderVariant="primary"
        />
      }
      footerComponent={
        <div className="flex flex-wrap gap-3 mt-2">
          <Button
            size="lg"
            asChild
          >
            <a href="#demo">Request a Demo</a>
          </Button>
          <Button
            variant="outline"
            size="lg"
            asChild
          >
            <Link href="/signup">Sign Up Free</Link>
          </Button>
        </div>
      }
      imageComponent={<DashboardPreview />}
      imageAlt="DuesIQ dashboard preview"
      imagePerspective="right"
      imagePosition="right"
      textPosition="left"
      withBackground
      withBackgroundGlow
      variant="primary"
      effectComponent={
        <LandingFlickeringGridCtaBg
          variant="primary"
          maxOpacity={0.15}
          flickerChance={0.05}
        />
      }
    />
  );
}
