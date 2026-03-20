'use client';

import { useState, useCallback, useMemo } from 'react';
import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout';
import type { Layout, LayoutItem, ResponsiveLayouts } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';

import { useCommunity } from '@/lib/providers/community-provider';
import { useUserPreferences } from '@/lib/hooks/use-user-preferences';
import { CARD_COMPONENTS } from '@/components/dashboard/cards';
import { CARD_REGISTRY } from '@/lib/config/dashboard-cards';
import {
  GRID_MARGIN,
  GRID_MARGIN_SM,
  GRID_CONTAINER_PADDING,
  GRID_BREAKPOINTS,
  GRID_COLS,
  GRID_ROW_HEIGHT,
} from '@/lib/config/dashboard-grid';
import type { DashboardCardId } from '@/lib/types/dashboard';

type GridBreakpoint = keyof typeof GRID_BREAKPOINTS;

/**
 * Simple vertical compaction: move each item up as far as possible
 * without overlapping other items. Sorts by y then x, then greedily
 * places each item at the lowest available y.
 */
function compactVertically(items: readonly LayoutItem[]): LayoutItem[] {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const placed: LayoutItem[] = [];

  for (const item of sorted) {
    // Start at y=0, jump past any colliders until we find a free slot
    let y = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const collider = placed.find(
        (p) =>
          p.x < item.x + item.w &&
          p.x + p.w > item.x &&
          p.y < y + item.h &&
          p.y + p.h > y,
      );
      if (!collider) break;
      y = collider.y + collider.h; // jump past this collider
    }
    placed.push({ ...item, y });
  }

  return placed;
}

/**
 * Curated default layout for the personal/member dashboard.
 * Cards not in this map fall back to auto-placement at the bottom.
 * x/y/w/h are in grid units (12 cols, rowHeight=30, margin=18).
 */
const CURATED_LAYOUT: Record<string, { x: number; y: number; w: number; h: number }> = {
  // Row 1: Announcements (left, wide) + Balance (right, shorter)
  announcements:      { x: 0, y: 0,  w: 6, h: 7 },
  balance:            { x: 6, y: 0,  w: 6, h: 5 },
  // Row 2: Amenity Calendar (left, tall) + Payments (right top) + Events (right bottom)
  'amenity-calendar': { x: 0, y: 7,  w: 6, h: 10 },
  payments:           { x: 6, y: 7,  w: 6, h: 5 },
  events:             { x: 6, y: 12, w: 6, h: 5 },
  // Row 3: Household + Voting + Maintenance (3 across)
  household:          { x: 0, y: 17, w: 4, h: 5 },
  voting:             { x: 4, y: 17, w: 4, h: 5 },
  maintenance:        { x: 8, y: 17, w: 4, h: 5 },
  // Row 4: Bulletin Board + Documents
  'bulletin-board':   { x: 0, y: 22, w: 6, h: 7 },
  documents:          { x: 6, y: 22, w: 6, h: 7 },
};

function generateDefaultLayouts(cards: DashboardCardId[]): ResponsiveLayouts<GridBreakpoint> {
  // Build lg layout using curated positions where available
  const lg: LayoutItem[] = [];
  const placed = new Set<string>();

  for (const cardId of cards) {
    const config = CARD_REGISTRY[cardId];
    const pos = CURATED_LAYOUT[cardId];
    if (pos) {
      lg.push({
        i: cardId,
        x: pos.x,
        y: pos.y,
        w: pos.w,
        h: pos.h,
        minW: config.minW,
        minH: config.minH,
      });
      placed.add(cardId);
    }
  }

  // Auto-place any cards not in the curated layout at the bottom
  const maxY = lg.reduce((max, l) => Math.max(max, l.y + l.h), 0);
  let nextY = maxY;
  let nextX = 0;
  for (const cardId of cards) {
    if (placed.has(cardId)) continue;
    const config = CARD_REGISTRY[cardId];
    lg.push({
      i: cardId,
      x: nextX,
      y: nextY,
      w: config.defaultW,
      h: config.defaultH,
      minW: config.minW,
      minH: config.minH,
    });
    nextX += config.defaultW;
    if (nextX >= 12) {
      nextX = 0;
      nextY += config.defaultH;
    }
  }

  // Build sm layout: single column, stack vertically
  const sm: LayoutItem[] = [];
  let smY = 0;
  for (const cardId of cards) {
    const config = CARD_REGISTRY[cardId];
    sm.push({
      i: cardId,
      x: 0,
      y: smY,
      w: 12,
      h: config.defaultH,
      minW: config.minW,
      minH: config.minH,
    });
    smY += config.defaultH;
  }

  return { lg, md: lg, sm };
}

export default function DashboardPage() {
  const { visibleCards } = useCommunity();
  const { prefs, loaded, setDashboardLayout } = useUserPreferences();
  const { width, containerRef, mounted } = useContainerWidth();
  const [currentBreakpoint, setCurrentBreakpoint] = useState('lg');

  const visibleSet = useMemo(() => new Set<string>(visibleCards), [visibleCards]);

  const layouts = useMemo(() => {
    if (loaded && prefs.dashboard_layout && Object.keys(prefs.dashboard_layout).length > 0) {
      const saved = prefs.dashboard_layout as ResponsiveLayouts<GridBreakpoint>;

      // Sanitize saved layouts: enforce min dimensions and append missing cards
      const patched = { ...saved };
      for (const bp of Object.keys(patched) as GridBreakpoint[]) {
        let items = patched[bp] ?? [];

        // Filter out cards that aren't currently visible (e.g. board-only cards in personal view)
        // then compact vertically so remaining cards fill any gaps left behind.
        items = items.filter((l) => visibleSet.has(l.i));
        items = compactVertically(items);

        // Enforce minW/minH on every saved entry (fixes corrupted saves)
        items = items.map((l) => {
          const config = CARD_REGISTRY[l.i as DashboardCardId];
          if (!config) return l;
          const minW = bp === 'sm' ? 12 : config.minW;
          return {
            ...l,
            w: Math.max(l.w, minW),
            h: Math.max(l.h, config.minH),
            minW: config.minW,
            minH: config.minH,
          };
        });

        // Append any new cards not in the saved layout
        const existingIds = new Set(items.map((l) => l.i));
        const missing = visibleCards.filter((id) => !existingIds.has(id));

        if (missing.length > 0) {
          const maxY = items.reduce((max, l) => Math.max(max, l.y + l.h), 0);
          let nextY = maxY;
          const appended = missing.map((cardId) => {
            const config = CARD_REGISTRY[cardId];
            const item = {
              i: cardId,
              x: 0,
              y: nextY,
              w: bp === 'sm' ? 12 : config.defaultW,
              h: config.defaultH,
              minW: config.minW,
              minH: config.minH,
            };
            nextY += config.defaultH;
            return item;
          });
          items = [...items, ...appended];
        }

        patched[bp] = items;
      }

      return patched;
    }
    return generateDefaultLayouts(visibleCards);
  }, [loaded, prefs.dashboard_layout, visibleCards, visibleSet]);

  const handleLayoutChange = useCallback(
    (_currentLayout: Layout, allLayouts: ResponsiveLayouts<GridBreakpoint>) => {
      // Merge with saved layouts so hidden cards (e.g. board-only cards in personal view)
      // don't lose their positions when the visible subset triggers a save.
      const saved = (prefs.dashboard_layout ?? {}) as ResponsiveLayouts<GridBreakpoint>;
      const merged = { ...allLayouts };
      for (const bp of Object.keys(saved) as GridBreakpoint[]) {
        const incoming = merged[bp] ?? [];
        const incomingIds = new Set(incoming.map((l) => l.i));
        const hidden = (saved[bp] ?? []).filter((l) => !incomingIds.has(l.i));
        if (hidden.length > 0) {
          merged[bp] = [...incoming, ...hidden];
        }
      }
      setDashboardLayout(merged);
    },
    [setDashboardLayout, prefs.dashboard_layout],
  );

  const handleBreakpointChange = useCallback((newBreakpoint: string) => {
    setCurrentBreakpoint(newBreakpoint);
  }, []);

  const isDraggable = currentBreakpoint !== 'sm';

  return (
    <div ref={containerRef}>
      {mounted && width > 0 && (
        <ResponsiveGridLayout
          width={width}
          layouts={layouts}
          breakpoints={GRID_BREAKPOINTS}
          cols={GRID_COLS}
          rowHeight={GRID_ROW_HEIGHT}
          margin={currentBreakpoint === 'sm' ? GRID_MARGIN_SM : GRID_MARGIN}
          containerPadding={GRID_CONTAINER_PADDING}
          onLayoutChange={handleLayoutChange}
          onBreakpointChange={handleBreakpointChange}
          dragConfig={{ enabled: isDraggable, handle: '.drag-handle' }}
          resizeConfig={{ enabled: isDraggable }}
        >
          {visibleCards.map((cardId) => {
            const CardComponent = CARD_COMPONENTS[cardId];
            if (!CardComponent) return null;
            return (
              <div key={cardId} className="h-full">
                <CardComponent />
              </div>
            );
          })}
        </ResponsiveGridLayout>
      )}
    </div>
  );
}
