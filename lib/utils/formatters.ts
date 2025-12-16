export const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('en-US', { 
    style: 'currency', 
    currency: 'USD', 
    maximumFractionDigits: 0 
  });
};

export const formatNumber = (num: number): string => {
  return num.toLocaleString('en-US');
};
// Simple date formatter for updated_at/created_at fields
export const formatDateTime = (value?: string) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// State name to state code mapping
const STATE_CODE_MAP: Record<string, string> = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
  'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
  'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
  'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
  'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
  'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
  'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY',
  'district of columbia': 'DC'
};

/**
 * Converts location string to display state code instead of full state name
 * Handles formats like "City, State", "State", "City, TX", etc.
 */
export const formatLocationWithStateCode = (location?: string | null): string => {
  if (!location) return '';
  
  // If it's already a 2-letter code, return as is
  const trimmed = location.trim();
  if (/^[A-Z]{2}$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  
  // Try to extract state from "City, State" format
  const parts = trimmed.split(',').map(p => p.trim());
  if (parts.length >= 2) {
    const statePart = parts[parts.length - 1];
    
    // Check if it's already a code
    if (/^[A-Z]{2}$/i.test(statePart)) {
      return `${parts.slice(0, -1).join(', ')}, ${statePart.toUpperCase()}`;
    }
    
    // Convert state name to code
    const stateCode = STATE_CODE_MAP[statePart.toLowerCase()];
    if (stateCode) {
      return `${parts.slice(0, -1).join(', ')}, ${stateCode}`;
    }
  }
  
  // Check if the entire string is a state name
  const stateCode = STATE_CODE_MAP[trimmed.toLowerCase()];
  if (stateCode) {
    return stateCode;
  }
  
  // If no conversion found, return original but try to find state code in the string
  const words = trimmed.split(/\s+/);
  for (const word of words) {
    const code = STATE_CODE_MAP[word.toLowerCase()];
    if (code) {
      return trimmed.replace(new RegExp(word, 'gi'), code);
    }
  }
  
  return trimmed;
};