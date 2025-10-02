/**
 * Table configuration constants
 */

// Number of columns in the listings table grid
// This includes: select, score, vin, year, make, model, miles, price, dom, source, location, buyer_username, radius, buyMax, status, reasons, actions
export const LISTINGS_TABLE_GRID_COLS = 17;

// CSS class name for the grid (must match Tailwind config)
// Note: We use static class name 'grid-cols-17' instead of template literal
// because Tailwind CSS doesn't generate dynamic class names at runtime
// This class is safelisted in tailwind.config.js to prevent purging in production
export const LISTINGS_TABLE_GRID_CLASS = 'grid-cols-17';

// Alternative: CSS custom property approach (if safelist doesn't work)
// This ensures the grid is always available regardless of Tailwind purging
export const LISTINGS_TABLE_GRID_STYLE = {
  display: 'grid',
  gridTemplateColumns: `repeat(${LISTINGS_TABLE_GRID_COLS}, minmax(0, 1fr))`
} as const;

// Column configuration for the listings table
export const LISTINGS_TABLE_COLUMNS = [
  { key: 'select', label: '' },
  { key: 'score', label: 'Score' },
  { key: 'vin', label: 'VIN' },
  { key: 'year', label: 'Year' },
  { key: 'make', label: 'Make' },
  { key: 'model', label: 'Model' },
  { key: 'miles', label: 'Miles' },
  { key: 'price', label: 'Price' },
  { key: 'dom', label: 'DOM' },
  { key: 'source', label: 'Source' },
  { key: 'location', label: 'Location' },
  { key: 'buyer_username', label: 'Buyer' },
  { key: 'radius', label: 'Radius' },
  { key: 'buyMax', label: 'Buy-Max' },
  { key: 'decision_status', label: 'Status' },
  { key: 'decision_reasons', label: 'Reasons' },
  { key: 'actions', label: '' }
] as const;
