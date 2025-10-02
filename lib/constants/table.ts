/**
 * Table configuration constants
 */

// Number of columns in the listings table grid
// This includes: select, score, vin, year, make, model, miles, price, dom, source, location, buyer_username, radius, buyMax, status, reasons, actions
export const LISTINGS_TABLE_GRID_COLS = 17;

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
