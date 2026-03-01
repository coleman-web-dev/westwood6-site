'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ResponsiveGridLayout,
  useContainerWidth,
  type Layout,
} from 'react-grid-layout';

type Layouts = { [P: string]: Layout[] };
import { useTheme } from 'next-themes';
import 'react-grid-layout/css/styles.css';
import {
  LayoutDashboardIcon,
  CalendarIcon,
  FileTextIcon,
  BarChart3Icon,
  SettingsIcon,
  HelpCircleIcon,
  SearchIcon,
  BellIcon,
  MailIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MenuIcon,
  XIcon,
  PencilIcon,
  ChevronDownIcon,
  SunIcon,
  MoonIcon,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
} from 'recharts';

/* ================================================================
   SETUP
   ================================================================ */

/* ================================================================
   MOCK DATA
   ================================================================ */

const chartData = [
  { month: 'Jan', seriesA: 45000, seriesB: 62000 },
  { month: 'Feb', seriesA: 52000, seriesB: 48000 },
  { month: 'Mar', seriesA: 38000, seriesB: 72000 },
  { month: 'Apr', seriesA: 67000, seriesB: 55000 },
  { month: 'May', seriesA: 48000, seriesB: 82000 },
  { month: 'Jun', seriesA: 72000, seriesB: 42000 },
];

const transactions = [
  { icon: '🎵', name: 'Spotify', date: '20.09.21', amount: '-$ 10.00' },
  { icon: '📦', name: 'Amazon', date: '19.09.21', amount: '-$ 567' },
  { icon: '🏛️', name: 'ID Foundation', date: '16.09.21', amount: '-$ 200' },
  { icon: '💳', name: '**** **** **** 4567', date: 'Transfer', amount: '-$ 567' },
];

const upcomingPayments = [
  { icon: '⚡', name: 'Electric Bill', date: 'Tomorrow', amount: '-$ 267.00' },
  { icon: '🎬', name: 'Netflix', date: '25.09.2021', amount: '-$ 32.55' },
];

/* ================================================================
   GRID LAYOUT DEFINITIONS
   ================================================================ */

// Row height formula: pixelHeight = h * rowHeight + (h - 1) * margin
// With rowHeight=30, margin=18: h=5 → 222px, h=6 → 270px, h=7 → 318px, h=8 → 366px

const CARD_IDS = [
  'credit-card',
  'card-info',
  'upcoming',
  'balance',
  'stats',
  'transactions',
  'chart',
  'conversion',
];

const DEFAULT_LAYOUTS: Layouts = {
  lg: [
    { i: 'credit-card',  x: 0, y: 0, w: 4, h: 5 },
    { i: 'card-info',    x: 4, y: 0, w: 4, h: 6 },
    { i: 'balance',      x: 8, y: 0, w: 4, h: 3 },
    { i: 'upcoming',     x: 0, y: 5, w: 4, h: 4 },
    { i: 'stats',        x: 8, y: 3, w: 4, h: 3 },
    { i: 'transactions', x: 0, y: 9, w: 4, h: 7 },
    { i: 'conversion',   x: 4, y: 6, w: 4, h: 8 },
    { i: 'chart',        x: 8, y: 6, w: 4, h: 7 },
  ],
  md: [
    { i: 'credit-card',  x: 0, y: 0,  w: 6, h: 5 },
    { i: 'card-info',    x: 6, y: 0,  w: 6, h: 6 },
    { i: 'balance',      x: 0, y: 5,  w: 6, h: 3 },
    { i: 'upcoming',     x: 6, y: 6,  w: 6, h: 4 },
    { i: 'stats',        x: 0, y: 8,  w: 6, h: 3 },
    { i: 'transactions', x: 6, y: 10, w: 6, h: 7 },
    { i: 'conversion',   x: 0, y: 11, w: 6, h: 8 },
    { i: 'chart',        x: 6, y: 17, w: 6, h: 7 },
  ],
  sm: [
    { i: 'credit-card',  x: 0, y: 0,  w: 12, h: 6 },
    { i: 'card-info',    x: 0, y: 6,  w: 12, h: 7 },
    { i: 'balance',      x: 0, y: 13, w: 12, h: 3 },
    { i: 'upcoming',     x: 0, y: 16, w: 12, h: 5 },
    { i: 'stats',        x: 0, y: 21, w: 12, h: 4 },
    { i: 'transactions', x: 0, y: 25, w: 12, h: 8 },
    { i: 'conversion',   x: 0, y: 33, w: 12, h: 10 },
    { i: 'chart',        x: 0, y: 43, w: 12, h: 8 },
  ],
};

const STORAGE_KEY = 'duesiq-layout';

function renderCard(id: string) {
  switch (id) {
    case 'credit-card':
      return <CreditCardSection />;
    case 'card-info':
      return <CardInfoPanel />;
    case 'upcoming':
      return <UpcomingPaymentsPanel />;
    case 'balance':
      return <BalanceSummaryPanel />;
    case 'stats':
      return <StatTilesPanel />;
    case 'transactions':
      return <TransactionsPanel />;
    case 'chart':
      return <BalanceHistoryChart />;
    case 'conversion':
      return <ConversionWidget />;
    default:
      return null;
  }
}

/* ================================================================
   PAGE COMPONENT
   ================================================================ */

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [layouts, setLayouts] = useState<Layouts>(DEFAULT_LAYOUTS);
  const [currentBreakpoint, setCurrentBreakpoint] = useState('lg');
  const { resolvedTheme, setTheme } = useTheme();
  const { containerRef: gridRef, width: gridWidth } = useContainerWidth();

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Only use saved layouts if they have all breakpoints
        if (parsed.lg && parsed.md && parsed.sm) {
          setLayouts(parsed);
        }
      }
    } catch {
      // Ignore bad localStorage data
    }
  }, []);

  const onLayoutChange = useCallback((_current: Layout[], allLayouts: Layouts) => {
    setLayouts(allLayouts);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allLayouts));
  }, []);

  const onBreakpointChange = useCallback((newBreakpoint: string) => {
    setCurrentBreakpoint(newBreakpoint);
  }, []);

  // Disable drag on small screens (single column)
  const isDraggable = currentBreakpoint !== 'sm';

  return (
    <div className="min-h-screen flex">
      {/* ── Sidebar (icon-only rail) ── */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-50 h-screen
          w-sidebar flex flex-col items-center
          py-4 gap-3.5
          bg-surface-light lg:bg-surface-light
          dark:bg-surface-dark
          border-r border-stroke-light dark:border-stroke-dark
          transform transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Mobile close */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden absolute top-3 right-3 p-1 rounded-lg text-text-muted-dark hover:text-text-primary-dark"
        >
          <XIcon className="w-4 h-4" />
        </button>

        {/* Brand mark */}
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-secondary-300 to-mint flex items-center justify-center mb-4">
          <span className="text-[10px] font-bold text-primary-900">D</span>
        </div>

        {/* Nav icons */}
        <nav className="flex-1 flex flex-col items-center gap-1">
          <NavIcon icon={LayoutDashboardIcon} active />
          <NavIcon icon={CalendarIcon} />
          <NavIcon icon={FileTextIcon} />
          <NavIcon icon={BarChart3Icon} />
        </nav>

        {/* Utility icons */}
        <div className="flex flex-col items-center gap-1">
          <NavIcon icon={SettingsIcon} />
          <NavIcon icon={HelpCircleIcon} />
        </div>
      </aside>

      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* ── Top bar ── */}
        <header className="sticky top-0 z-30 h-topbar flex items-center gap-2 sm:gap-4 px-3 sm:px-app-padding border-b border-stroke-light dark:border-stroke-dark bg-canvas-light/80 dark:bg-canvas-dark/80 backdrop-blur-xl">
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 rounded-inner-card text-text-secondary-light dark:text-text-secondary-dark hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors"
          >
            <MenuIcon className="w-5 h-5" />
          </button>

          {/* Title */}
          <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">
            Dashboard
          </h1>

          {/* Search (centered) */}
          <div className="hidden sm:flex flex-1 justify-center">
            <div className="relative w-full max-w-xs">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted-light dark:text-text-muted-dark" />
              <input
                type="text"
                placeholder="Search"
                className="w-full h-9 pl-9 pr-4 bg-surface-light-2 dark:bg-surface-dark-2 border-0 rounded-pill text-body text-text-primary-light dark:text-text-primary-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-secondary-400/30 transition-all"
              />
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3 ml-auto">
            {/* Theme toggle */}
            {mounted && (
              <button
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-inner-card text-text-secondary-light dark:text-text-secondary-dark hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors"
                aria-label="Toggle theme"
              >
                {resolvedTheme === 'dark' ? (
                  <SunIcon className="w-[18px] h-[18px]" />
                ) : (
                  <MoonIcon className="w-[18px] h-[18px]" />
                )}
              </button>
            )}

            <button className="relative p-2 rounded-inner-card text-text-secondary-light dark:text-text-secondary-dark hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors">
              <BellIcon className="w-[18px] h-[18px]" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-warning-dot rounded-full" />
            </button>
            <button className="p-2 rounded-inner-card text-text-secondary-light dark:text-text-secondary-dark hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors">
              <MailIcon className="w-[18px] h-[18px]" />
            </button>
            <div className="w-7 h-7 rounded-full bg-secondary-400 flex items-center justify-center text-meta font-semibold text-primary-900">
              CM
            </div>
          </div>
        </header>

        {/* ── Content grid (draggable dashboard) ── */}
        <main ref={gridRef} className="flex-1 p-3 sm:p-app-padding">
          {mounted && gridWidth > 0 ? (
            <ResponsiveGridLayout
              width={gridWidth}
              layouts={layouts}
              breakpoints={{ lg: 1200, md: 768, sm: 0 }}
              cols={{ lg: 12, md: 12, sm: 12 }}
              rowHeight={30}
              margin={currentBreakpoint === 'sm' ? [12, 12] : [18, 18]}
              compactType="vertical"
              isDraggable={isDraggable}
              isResizable={false}
              draggableHandle=".drag-handle"
              onLayoutChange={onLayoutChange}
              onBreakpointChange={onBreakpointChange}
            >
              {CARD_IDS.map((id) => (
                <div key={id} className="h-full overflow-hidden">
                  {renderCard(id)}
                </div>
              ))}
            </ResponsiveGridLayout>
          ) : null}
        </main>
      </div>
    </div>
  );
}

/* ================================================================
   CARD COMPONENTS
   Each card's title/header row has className="drag-handle" so the
   entire top bar of the card is the drag target.
   ================================================================ */

function CreditCardSection() {
  return (
    <div className="flex flex-col gap-grid-gap h-full">
      {/* Drag handle: full-width header row */}
      <div className="drag-handle cursor-grab active:cursor-grabbing flex items-center justify-between select-none">
        <h2 className="text-section-title text-text-primary-light dark:text-text-primary-dark">Cards</h2>
        <div className="flex gap-1.5">
          <button className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface-light dark:bg-surface-dark-2 border border-stroke-light dark:border-stroke-dark text-text-muted-light dark:text-text-muted-dark hover:text-text-primary-light dark:hover:text-text-primary-dark transition-colors">
            <ChevronLeftIcon className="w-3.5 h-3.5" />
          </button>
          <button className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface-light dark:bg-surface-dark-2 border border-stroke-light dark:border-stroke-dark text-text-muted-light dark:text-text-muted-dark hover:text-text-primary-light dark:hover:text-text-primary-dark transition-colors">
            <ChevronRightIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Credit card preview */}
      <div className="relative flex-1 rounded-panel p-card-padding bg-gradient-to-br from-secondary-200 to-secondary-300 raised-elevation overflow-hidden">
        <div className="flex justify-between items-start mb-8">
          <span className="text-metric-xl text-primary-900 tabular-nums">$ 1,675.22</span>
          <span className="text-card-title font-bold text-primary-800 tracking-wider">VISA</span>
        </div>
        <p className="text-body text-primary-600 tracking-[0.2em] mb-6">****&nbsp;&nbsp;****&nbsp;&nbsp;****&nbsp;&nbsp;67545</p>
        <div className="flex justify-between">
          <div>
            <span className="text-meta text-primary-500 block">Owner</span>
            <span className="text-label text-primary-800">Carolyn Mullins</span>
          </div>
          <div className="text-right">
            <span className="text-meta text-primary-500 block">Expiry</span>
            <span className="text-label text-primary-800">14/29</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CardInfoPanel() {
  return (
    <div className="h-full rounded-panel p-card-padding bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark surface-elevation">
      {/* Drag handle: full-width title row */}
      <div className="drag-handle cursor-grab active:cursor-grabbing flex items-center justify-between mb-4 select-none">
        <h3 className="text-card-title text-text-primary-light dark:text-text-primary-dark">Card Info</h3>
        <button className="p-1.5 rounded-lg text-text-muted-light dark:text-text-muted-dark hover:text-secondary-500 transition-colors">
          <PencilIcon className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="space-y-3">
        <InfoRow label="Card Number" value="**** **** **** 67545" />
        <InfoRow label="Status" value="Active" />
        <InfoRow label="Currency" value="USD" />
        <InfoRow label="Balance" value="$ 1,675.22" />
      </div>
      <button className="w-full mt-4 h-9 rounded-pill border border-stroke-light dark:border-stroke-dark text-label text-secondary-500 dark:text-secondary-400 hover:bg-secondary-50 dark:hover:bg-surface-dark-2 transition-colors">
        Details
      </button>
    </div>
  );
}

function UpcomingPaymentsPanel() {
  return (
    <div className="h-full rounded-panel p-card-padding bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark surface-elevation">
      {/* Drag handle: full-width title */}
      <div className="drag-handle cursor-grab active:cursor-grabbing mb-4 select-none">
        <h3 className="text-card-title text-text-primary-light dark:text-text-primary-dark">Upcoming Payments</h3>
      </div>
      <div className="space-y-3">
        {upcomingPayments.map((item) => (
          <div key={item.name} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2 flex items-center justify-center text-base">
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-body text-text-primary-light dark:text-text-primary-dark truncate">{item.name}</p>
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">{item.date}</p>
            </div>
            <span className="text-body tabular-nums text-text-primary-light dark:text-text-primary-dark">{item.amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BalanceSummaryPanel() {
  return (
    <div className="h-full rounded-panel p-card-padding bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark surface-elevation">
      {/* Drag handle: full-width title area */}
      <div className="drag-handle cursor-grab active:cursor-grabbing select-none">
        <h3 className="text-card-title text-text-secondary-light dark:text-text-secondary-dark mb-1">Balance</h3>
        <p className="text-metric-xl text-text-primary-light dark:text-text-primary-dark tabular-nums mb-4">$ 2,976.000</p>
      </div>
      <span className="text-meta text-text-muted-light dark:text-text-muted-dark">Total Balance</span>
    </div>
  );
}

function StatTilesPanel() {
  return (
    <div className="h-full grid grid-cols-2 gap-grid-gap drag-handle cursor-grab active:cursor-grabbing">
      <StatTile
        label="Income"
        value="$ 56,976.000"
        trend="+10%"
        ringColor="mint"
        ringPercent={72}
      />
      <StatTile
        label="Outcome"
        value="$ 54,000.000"
        trend="-5%"
        ringColor="peach"
        ringPercent={65}
      />
    </div>
  );
}

function TransactionsPanel() {
  return (
    <div className="h-full rounded-panel p-card-padding bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark surface-elevation">
      {/* Drag handle: full-width title */}
      <div className="drag-handle cursor-grab active:cursor-grabbing mb-4 select-none">
        <h3 className="text-card-title text-text-primary-light dark:text-text-primary-dark">Transactions</h3>
      </div>
      <div className="space-y-1">
        {transactions.map((tx) => (
          <div
            key={tx.name}
            className="flex items-center gap-3 py-dense-row-y px-dense-row-x -mx-dense-row-x rounded-inner-card hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2 flex items-center justify-center text-base shrink-0">
              {tx.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-body text-text-primary-light dark:text-text-primary-dark truncate">{tx.name}</p>
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">{tx.date}</p>
            </div>
            <span className="text-body tabular-nums text-text-primary-light dark:text-text-primary-dark group-hover:text-secondary-500 transition-colors">{tx.amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BalanceHistoryChart() {
  return (
    <div className="h-full rounded-panel p-card-padding bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark surface-elevation flex flex-col">
      {/* Drag handle: full-width title row */}
      <div className="drag-handle cursor-grab active:cursor-grabbing flex items-center justify-between mb-6 select-none">
        <h3 className="text-card-title text-text-primary-light dark:text-text-primary-dark">Balance History</h3>
        <button className="p-1.5 rounded-lg text-text-muted-light dark:text-text-muted-dark hover:text-secondary-500 transition-colors">
          <CalendarIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barGap={4} barCategoryGap="30%">
            <CartesianGrid
              strokeDasharray="4 4"
              vertical={false}
              className="stroke-grid-light dark:stroke-grid-dark"
            />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.40)' }}
              className="[&_text]:fill-text-muted-light dark:[&_text]:fill-text-muted-dark"
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.40)' }}
              tickFormatter={(v) => `${v / 1000}K`}
              className="[&_text]:fill-text-muted-light dark:[&_text]:fill-text-muted-dark"
            />
            <Bar dataKey="seriesA" radius={[999, 999, 999, 999]} maxBarSize={12}>
              {chartData.map((_, i) => (
                <Cell key={i} fill="#7BD6AA" />
              ))}
            </Bar>
            <Bar dataKey="seriesB" radius={[999, 999, 999, 999]} maxBarSize={12}>
              {chartData.map((_, i) => (
                <Cell key={i} fill="#F4AE90" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ConversionWidget() {
  return (
    <div className="h-full rounded-panel p-card-padding bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark surface-elevation">
      {/* Drag handle: full-width title */}
      <div className="drag-handle cursor-grab active:cursor-grabbing mb-4 select-none">
        <h3 className="text-card-title text-text-primary-light dark:text-text-primary-dark">Conversion</h3>
      </div>

      {/* Recipient card */}
      <div className="mb-4">
        <span className="text-meta text-text-muted-light dark:text-text-muted-dark block mb-1.5">Recepinet</span>
        <div className="flex items-center h-10 px-3 rounded-pill bg-surface-light-2 dark:bg-surface-dark-2 border border-stroke-light dark:border-stroke-dark">
          <span className="text-body tabular-nums text-text-primary-light dark:text-text-primary-dark flex-1">5673 9876 5645 3789</span>
          <span className="text-meta font-bold text-text-secondary-light dark:text-text-secondary-dark tracking-wider">VISA</span>
        </div>
      </div>

      {/* You send */}
      <div className="mb-3">
        <span className="text-meta text-text-muted-light dark:text-text-muted-dark block mb-1.5">You send</span>
        <div className="flex gap-2">
          <input
            type="text"
            defaultValue="1,000.00"
            className="flex-1 h-10 px-3 rounded-pill bg-surface-light-2 dark:bg-surface-dark-2 border border-stroke-light dark:border-stroke-dark text-body tabular-nums text-text-primary-light dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-secondary-400/30 transition-all"
          />
          <div className="flex items-center h-10 px-3 gap-1 rounded-pill bg-surface-light-2 dark:bg-surface-dark-2 border border-stroke-light dark:border-stroke-dark text-body text-text-primary-light dark:text-text-primary-dark cursor-pointer">
            <span>USD</span>
            <ChevronDownIcon className="w-3 h-3 text-text-muted-light dark:text-text-muted-dark" />
          </div>
        </div>
      </div>

      {/* Recipient gets */}
      <div className="mb-4">
        <span className="text-meta text-text-muted-light dark:text-text-muted-dark block mb-1.5">Recepient gets</span>
        <div className="flex gap-2">
          <input
            type="text"
            defaultValue="1,156.00"
            className="flex-1 h-10 px-3 rounded-pill bg-surface-light-2 dark:bg-surface-dark-2 border border-stroke-light dark:border-stroke-dark text-body tabular-nums text-text-primary-light dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-secondary-400/30 transition-all"
          />
          <div className="flex items-center h-10 px-3 gap-1 rounded-pill bg-surface-light-2 dark:bg-surface-dark-2 border border-stroke-light dark:border-stroke-dark text-body text-text-primary-light dark:text-text-primary-dark cursor-pointer">
            <span>CAD</span>
            <ChevronDownIcon className="w-3 h-3 text-text-muted-light dark:text-text-muted-dark" />
          </div>
        </div>
      </div>

      {/* Rate + CTA */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-meta text-text-muted-light dark:text-text-muted-dark block">Conversion Rate</span>
          <span className="text-body tabular-nums text-text-primary-light dark:text-text-primary-dark">$ 89.00</span>
        </div>
        <button className="h-10 px-8 rounded-pill bg-secondary-400 text-label font-semibold text-primary-900 hover:bg-secondary-300 active:bg-secondary-500 focus:outline-none focus:ring-2 focus:ring-secondary-300/40 transition-all shadow-lg shadow-secondary-400/20">
          Send
        </button>
      </div>
    </div>
  );
}

/* ================================================================
   HELPER COMPONENTS
   ================================================================ */

function NavIcon({
  icon: Icon,
  active = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  active?: boolean;
}) {
  return (
    <button
      className={`
        w-11 h-11 flex items-center justify-center rounded-inner-card transition-colors
        ${
          active
            ? 'bg-secondary-400/15 text-secondary-400'
            : 'text-text-muted-light dark:text-text-muted-dark hover:text-text-primary-light dark:hover:text-text-primary-dark hover:bg-surface-light-2 dark:hover:bg-surface-dark-2'
        }
      `}
    >
      <Icon className="w-[18px] h-[18px]" />
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-label text-text-muted-light dark:text-text-muted-dark">{label}</span>
      <span className="text-label tabular-nums text-text-primary-light dark:text-text-primary-dark">{value}</span>
    </div>
  );
}

function StatTile({
  label,
  value,
  trend,
  ringColor,
  ringPercent,
}: {
  label: string;
  value: string;
  trend: string;
  ringColor: 'mint' | 'peach';
  ringPercent: number;
}) {
  const colorMap = {
    mint: { stroke: '#7BD6AA', bg: 'rgba(123,214,170,0.22)' },
    peach: { stroke: '#F4AE90', bg: 'rgba(244,174,144,0.22)' },
  };
  const c = colorMap[ringColor];
  const circumference = 2 * Math.PI * 18;
  const offset = circumference - (ringPercent / 100) * circumference;

  return (
    <div className="h-full rounded-panel p-card-padding bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark surface-elevation">
      {/* The parent grid item is the drag handle for stats */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-meta text-text-muted-light dark:text-text-muted-dark mb-1">{label}</p>
          <p className="text-metric-l tabular-nums text-text-primary-light dark:text-text-primary-dark truncate">{value}</p>
          <span className={`text-meta ${trend.startsWith('+') ? 'text-mint' : 'text-peach-chart'}`}>{trend}</span>
        </div>
        {/* Ring progress */}
        <svg width="44" height="44" className="shrink-0 -mt-0.5">
          <circle cx="22" cy="22" r="18" fill="none" stroke={c.bg} strokeWidth="3" />
          <circle
            cx="22"
            cy="22"
            r="18"
            fill="none"
            stroke={c.stroke}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 22 22)"
          />
          <text
            x="22"
            y="22"
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-text-primary-light dark:fill-text-primary-dark"
            style={{ fontSize: 10, fontWeight: 600 }}
          >
            {ringPercent}%
          </text>
        </svg>
      </div>
    </div>
  );
}
