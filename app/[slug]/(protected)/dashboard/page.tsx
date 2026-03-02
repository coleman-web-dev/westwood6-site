'use client';

import { useCallback, useMemo } from 'react';
import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout';
import type { Layout, ResponsiveLayouts } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import { useCommunity } from '@/lib/providers/community-provider';
import { useUserPreferences } from '@/lib/hooks/use-user-preferences';
import { CARD_COMPONENTS } from '@/components/dashboard/cards';
import { CARD_REGISTRY } from '@/lib/config/dashboard-cards';
import {
  GRID_MARGIN,
  GRID_CONTAINER_PADDING,
  GRID_BREAKPOINTS,
  GRID_COLS,
  GRID_ROW_HEIGHT,
} from '@/lib/config/dashboard-grid';
import type { DashboardCardId } from '@/lib/types/dashboard';

type GridBreakpoint = keyof typeof GRID_BREAKPOINTS;

function generateDefaultLayouts(cards: DashboardCardId[]): ResponsiveLayouts<GridBreakpoint> {
  const lg = cards.map((cardId, index) => {
    const config = CARD_REGISTRY[cardId];
    return {
      i: cardId,
      x: (index % 2) * 6,
      y: Math.floor(index / 2) * config.defaultH,
      w: config.defaultW,
      h: config.defaultH,
      minW: config.minW,
      minH: config.minH,
    };
  });

  const sm = cards.map((cardId, index) => {
    const config = CARD_REGISTRY[cardId];
    return {
      i: cardId,
      x: 0,
      y: index * config.defaultH,
      w: 6,
      h: config.defaultH,
      minW: config.minW,
      minH: config.minH,
    };
  });

  return { lg, md: lg, sm, xs: sm, xxs: sm };
}

export default function DashboardPage() {
  const { visibleCards, member } = useCommunity();
  const { prefs, loaded, setDashboardLayout } = useUserPreferences();
  const { width, containerRef, mounted } = useContainerWidth();

  const layouts = useMemo(() => {
    if (loaded && prefs.dashboard_layout && Object.keys(prefs.dashboard_layout).length > 0) {
      return prefs.dashboard_layout as ResponsiveLayouts<GridBreakpoint>;
    }
    return generateDefaultLayouts(visibleCards);
  }, [loaded, prefs.dashboard_layout, visibleCards]);

  const handleLayoutChange = useCallback(
    (_currentLayout: Layout, allLayouts: ResponsiveLayouts<GridBreakpoint>) => {
      setDashboardLayout(allLayouts);
    },
    [setDashboardLayout],
  );

  return (
    <div ref={containerRef}>
      <h1 className="text-page-title mb-6">
        Welcome back, {member?.first_name}
      </h1>

      {mounted && (
        <ResponsiveGridLayout
          width={width}
          layouts={layouts}
          breakpoints={GRID_BREAKPOINTS}
          cols={GRID_COLS}
          rowHeight={GRID_ROW_HEIGHT}
          margin={GRID_MARGIN}
          containerPadding={GRID_CONTAINER_PADDING}
          onLayoutChange={handleLayoutChange}
          dragConfig={{ enabled: true, handle: '.cursor-grab' }}
          resizeConfig={{ enabled: true }}
        >
          {visibleCards.map((cardId) => {
            const CardComponent = CARD_COMPONENTS[cardId];
            if (!CardComponent) return null;
            return (
              <div key={cardId}>
                <CardComponent />
              </div>
            );
          })}
        </ResponsiveGridLayout>
      )}
    </div>
  );
}
