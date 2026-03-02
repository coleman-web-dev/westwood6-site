'use client';

import { useState, useCallback, useMemo } from 'react';
import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout';
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
      w: 12,
      h: config.defaultH,
      minW: config.minW,
      minH: config.minH,
    };
  });

  return { lg, md: lg, sm };
}

export default function DashboardPage() {
  const { visibleCards } = useCommunity();
  const { prefs, loaded, setDashboardLayout } = useUserPreferences();
  const { width, containerRef, mounted } = useContainerWidth();
  const [currentBreakpoint, setCurrentBreakpoint] = useState('lg');

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
          resizeConfig={{ enabled: false }}
        >
          {visibleCards.map((cardId) => {
            const CardComponent = CARD_COMPONENTS[cardId];
            if (!CardComponent) return null;
            return (
              <div key={cardId} className="h-full overflow-hidden">
                <CardComponent />
              </div>
            );
          })}
        </ResponsiveGridLayout>
      )}
    </div>
  );
}
