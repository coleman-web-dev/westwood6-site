'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { SECTION_LABELS } from '@/lib/types/landing';
import type { LandingPageSection, LayoutTemplate } from '@/lib/types/landing';

interface LandingNavBarProps {
  communityName: string;
  logoUrl: string | null;
  sections: LandingPageSection[];
  slug: string;
  isMember: boolean;
  layoutTemplate?: LayoutTemplate;
}

export function LandingNavBar({
  communityName,
  logoUrl,
  sections,
  slug,
  isMember,
  layoutTemplate = 'classic',
}: LandingNavBarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const navSections = sections
    .filter((s) => s.enabled && s.id !== 'hero')
    .sort((a, b) => a.order - b.order);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 40);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function scrollTo(sectionId: string) {
    const el = document.getElementById(`section-${sectionId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setMenuOpen(false);
  }

  /* ── Editorial nav ───────────────────────────────────────── */
  if (layoutTemplate === 'editorial') {
    return (
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/80 backdrop-blur-md'
            : 'bg-transparent'
        }`}
      >
        <div className="mx-auto max-w-6xl flex items-center justify-between px-4 sm:px-6 h-14">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2.5 shrink-0"
          >
            {logoUrl && (
              <img
                src={logoUrl}
                alt={`${communityName} logo`}
                className="h-8 w-8 rounded-lg object-cover"
              />
            )}
            <span
              className={`text-xs font-semibold tracking-wide uppercase transition-colors ${
                scrolled ? 'text-gray-900' : 'text-white'
              }`}
            >
              {communityName}
            </span>
          </button>

          <div className="hidden md:flex items-center gap-1">
            {navSections.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => scrollTo(s.id)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium tracking-wide uppercase transition-colors ${
                  scrolled
                    ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                {SECTION_LABELS[s.id]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={isMember ? `/${slug}/dashboard` : `/login?redirect=/${slug}/dashboard`}
              className={`hidden sm:inline-flex items-center rounded-lg px-4 py-1.5 text-[11px] font-medium tracking-wide uppercase transition-colors ${
                scrolled
                  ? 'bg-gray-900 text-white hover:bg-gray-800'
                  : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
              }`}
            >
              {isMember ? 'Dashboard' : 'Login'}
            </Link>

            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className={`md:hidden p-1.5 rounded-lg transition-colors ${
                scrolled
                  ? 'text-gray-700 hover:bg-gray-100'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-lg">
            <div className="px-4 py-3 space-y-1">
              {navSections.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => scrollTo(s.id)}
                  className="block w-full text-left px-3 py-2 rounded-lg text-xs tracking-wide uppercase text-gray-700 hover:bg-gray-100"
                >
                  {SECTION_LABELS[s.id]}
                </button>
              ))}
              <Link
                href={isMember ? `/${slug}/dashboard` : `/login?redirect=/${slug}/dashboard`}
                className="block w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-gray-900 hover:bg-gray-100"
              >
                {isMember ? 'Dashboard' : 'Login'}
              </Link>
            </div>
          </div>
        )}
      </nav>
    );
  }

  /* ── Modern nav (accent bottom border) ───────────────────── */
  if (layoutTemplate === 'modern') {
    return (
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/90 backdrop-blur-md shadow-sm'
            : 'bg-transparent'
        }`}
      >
        <div className="mx-auto max-w-6xl flex items-center justify-between px-4 sm:px-6 h-14">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2.5 shrink-0"
          >
            {logoUrl && (
              <img
                src={logoUrl}
                alt={`${communityName} logo`}
                className="h-8 w-8 rounded-lg object-cover"
              />
            )}
            <span
              className={`text-sm font-semibold transition-colors ${
                scrolled ? 'text-gray-900' : 'text-white'
              }`}
            >
              {communityName}
            </span>
          </button>

          <div className="hidden md:flex items-center gap-1">
            {navSections.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => scrollTo(s.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  scrolled
                    ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                {SECTION_LABELS[s.id]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={isMember ? `/${slug}/dashboard` : `/login?redirect=/${slug}/dashboard`}
              className={`hidden sm:inline-flex items-center rounded-lg px-4 py-1.5 text-xs font-medium transition-colors ${
                scrolled
                  ? 'bg-gray-900 text-white hover:bg-gray-800'
                  : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
              }`}
            >
              {isMember ? 'Dashboard' : 'Login'}
            </Link>

            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className={`md:hidden p-1.5 rounded-lg transition-colors ${
                scrolled
                  ? 'text-gray-700 hover:bg-gray-100'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Accent bottom border line */}
        <div
          className="h-0.5"
          style={{ backgroundColor: 'var(--landing-accent)' }}
        />

        {menuOpen && (
          <div className="md:hidden bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-lg">
            <div className="px-4 py-3 space-y-1">
              {navSections.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => scrollTo(s.id)}
                  className="block w-full text-left px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
                >
                  {SECTION_LABELS[s.id]}
                </button>
              ))}
              <Link
                href={isMember ? `/${slug}/dashboard` : `/login?redirect=/${slug}/dashboard`}
                className="block w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-gray-900 hover:bg-gray-100"
              >
                {isMember ? 'Dashboard' : 'Login'}
              </Link>
            </div>
          </div>
        )}
      </nav>
    );
  }

  /* ── Classic nav (original) ──────────────────────────────── */
  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/90 backdrop-blur-md shadow-sm'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto max-w-6xl flex items-center justify-between px-4 sm:px-6 h-14">
        {/* Left: logo + name */}
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-2.5 shrink-0"
        >
          {logoUrl && (
            <img
              src={logoUrl}
              alt={`${communityName} logo`}
              className="h-8 w-8 rounded-lg object-cover"
            />
          )}
          <span
            className={`text-sm font-semibold transition-colors ${
              scrolled ? 'text-gray-900' : 'text-white'
            }`}
          >
            {communityName}
          </span>
        </button>

        {/* Center: section links (desktop) */}
        <div className="hidden md:flex items-center gap-1">
          {navSections.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => scrollTo(s.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                scrolled
                  ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              {SECTION_LABELS[s.id]}
            </button>
          ))}
        </div>

        {/* Right: login/dashboard + hamburger */}
        <div className="flex items-center gap-2">
          <Link
            href={isMember ? `/${slug}/dashboard` : `/login?redirect=/${slug}/dashboard`}
            className={`hidden sm:inline-flex items-center rounded-lg px-4 py-1.5 text-xs font-medium transition-colors ${
              scrolled
                ? 'bg-gray-900 text-white hover:bg-gray-800'
                : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
            }`}
          >
            {isMember ? 'Dashboard' : 'Login'}
          </Link>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className={`md:hidden p-1.5 rounded-lg transition-colors ${
              scrolled
                ? 'text-gray-700 hover:bg-gray-100'
                : 'text-white hover:bg-white/10'
            }`}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-lg">
          <div className="px-4 py-3 space-y-1">
            {navSections.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => scrollTo(s.id)}
                className="block w-full text-left px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
              >
                {SECTION_LABELS[s.id]}
              </button>
            ))}
            <Link
              href={isMember ? `/${slug}/dashboard` : `/login?redirect=/${slug}/dashboard`}
              className="block w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-gray-900 hover:bg-gray-100"
            >
              {isMember ? 'Dashboard' : 'Login'}
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
