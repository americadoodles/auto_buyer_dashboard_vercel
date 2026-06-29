/**
 * Table configuration constants
 */

// Number of columns in the listings table grid
// This includes: select(1), score(1), source(1), vin(1), lpn(1), price(1), year(1), make(1), model(1), miles(1), notify(1), slack(1), workflow(1), updated_at(1) = 14 total
export const LISTINGS_TABLE_GRID_COLS = 14;

// CSS class name for the grid (must match Tailwind config)
// Note: We use static class name 'grid-cols-14' instead of template literal
// because Tailwind CSS doesn't generate dynamic class names at runtime
// This class is safelisted in tailwind.config.js to prevent purging in production
export const LISTINGS_TABLE_GRID_CLASS = 'grid-cols-14';

// Alternative: CSS custom property approach (if safelist doesn't work)
// This ensures the grid is always available regardless of Tailwind purging
export const LISTINGS_TABLE_GRID_STYLE = {
  display: 'grid',
  gridTemplateColumns: `repeat(${LISTINGS_TABLE_GRID_COLS}, minmax(0, 1fr))`,
  gridAutoFlow: 'row',
  gridTemplateRows: '1fr',
  gridAutoRows: 'auto'
} as const;

// Optimized column configuration with responsive sizing
export const LISTINGS_TABLE_COLUMNS = [
  { key: 'select', label: '', colSpan: 1, priority: 'high' },
  { key: 'score', label: 'Score', colSpan: 1, priority: 'high' },
  { key: 'vin', label: 'VIN', colSpan: 1, priority: 'high' },
  { key: 'lpn', label: 'LPN', colSpan: 1, priority: 'high' },
  { key: 'price', label: 'Price', colSpan: 1, priority: 'high' },
  { key: 'year', label: 'Year', colSpan: 1, priority: 'high' },
  { key: 'make', label: 'Make', colSpan: 1, priority: 'high' },
  { key: 'model', label: 'Model', colSpan: 1, priority: 'high' },
  { key: 'miles', label: 'Miles', colSpan: 1, priority: 'high' },
  { key: 'source', label: 'Source', colSpan: 1, priority: 'high' },
  { key: 'notify', label: 'Notify', colSpan: 1, priority: 'high' },
  { key: 'slack', label: 'Slack', colSpan: 1, priority: 'high' },
  { key: 'workflow', label: 'Workflow', colSpan: 1, priority: 'high' },
  { key: 'updated_at', label: 'Updated', colSpan: 1, priority: 'high' },
] as const;

// Responsive breakpoints for table columns
export const RESPONSIVE_BREAKPOINTS = {
  mobile: {
    visibleColumns: ['score', 'vin', 'lpn', 'price', 'year', 'make', 'model', 'miles', 'source', 'notify', 'slack', 'workflow', 'updated_at'],
    hiddenColumns: []
  },
  tablet: {
    visibleColumns: ['score', 'vin', 'lpn', 'price', 'year', 'make', 'model', 'miles', 'source', 'notify', 'slack', 'workflow', 'updated_at'],
    hiddenColumns: []
  },
  desktop: {
    visibleColumns: 'all',
    hiddenColumns: []
  }
} as const;
