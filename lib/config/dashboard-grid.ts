/**
 * Dashboard grid configuration for react-grid-layout.
 *
 * Spacing rules:
 * - Horizontal gaps between cards: YES (16px)
 * - Vertical gaps between cards: NO (0px)
 *
 * The margin prop takes [horizontal, vertical].
 */

export const GRID_MARGIN: [number, number] = [16, 0];
export const GRID_CONTAINER_PADDING: [number, number] = [16, 16];

export const GRID_BREAKPOINTS = {
  lg: 1200,
  md: 996,
  sm: 768,
  xs: 480,
  xxs: 0,
};

export const GRID_COLS = {
  lg: 12,
  md: 10,
  sm: 6,
  xs: 4,
  xxs: 2,
};

export const GRID_ROW_HEIGHT = 80;
