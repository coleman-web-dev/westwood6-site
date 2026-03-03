// @ts-check
const { fontFamily } = require('tailwindcss/defaultTheme');
const { colors: customColors } = require('./data/config/colors');

/** @type {import("tailwindcss").Config } */
module.exports = {
  content: [
    './node_modules/@shipixen/pliny/**/*.js',
    './app/**/*.{js,ts,jsx,tsx,css,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,css,mdx}',
    './components/**/*.{js,ts,jsx,tsx,css,mdx}',
    './layouts/**/*.{js,ts,jsx,tsx,css,mdx}',
    './demo/**/*.{js,ts,jsx,tsx,css,mdx}',
    './data/**/*.mdx',
  ],
  darkMode: ['class'],
  theme: {
    extend: {
      lineHeight: {
        11: '2.75rem',
        12: '3rem',
        13: '3.25rem',
        14: '3.5rem',
      },
      fontFamily: {
        sans: ['var(--font-space-default)', ...fontFamily.sans],
        display: ['var(--font-space-display)', ...fontFamily.sans],
        cursive: ['var(--font-cursive)', 'cursive'],
        signature: ['var(--font-cursive)', 'cursive'],
      },
      colors: {
        /* ── Primary: Slate / Ink (full scale from brief) ── */
        primary: {
          50: '#F5F6F7',
          100: '#E7EAED',
          200: '#CBD2D9',
          300: '#9AA4AE',
          400: '#6B7580',
          500: '#4A525B',
          600: '#2D3238',
          700: '#1D2024',
          800: '#121416',
          900: '#0B0C0D',
          950: '#000000',
        },
        /* ── Secondary: Peach / Amber (full scale from brief) ── */
        secondary: {
          50: '#FFF6F0',
          100: '#FFE6D6',
          200: '#FFD1B5',
          300: '#FFB78C',
          400: '#F4AE90',
          500: '#E89473',
          600: '#C97355',
          700: '#9B533B',
          800: '#6E3A28',
          900: '#3D2318',
          950: '#24140E',
        },
        /* ── Gray neutrals for UI chrome ── */
        canvas: {
          dark: '#000000',
          light: '#F3EEE8',
        },
        surface: {
          dark: '#101010',
          'dark-2': '#1F1F1F',
          light: '#FFFFFF',
          'light-2': '#FAFAFA',
        },
        stroke: {
          dark: 'rgba(255,255,255,0.06)',
          light: 'rgba(17,24,39,0.08)',
        },
        grid: {
          dark: 'rgba(255,255,255,0.10)',
          light: 'rgba(17,24,39,0.10)',
        },
        'text-primary': {
          dark: 'rgba(255,255,255,0.92)',
          light: 'rgba(17,24,39,0.92)',
        },
        'text-secondary': {
          dark: 'rgba(255,255,255,0.62)',
          light: 'rgba(17,24,39,0.64)',
        },
        'text-muted': {
          dark: 'rgba(255,255,255,0.40)',
          light: 'rgba(17,24,39,0.44)',
        },
        /* ── Accent colors for charts & indicators ── */
        mint: {
          DEFAULT: '#7BD6AA',
          soft: 'rgba(123,214,170,0.22)',
        },
        peach: {
          chart: '#F4AE90',
          'chart-soft': 'rgba(244,174,144,0.22)',
        },
        warning: {
          dot: '#FF5A5A',
        },
        'icon-glow': 'rgba(244,174,144,0.20)',
        /* ── Shadcn system tokens ── */
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      /* ── Border radius from brief ── */
      borderRadius: {
        'app-frame': '28px',
        panel: '22px',
        'inner-card': '18px',
        pill: '999px',
      },
      /* ── Spacing from brief ── */
      spacing: {
        'app-padding': '24px',
        'grid-gap': '18px',
        'card-padding': '18px',
        'dense-row-y': '10px',
        'dense-row-x': '14px',
        sidebar: '72px',
        topbar: '64px',
      },
      /* ── Elevation / box-shadow from brief ── */
      boxShadow: {
        'surface-dark':
          '0 14px 40px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,255,255,0.06)',
        'raised-dark':
          '0 18px 52px rgba(0,0,0,0.70), inset 0 1px 0 rgba(255,255,255,0.08)',
        'surface-light':
          '0 10px 30px rgba(17,24,39,0.10), 0 1px 0 rgba(17,24,39,0.04)',
        'raised-light':
          '0 16px 40px rgba(17,24,39,0.12), 0 1px 0 rgba(17,24,39,0.05)',
      },
      /* ── Typography from brief ── */
      fontSize: {
        'metric-xl': ['28px', { lineHeight: '32px', fontWeight: '700' }],
        'metric-l': ['16px', { lineHeight: '20px', fontWeight: '600' }],
        'page-title': ['22px', { lineHeight: '28px', fontWeight: '600' }],
        'section-title': ['14px', { lineHeight: '20px', fontWeight: '600' }],
        'card-title': ['14px', { lineHeight: '20px', fontWeight: '600' }],
        body: ['13px', { lineHeight: '18px', fontWeight: '500' }],
        label: ['12px', { lineHeight: '16px', fontWeight: '500' }],
        meta: ['11px', { lineHeight: '14px', fontWeight: '500' }],
      },
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            a: {
              color: theme('colors.secondary.500'),
              '&:hover': {
                color: `${theme('colors.secondary.600')}`,
              },
              code: { color: theme('colors.secondary.400') },
            },
            'h1,h2': {
              fontWeight: '700',
              letterSpacing: theme('letterSpacing.tight'),
            },
            h3: {
              fontWeight: '600',
            },
            code: {
              color: theme('colors.indigo.500'),
            },
          },
        },
        invert: {
          css: {
            a: {
              color: theme('colors.secondary.400'),
              '&:hover': {
                color: `${theme('colors.secondary.300')}`,
              },
              code: { color: theme('colors.secondary.300') },
            },
            'h1,h2,h3,h4,h5,h6': {
              color: theme('colors.gray.100'),
            },
          },
        },
      }),
      screens: {
        '2xl': '1400px',
        'tall-sm': { raw: '(min-height: 640px)' },
        'tall-md': { raw: '(min-height: 768px)' },
        'tall-lg': { raw: '(min-height: 1024px)' },
        'tall-xl': { raw: '(min-height: 1280px)' },
        'tall-2xl': { raw: '(min-height: 1536px)' },
      },
      zIndex: {
        60: 60,
        70: 70,
        80: 80,
        90: 90,
        100: 100,
        110: 110,
      },
      transitionDuration: {
        2000: '2000ms',
        3000: '3000ms',
      },
      keyframes: {
        'accordion-down': {
          from: { height: 0 },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: 0 },
        },
        'collapsible-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-collapsible-content-height)' },
        },
        'collapsible-up': {
          from: { height: 'var(--radix-collapsible-content-height)' },
          to: { height: '0' },
        },
        'fade-in-down': {
          '0%': {
            opacity: '0',
            transform: 'translateY(-30px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        wiggle: {
          '0%, 100%': {
            transform: 'rotate(-3deg)',
          },
          '50%': {
            transform: 'rotate(3deg)',
          },
        },
        'rotate-left-to-right': {
          '0%': { transform: 'rotate(-35deg)' },
          '30%': { transform: 'rotate(-10deg)' },
          '50%': { transform: 'rotate(20deg)' },
          '60%': { transform: 'rotate(35deg)' },
          '70%': { transform: 'rotate(15deg)' },
          '80%': { transform: 'rotate(45deg)' },
          '90%': { transform: 'rotate(-10deg)' },
          '100%': { transform: 'rotate(-35deg)' },
        },
        tilt: {
          '0%,50%,to': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(.5deg)' },
          '75%': { transform: 'rotate(-.5deg)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        tilt: 'tilt 10s linear infinite',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'collapsible-down': 'collapsible-down 0.2s ease-out',
        'collapsible-up': 'collapsible-up 0.2s ease-out',
        wiggle: 'wiggle 1s ease-in-out infinite',
        'fade-in-down-snail': 'fade-in-down 5s ease-in forwards',
        'fade-in-down-slower': 'fade-in-down 1.2s ease-in-out forwards',
        'fade-in-down-slow': 'fade-in-down 1s ease-in-out forwards',
        'fade-in-down-normal': 'fade-in-down 0.8s ease-in-out forwards',
        'fade-in-down-fast': 'fade-in-down 0.6s ease-in-out forwards',
        'fade-in-down-faster': 'fade-in-down 0.4s ease-in-out forwards',
        'rotate-left-to-right': 'rotate-left-to-right 3s ease-in-out infinite',
        'fade-in-down-normal-delay':
          'fade-in-down 0.8s ease-in-out 2s forwards',
        marquee: '30s marquee linear infinite',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
};
