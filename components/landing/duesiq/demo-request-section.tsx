'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Textarea } from '@/components/shared/ui/textarea';
import { LandingFlickeringGridCtaBg } from '@/components/landing';
import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

const demoSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Please enter a valid email'),
  community_name: z.string().optional(),
  unit_count: z.string().optional(),
  phone: z.string().optional(),
  message: z.string().optional(),
});

type DemoFormData = z.infer<typeof demoSchema>;

export function DemoRequestSection() {
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DemoFormData>({
    resolver: zodResolver(demoSchema),
  });

  async function onSubmit(data: DemoFormData) {
    setSubmitError('');
    try {
      const res = await fetch('/api/demo-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error('Failed to submit');
      }

      setSubmitted(true);
    } catch {
      setSubmitError('Something went wrong. Please try again.');
    }
  }

  return (
    <section id="demo" className="relative overflow-hidden">
      <div className="absolute inset-0">
        <LandingFlickeringGridCtaBg
          variant="primary"
          maxOpacity={0.1}
          flickerChance={0.03}
        />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-24 sm:py-32">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold tracking-tight text-text-primary-light dark:text-text-primary-dark sm:text-4xl">
            Ready to modernize your HOA?
          </h2>
          <p className="mt-4 text-lg text-text-secondary-light dark:text-text-secondary-dark">
            Tell us about your community and we will schedule a personalized demo.
            <br />
            <span className="text-base">
              Or{' '}
              <Link href="/signup" className="underline hover:text-secondary-400 transition-colors">
                sign up directly
              </Link>{' '}
              if you are ready to get started.
            </span>
          </p>
        </div>

        {submitted ? (
          <div className="text-center py-12 bg-surface-light dark:bg-surface-dark rounded-panel border border-stroke-light dark:border-stroke-dark">
            <CheckCircle2 className="w-12 h-12 text-mint mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-text-primary-light dark:text-text-primary-dark">
              Thank you!
            </h3>
            <p className="mt-2 text-text-secondary-light dark:text-text-secondary-dark">
              We received your request and will be in touch within one business day.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5 bg-surface-light dark:bg-surface-dark rounded-panel border border-stroke-light dark:border-stroke-dark p-6 sm:p-8"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="Your name"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="community_name">Community Name</Label>
                <Input
                  id="community_name"
                  placeholder="e.g. Lakewood Estates HOA"
                  {...register('community_name')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit_count">Number of Units</Label>
                <Input
                  id="unit_count"
                  type="number"
                  placeholder="e.g. 150"
                  {...register('unit_count')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(555) 123-4567"
                {...register('phone')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message (optional)</Label>
              <Textarea
                id="message"
                rows={3}
                placeholder="Tell us about your community or any specific questions"
                {...register('message')}
              />
            </div>

            {submitError && (
              <p className="text-sm text-red-500">{submitError}</p>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Request a Demo'}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}
