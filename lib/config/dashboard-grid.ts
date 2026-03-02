/**
 * Dashboard grid configuration for react-grid-layout.
 *
 * Matches the original codebase design:
 * - rowHeight=30 with 18px margin
 * - Formula: pixelHeight = h * 30 + (h - 1) * 18
 *   h=5 → 222px, h=6 → 270px, h=7 → 318px, h=8 → 366px
 */

export const GRID_CONTAINER_PADDING: [number, number] = [0, 0];

export const GRID_BREAKPOINTS = {
  lg: 1200,
  md: 768,
  sm: 0,
};

export const GRID_COLS = {
  lg: 12,
  md: 12,
  sm: 12,
};

export const GRID_ROW_HEIGHT = 30;

/** Default margin for lg/md breakpoints */
export const GRID_MARGIN: [number, number] = [18, 18];

/** Smaller margin for sm breakpoint */
export const GRID_MARGIN_SM: [number, number] = [12, 12];
