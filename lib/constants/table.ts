/**
 * Table configuration constants
 */

// Number of columns in the listings table grid
// This includes: select, score, vin, year, make, model, miles, price, dom, source, location, buyer_username, radius, buyMax, status, reasons, notify, slack, workflow, edit, contacts
export const LISTINGS_TABLE_GRID_COLS = 22;

// CSS class name for the grid (must match Tailwind config)
// Note: We use static class name 'grid-cols-22' instead of template literal
// because Tailwind CSS doesn't generate dynamic class names at runtime
// This class is safelisted in tailwind.config.js to prevent purging in production
export const LISTINGS_TABLE_GRID_CLASS = 'grid-cols-22';

// Alternative: CSS custom property approach (if safelist doesn't work)
// This ensures the grid is always available regardless of Tailwind purging
export const LISTINGS_TABLE_GRID_STYLE = {
  display: 'grid',
  gridTemplateColumns: `repeat(${LISTINGS_TABLE_GRID_COLS}, minmax(0, 1fr))`
} as const;

// Optimized column configuration with responsive sizing
export const LISTINGS_TABLE_COLUMNS = [
  { key: 'select', label: '', colSpan: 1, priority: 'high' },
  { key: 'score', label: 'Score', colSpan: 1, priority: 'high' },
  { key: 'vin', label: 'VIN', colSpan: 2, priority: 'high' }, // Wider for VIN numbers
  { key: 'year', label: 'Year', colSpan: 1, priority: 'medium' },
  { key: 'make', label: 'Make', colSpan: 1, priority: 'medium' },
  { key: 'model', label: 'Model', colSpan: 2, priority: 'high' }, // Wider for model names
  { key: 'miles', label: 'Miles', colSpan: 1, priority: 'medium' },
  { key: 'price', label: 'Price', colSpan: 1, priority: 'high' },
  { key: 'dom', label: 'DOM', colSpan: 1, priority: 'medium' },
  { key: 'source', label: 'Source', colSpan: 1, priority: 'low' },
  { key: 'location', label: 'Location', colSpan: 2, priority: 'medium' }, // Wider for locations
  { key: 'buyer_username', label: 'Buyer', colSpan: 1, priority: 'medium' },
  { key: 'radius', label: 'Radius', colSpan: 1, priority: 'low' },
  { key: 'buyMax', label: 'Buy-Max', colSpan: 1, priority: 'high' },
  { key: 'decision_status', label: 'Status', colSpan: 1, priority: 'high' },
  { key: 'decision_reasons', label: 'Reasons', colSpan: 3, priority: 'medium' }, // Wider for multiple badges and long text
  { key: 'notify', label: 'Notify', colSpan: 1, priority: 'high' },
  { key: 'slack', label: 'Slack', colSpan: 1, priority: 'high' },
  { key: 'workflow', label: 'Workflow', colSpan: 1, priority: 'high' },
  { key: 'edit', label: 'Edit', colSpan: 1, priority: 'high' },
  { key: 'contacts', label: 'Contacts', colSpan: 2, priority: 'medium' } // Wider for contact information
] as const;

// Responsive breakpoints for table columns
export const RESPONSIVE_BREAKPOINTS = {
  mobile: {
    visibleColumns: ['select', 'score', 'vin', 'year', 'make', 'model', 'price', 'status', 'notify', 'slack', 'workflow', 'edit'],
    hiddenColumns: ['miles', 'dom', 'source', 'location', 'buyer_username', 'radius', 'buyMax', 'decision_reasons', 'contacts']
  },
  tablet: {
    visibleColumns: ['select', 'score', 'vin', 'year', 'make', 'model', 'miles', 'price', 'dom', 'location', 'status', 'notify', 'slack', 'workflow', 'edit'],
    hiddenColumns: ['source', 'buyer_username', 'radius', 'buyMax', 'decision_reasons', 'contacts']
  },
  desktop: {
    visibleColumns: 'all',
    hiddenColumns: []
  }
} as const;
