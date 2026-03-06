'use client';

import { LandingTestimonial } from '@/components/landing';

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
    <section className="w-full flex flex-col justify-center items-center gap-8 py-12 lg:py-16 bg-primary-100/20 dark:bg-primary-900/10">
      <div className="w-full p-6 max-w-full container-wide relative flex flex-col items-center">
        <h2 className="md:text-center text-2xl md:text-3xl lg:text-4xl font-semibold leading-tight md:leading-tight">
          Trusted by HOA boards
        </h2>
        <p className="mt-6 md:text-xl">
          See why communities are switching to DuesIQ.
        </p>
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <LandingTestimonial
              key={index}
              {...testimonial}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
