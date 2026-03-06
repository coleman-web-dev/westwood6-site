import { Inter, Dancing_Script } from 'next/font/google';
import { siteConfig } from '@/data/config/site.settings';
import { ThemeProviders } from './theme-providers';
import { Metadata } from 'next';

import { colors } from '@/data/config/colors.js';

import '@/css/globals.css';
import { SearchProvider } from '@/components/shared/SearchProvider';
import { AnalyticsWrapper } from '@/components/shared/Analytics';
import { Toaster } from '@/components/shared/ui/sonner';

const displayFont = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-space-display',
});

const baseFont = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-space-default',
});

const cursiveFont = Dancing_Script({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-cursive',
  weight: ['400', '700'],
});

const globalColors = colors;
const style: string[] = [];

Object.keys(globalColors).map((variant) => {
  return Object.keys(globalColors[variant]).map((color) => {
    const value = globalColors[variant][color];
    style.push(`--${variant}-${color}: ${value}`);
  });
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.title}`,
  },
  description: siteConfig.description,
  openGraph: {
    title: siteConfig.title,
    description: siteConfig.description,
    url: './',
    siteName: siteConfig.title,
    images: [siteConfig.socialBanner],
    locale: 'en_US',
    type: 'website',
  },
  alternates: {
    canonical: './',
    types: {
      'application/rss+xml': `${siteConfig.siteUrl}/feed.xml`,
    },
  },
  other: {
    'geo.region': 'US',
    'geo.placename': 'United States',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  twitter: {
    title: siteConfig.title,
    card: 'summary_large_image',
    images: [siteConfig.socialBanner],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang={siteConfig.language}
      className={`${baseFont.variable} ${displayFont.variable} ${cursiveFont.variable} scroll-smooth`}
      suppressHydrationWarning
    >
      <head>
        <style>
          {`
          :root, :before, :after {
            ${style.join(';')}
          }
        `}
        </style>

        <link
          rel="apple-touch-icon"
          sizes="76x76"
          href="/static/favicons/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/svg+xml"
          href="/static/favicons/icon.svg"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/static/favicons/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/static/favicons/favicon-16x16.png"
        />
        <link rel="manifest" href="/static/favicons/manifest.webmanifest" />
        <link
          rel="mask-icon"
          href="/static/favicons/safari-pinned-tab.svg"
          color="#5bbad5"
        />
        <meta name="msapplication-TileColor" content="#000000" />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: light)"
          content="#F3EEE8"
        />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: dark)"
          content="#000"
        />
      </head>

      <body className="bg-canvas-light text-text-primary-light antialiased dark:bg-canvas-dark dark:text-text-primary-dark min-h-screen font-sans">
        <ThemeProviders>
          <AnalyticsWrapper />

          <SearchProvider>
            {children}
          </SearchProvider>

          <Toaster position="top-right" richColors />
        </ThemeProviders>
      </body>
    </html>
  );
}
