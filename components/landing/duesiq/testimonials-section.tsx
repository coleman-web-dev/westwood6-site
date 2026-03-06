'use client';

import { Quote } from 'lucide-react';
import { ScrollReveal, StaggerContainer, StaggerItem } from './scroll-reveal';

const testimonials = [
  {
    name: 'Sarah Mitchell',
    role: 'Board President, Lakewood Estates',
    text: 'We switched from Membershine and the difference is night and day. Dues collection went from a monthly headache to something that just happens. Our collection rate went from 78% to 96% in the first quarter.',
  },
  {
    name: 'James Chen',
    role: 'Treasurer, Oak Ridge HOA',
    text: 'The accounting module alone is worth it. I used to spend entire weekends reconciling our books before board meetings. Now I pull up the dashboard and everything is already categorized and balanced.',
  },
  {
    name: 'Maria Rodriguez',
    role: 'Community Manager, Sunset Villas',
    text: 'Our homeowners love the portal. They can see their balance, pay online, reserve the clubhouse, and vote on community matters all in one place. Support requests dropped by half.',
  },
];

export function TestimonialsSection() {
  return (
    <section className="relative py-20 lg:py-28 section-flow">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <ScrollReveal className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-text-primary-light dark:text-text-primary-dark">
            Trusted by HOA boards
          </h2>
          <p className="mt-4 text-lg text-text-secondary-light dark:text-text-secondary-dark">
            See why communities are switching to DuesIQ.
          </p>
        </ScrollReveal>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6" stagger={0.1}>
          {testimonials.map((testimonial) => (
            <StaggerItem key={testimonial.name}>
              <div className="glass-card rounded-2xl p-8 h-full flex flex-col">
                <Quote className="w-8 h-8 text-secondary-400/40 mb-4 flex-shrink-0" />
                <blockquote className="text-text-primary-light dark:text-text-primary-dark leading-relaxed flex-1">
                  {testimonial.text}
                </blockquote>
                <div className="mt-6 pt-5 border-t border-stroke-light dark:border-stroke-dark">
                  <p className="font-semibold text-text-primary-light dark:text-text-primary-dark text-sm">
                    {testimonial.name}
                  </p>
                  <p className="text-text-muted-light dark:text-text-muted-dark text-sm">
                    {testimonial.role}
                  </p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
