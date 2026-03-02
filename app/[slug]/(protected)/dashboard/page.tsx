'use client';

import { useState, useCallback, useMemo } from 'react';
import { ResponsiveGridLayout, useContainerWidth, noCompactor } from 'react-grid-layout';
import type { Layout, ResponsiveLayouts } from 'react-grid-layout';
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

function generateDefaultLayouts(cards: DashboardCardId[]): ResponsiveLayouts<GridBreakpoint> {
  // Build lg layout: 2-column grid, track cumulative row heights
  const lg: Layout[] = [];
  let lgY = 0;
  for (let i = 0; i < cards.length; i += 2) {
    const left = CARD_REGISTRY[cards[i]];
    const right = i + 1 < cards.length ? CARD_REGISTRY[cards[i + 1]] : null;
    const rowH = right ? Math.max(left.defaultH, right.defaultH) : left.defaultH;

    lg.push({
      i: cards[i],
      x: 0,
      y: lgY,
      w: left.defaultW,
      h: left.defaultH,
      minW: left.minW,
      minH: left.minH,
    });

    if (right) {
      lg.push({
        i: cards[i + 1],
        x: 6,
        y: lgY,
        w: right.defaultW,
        h: right.defaultH,
        minW: right.minW,
        minH: right.minH,
      });
    }

    lgY += rowH;
  }

  // Build sm layout: single column, stack vertically
  const sm: Layout[] = [];
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

  const layouts = useMemo(() => {
    if (loaded && prefs.dashboard_layout && Object.keys(prefs.dashboard_layout).length > 0) {
      const saved = prefs.dashboard_layout as ResponsiveLayouts<GridBreakpoint>;

      // Sanitize saved layouts: enforce min dimensions and append missing cards
      const patched = { ...saved };
      for (const bp of Object.keys(patched) as GridBreakpoint[]) {
        let items = patched[bp] ?? [];

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
  }, [loaded, prefs.dashboard_layout, visibleCards]);

  const handleLayoutChange = useCallback(
    (_currentLayout: Layout, allLayouts: ResponsiveLayouts<GridBreakpoint>) => {
      setDashboardLayout(allLayouts);
    },
    [setDashboardLayout],
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
          compactor={noCompactor}
          dragConfig={{ enabled: isDraggable, handle: '.drag-handle' }}
          resizeConfig={{ enabled: false }}
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
