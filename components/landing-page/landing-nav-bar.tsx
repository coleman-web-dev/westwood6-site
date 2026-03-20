'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, ArrowUpRight } from 'lucide-react';
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

  const dashboardHref = isMember
    ? `/${slug}/dashboard`
    : `/login?redirect=/${slug}/dashboard`;
  const ctaLabel = isMember ? 'Dashboard' : 'Login';

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

  /* ── Luxury nav ─────────────────────────────────────────── */
  if (layoutTemplate === 'luxury') {
    return (
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled ? 'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]' : 'bg-transparent'
        }`}
      >
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 sm:px-8 h-16">
          {/* Left: logo + uppercase community name */}
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-3 shrink-0"
          >
            {logoUrl && (
              <img
                src={logoUrl}
                alt={`${communityName} logo`}
                className="h-7 w-7 rounded object-cover"
              />
            )}
            <span
              className={`text-[10px] font-medium tracking-[0.2em] uppercase transition-colors duration-500 ${
                scrolled ? 'text-gray-900' : 'text-white'
              }`}
            >
              {communityName}
            </span>
          </button>

          {/* Center-right: elegant spaced uppercase links */}
          <div className="hidden md:flex items-center gap-6">
            {navSections.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => scrollTo(s.id)}
                className={`text-[10px] font-medium tracking-widest uppercase transition-colors duration-500 ${
                  scrolled
                    ? 'text-gray-400 hover:text-gray-900'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {SECTION_LABELS[s.id]}
              </button>
            ))}
          </div>

          {/* Right: bordered CTA + hamburger */}
          <div className="flex items-center gap-3">
            <Link
              href={dashboardHref}
              className={`hidden sm:inline-flex items-center rounded px-5 py-1.5 text-[10px] font-medium tracking-widest uppercase border transition-all duration-500 ${
                scrolled
                  ? 'border-gray-300 text-gray-900 hover:bg-gray-50'
                  : 'border-white/30 text-white hover:bg-white/10'
              }`}
            >
              {ctaLabel}
            </Link>

            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className={`md:hidden p-1.5 rounded transition-colors duration-500 ${
                scrolled
                  ? 'text-gray-700 hover:bg-gray-50'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              {menuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile dropdown: clean white, elegant spacing */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ${
            menuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="bg-white border-t border-gray-100">
            <div className="px-6 py-5 space-y-1">
              {navSections.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => scrollTo(s.id)}
                  className="block w-full text-left px-3 py-3 text-[10px] font-medium tracking-widest uppercase text-gray-400 hover:text-gray-900 transition-colors duration-200"
                >
                  {SECTION_LABELS[s.id]}
                </button>
              ))}
              <div className="pt-3 border-t border-gray-100 mt-3">
                <Link
                  href={dashboardHref}
                  className="block w-full text-center px-3 py-2.5 rounded text-[10px] font-medium tracking-widest uppercase border border-gray-300 text-gray-900 hover:bg-gray-50 transition-colors duration-200"
                >
                  {ctaLabel}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  /* ── Modern nav ──────────────────────────────────────────── */
  if (layoutTemplate === 'modern') {
    return (
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white backdrop-blur-md shadow-sm'
            : 'bg-transparent'
        }`}
      >
        <div className="mx-auto max-w-6xl flex items-center justify-between px-4 sm:px-6 h-16">
          {/* Left: logo + bold community name */}
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
              className={`text-sm font-bold transition-colors duration-300 ${
                scrolled ? 'text-gray-900' : 'text-white'
              }`}
            >
              {communityName}
            </span>
          </button>

          {/* Right-aligned: section links + login */}
          <div className="flex items-center gap-1">
            <div className="hidden md:flex items-center gap-0.5">
              {navSections.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => scrollTo(s.id)}
                  className="group relative px-3 py-1.5 text-xs font-medium transition-colors duration-300"
                >
                  <span
                    className={`transition-colors duration-300 ${
                      scrolled
                        ? 'text-gray-600 group-hover:text-gray-900'
                        : 'text-white/80 group-hover:text-white'
                    }`}
                  >
                    {SECTION_LABELS[s.id]}
                  </span>
                  {/* Animated accent underline on hover */}
                  <span
                    className="absolute bottom-0 left-3 right-3 h-0.5 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-full"
                    style={{ backgroundColor: 'var(--landing-accent)' }}
                  />
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 ml-3">
              <Link
                href={dashboardHref}
                className="hidden sm:inline-flex items-center rounded-full px-5 py-1.5 text-xs font-semibold text-white transition-all duration-300 hover:opacity-90 hover:shadow-md"
                style={{ backgroundColor: 'var(--landing-accent)' }}
              >
                {ctaLabel}
              </Link>

              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className={`md:hidden p-1.5 rounded-lg transition-colors duration-300 ${
                  scrolled
                    ? 'text-gray-700 hover:bg-gray-100'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                {menuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Thin accent line at bottom of nav */}
        <div
          className="h-[2px]"
          style={{ backgroundColor: 'var(--landing-accent)' }}
        />

        {/* Mobile dropdown */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ${
            menuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div
            className="bg-white/95 backdrop-blur-md border-t-2"
            style={{ borderColor: 'var(--landing-accent)' }}
          >
            <div className="px-4 py-3 space-y-0.5">
              {navSections.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => scrollTo(s.id)}
                  className="block w-full text-left px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                >
                  {SECTION_LABELS[s.id]}
                </button>
              ))}
              <div className="pt-1 border-t border-gray-200/60 mt-1">
                <Link
                  href={dashboardHref}
                  className="block w-full text-center px-3 py-2.5 rounded-full text-sm font-semibold text-white transition-colors duration-200 hover:opacity-90"
                  style={{ backgroundColor: 'var(--landing-accent)' }}
                >
                  {ctaLabel}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  /* ── Classic nav (default) ───────────────────────────────── */
  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/90 backdrop-blur-xl shadow-sm'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto max-w-6xl flex items-center justify-between px-4 sm:px-6 h-16">
        {/* Left: logo + community name */}
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-2.5 shrink-0"
        >
          {logoUrl && (
            <img
              src={logoUrl}
              alt={`${communityName} logo`}
              className="h-8 w-8 rounded-full object-cover"
            />
          )}
          <span
            className={`text-sm font-semibold transition-colors duration-300 ${
              scrolled ? 'text-gray-900' : 'text-white'
            }`}
          >
            {communityName}
          </span>
        </button>

        {/* Center: pill-shaped nav group (desktop) */}
        <div
          className={`hidden md:flex items-center gap-0.5 absolute left-1/2 -translate-x-1/2 rounded-full px-1.5 py-1.5 transition-all duration-300 ${
            scrolled
              ? 'border border-gray-200/60 bg-gray-100/50'
              : 'border border-white/15 bg-white/5 backdrop-blur-md'
          }`}
        >
          {navSections.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => scrollTo(s.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors duration-300 ${
                scrolled
                  ? 'text-gray-600 hover:text-gray-900 hover:bg-white'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              {SECTION_LABELS[s.id]}
            </button>
          ))}
        </div>

        {/* Right: text label + accent circle CTA + hamburger */}
        <div className="flex items-center gap-3">
          <Link
            href={dashboardHref}
            className={`hidden sm:inline-flex items-center gap-2 text-xs font-medium transition-colors duration-300 ${
              scrolled ? 'text-gray-700' : 'text-white/80'
            }`}
          >
            {ctaLabel}
          </Link>
          <Link
            href={dashboardHref}
            className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full text-white transition-all duration-300 hover:opacity-90 hover:shadow-lg"
            style={{ backgroundColor: 'var(--landing-accent)' }}
          >
            <ArrowUpRight className="h-4 w-4" />
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className={`md:hidden p-1.5 rounded-full transition-colors duration-300 ${
              scrolled
                ? 'text-gray-700 hover:bg-gray-100'
                : 'text-white hover:bg-white/10'
            }`}
          >
            {menuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown with glass-morphism */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ${
          menuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="bg-white/95 backdrop-blur-xl mx-4 mt-2 rounded-2xl shadow-2xl border border-gray-100">
          <div className="px-4 py-3 space-y-0.5">
            {navSections.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => scrollTo(s.id)}
                className="block w-full text-left px-4 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
              >
                {SECTION_LABELS[s.id]}
              </button>
            ))}
            <div className="pt-2 border-t border-gray-100 mt-2">
              <Link
                href={dashboardHref}
                className="block w-full text-center px-4 py-2.5 rounded-full text-sm font-semibold text-white transition-colors duration-200 hover:opacity-90"
                style={{ backgroundColor: 'var(--landing-accent)' }}
              >
                {ctaLabel}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
