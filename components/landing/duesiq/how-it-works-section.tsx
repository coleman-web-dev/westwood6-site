'use client';

import { LandingProductSteps } from '@/components/landing';
import { LandingProductFeature } from '@/components/landing';
import { Upload, Mail, Banknote } from 'lucide-react';

export function HowItWorksSection() {
  return (
    <LandingProductSteps
      title="Up and running in days, not months"
      description="No lengthy onboarding process. Import your community data and start collecting dues right away."
      variant="primary"
      withBackground={false}
      display="grid"
    >
      <LandingProductFeature
        title="1. Import your community"
        description="Upload a CSV of your homeowners, units, and dues. We handle the rest of the setup, including syncing with your existing Stripe account."
        imageSrc=""
        imageAlt=""
        variant="primary"
        withBackground
        leadingComponent={
          <Upload className="w-8 h-8 text-secondary-400" />
        }
      />
      <LandingProductFeature
        title="2. Invite homeowners"
        description="Send welcome emails in bulk. Homeowners set their password, log in, and see their invoices and payment history immediately."
        imageSrc=""
        imageAlt=""
        variant="primary"
        withBackground
        leadingComponent={
          <Mail className="w-8 h-8 text-secondary-400" />
        }
      />
      <LandingProductFeature
        title="3. Start collecting"
        description="Automatic invoicing, payment reminders, and real-time tracking. Homeowners pay online with credit card or ACH."
        imageSrc=""
        imageAlt=""
        variant="primary"
        withBackground
        leadingComponent={
          <Banknote className="w-8 h-8 text-secondary-400" />
        }
      />
    </LandingProductSteps>
  );
}
