'use client';

import { LandingTestimonialGrid } from '@/components/landing';

const testimonials = [
  {
    name: 'Sarah Mitchell',
    handle: 'Board President, Lakewood Estates',
    text: 'We switched from Membershine and the difference is night and day. Dues collection went from a monthly headache to something that just happens. Our collection rate went from 78% to 96% in the first quarter.',
    imageSrc: '',
    verified: true,
  },
  {
    name: 'James Chen',
    handle: 'Treasurer, Oak Ridge HOA',
    text: 'The accounting module alone is worth it. I used to spend entire weekends reconciling our books before board meetings. Now I pull up the dashboard and everything is already categorized and balanced.',
    imageSrc: '',
    verified: true,
  },
  {
    name: 'Maria Rodriguez',
    handle: 'Community Manager, Sunset Villas',
    text: 'Our homeowners love the portal. They can see their balance, pay online, reserve the clubhouse, and vote on community matters all in one place. Support requests dropped by half.',
    imageSrc: '',
    verified: true,
  },
];

export function TestimonialsSection() {
  return (
    <LandingTestimonialGrid
      title="Trusted by HOA boards"
      description="See why communities are switching to DuesIQ."
      testimonialItems={testimonials}
      withBackground
      variant="primary"
    />
  );
}
