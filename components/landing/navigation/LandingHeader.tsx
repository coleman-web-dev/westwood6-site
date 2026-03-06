'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MenuIcon, OrbitIcon } from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/shared/ui/sheet';
import clsx from 'clsx';

/**
 * A component that renders the navigation bar for the landing page.
 * Full-width glassmorphism bar fixed to the top of the viewport.
 */
export const LandingHeader = ({
  logoComponent,
  children,
  withBackground = false,
  variant = 'primary',
  fixed = false,
  className,
}: {
  logoComponent?: React.ReactNode;
  children: React.ReactNode;
  withBackground?: boolean;
  variant?: 'primary' | 'secondary';
  fixed?: boolean;
  className?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header
      className={clsx(
        'w-full top-0 left-0 right-0 z-50',
        fixed ? 'fixed' : '',
        className,
      )}
    >
      {/* Glassmorphism backdrop */}
      <div className="absolute inset-0 bg-white/60 dark:bg-black/50 backdrop-blur-2xl backdrop-saturate-150 border-b border-white/20 dark:border-white/[0.06]" />

      <nav className="relative flex items-center justify-between gap-6 px-6 lg:px-10 py-4 max-w-7xl mx-auto">
        <div className="flex items-center">
          {logoComponent || (
            <Link href="/" className="text-2xl font-bold">
              <div className="flex items-center gap-3 justify-between">
                <OrbitIcon className="h-8 w-8 text-primary-900 dark:text-primary-100" />
                <div className="hidden text-2xl font-semibold font-display sm:flex gap-2 h-full">
                  Page <span className="font-bold">UI</span>
                </div>
              </div>
            </Link>
          )}
        </div>

        <div className="hidden md:flex items-center gap-6">{children}</div>

        <div className="md:hidden">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="px-3">
                <MenuIcon className="h-6 w-6 mr-2" />
                Menu
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <nav className="flex flex-col gap-4 mt-8">{children}</nav>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
};
