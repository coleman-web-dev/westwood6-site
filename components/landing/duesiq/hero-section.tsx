'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/shared/ui/button';
import { LandingFlickeringGridCtaBg } from '@/components/landing';
import { ArrowRight } from 'lucide-react';

function DashboardPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotateX: 8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.9, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="relative"
      style={{ perspective: '1200px' }}
    >
      <div className="relative rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/5 dark:ring-white/5">
        <Image
          className="w-full dark:hidden"
          src="/static/images/dashboard-light.png"
          alt="DuesIQ dashboard showing dues collection, payment tracking, and community management"
          width={1200}
          height={800}
          priority
        />
        <Image
          className="w-full hidden dark:block"
          src="/static/images/dashboard-dark.png"
          alt="DuesIQ dashboard showing dues collection, payment tracking, and community management"
          width={1200}
          height={800}
          priority
        />
        {/* Glassmorphism overlay gradient at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-canvas-light/80 dark:from-canvas-dark/80 to-transparent" />
      </div>
    </motion.div>
  );
}

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-24 pb-16 lg:pt-32 lg:pb-24">
      {/* Background effects */}
      <div className="absolute inset-0 -z-10">
        <LandingFlickeringGridCtaBg
          variant="primary"
          maxOpacity={0.08}
          flickerChance={0.03}
        />
      </div>

      {/* Organic gradient blobs */}
      <div className="absolute -top-24 -right-24 w-[500px] h-[500px] rounded-full bg-secondary-400/10 dark:bg-secondary-400/5 blur-3xl -z-10" />
      <div className="absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full bg-primary-300/10 dark:bg-primary-700/5 blur-3xl -z-10" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Text content - centered for impact */}
        <div className="max-w-3xl mx-auto text-center mb-12 lg:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium bg-secondary-400/10 text-secondary-600 dark:text-secondary-300 border border-secondary-400/20 mb-6">
              Built for self-managed HOAs
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-text-primary-light dark:text-text-primary-dark leading-[1.1]"
          >
            Dues collection, accounting, and community management.{' '}
            <span className="text-secondary-400">All in one place.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 text-lg lg:text-xl text-text-secondary-light dark:text-text-secondary-dark max-w-2xl mx-auto"
          >
            Stop chasing payments and juggling spreadsheets. DuesIQ gives your HOA board a single platform to manage finances, communications, amenities, and more.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 flex flex-wrap justify-center gap-3"
          >
            <Button size="lg" asChild className="group">
              <a href="#demo">
                Request a Demo
                <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
              </a>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/signup">Sign Up Free</Link>
            </Button>
          </motion.div>
        </div>

        {/* Dashboard preview - large, organic overflow */}
        <div className="relative mx-auto max-w-5xl">
          <DashboardPreview />
        </div>
      </div>
    </section>
  );
}
