// Marketplace source utilities for icons and links

export interface MarketplaceInfo {
  name: string;
  icon: string; // Icon name or emoji
  color: string;
  domain: string;
}

// Common marketplace domains and their display info
const MARKETPLACE_MAP: Record<string, MarketplaceInfo> = {
  'facebook.com': { name: 'Facebook Marketplace', icon: '📘', color: 'text-blue-600', domain: 'facebook.com' },
  'marketplace.facebook.com': { name: 'Facebook Marketplace', icon: '📘', color: 'text-blue-600', domain: 'facebook.com' },
  'craigslist.org': { name: 'Craigslist', icon: '📋', color: 'text-purple-600', domain: 'craigslist.org' },
  'offerup.com': { name: 'OfferUp', icon: '🛒', color: 'text-green-600', domain: 'offerup.com' },
  'letgo.com': { name: 'Letgo', icon: '🛍️', color: 'text-orange-600', domain: 'letgo.com' },
  'autotrader.com': { name: 'AutoTrader', icon: '🚗', color: 'text-red-600', domain: 'autotrader.com' },
  'cars.com': { name: 'Cars.com', icon: '🚙', color: 'text-blue-500', domain: 'cars.com' },
  'cargurus.com': { name: 'CarGurus', icon: '🚘', color: 'text-green-500', domain: 'cargurus.com' },
  'carsforsale.com': { name: 'CarsForSale', icon: '🚗', color: 'text-indigo-600', domain: 'carsforsale.com' },
  'ebay.com': { name: 'eBay Motors', icon: '🏷️', color: 'text-blue-400', domain: 'ebay.com' },
  'ebaymotors.com': { name: 'eBay Motors', icon: '🏷️', color: 'text-blue-400', domain: 'ebay.com' },
};

/**
 * Parse a source URL and return marketplace information
 */
export function getMarketplaceInfo(source?: string): MarketplaceInfo | null {
  if (!source) return null;
  
  try {
    const url = new URL(source);
    const hostname = url.hostname.replace(/^www\./, '').toLowerCase();
    
    // Check for exact match first
    if (MARKETPLACE_MAP[hostname]) {
      return { ...MARKETPLACE_MAP[hostname], domain: hostname };
    }
    
    // Check for partial match (e.g., subdomain matching)
    for (const [domain, info] of Object.entries(MARKETPLACE_MAP)) {
      if (hostname.includes(domain) || domain.includes(hostname)) {
        return { ...info, domain: hostname };
      }
    }
    
    // Default fallback
    return {
      name: hostname,
      icon: '🔗',
      color: 'text-gray-600',
      domain: hostname,
    };
  } catch {
    // If URL parsing fails, try to match by string
    const lowerSource = source.toLowerCase();
    for (const [domain, info] of Object.entries(MARKETPLACE_MAP)) {
      if (lowerSource.includes(domain)) {
        return { ...info, domain };
      }
    }
    
    return {
      name: source,
      icon: '🔗',
      color: 'text-gray-600',
      domain: source,
    };
  }
}

/**
 * Get trust/fraud indicators for a listing
 */
export interface TrustIndicators {
  isTrusted: boolean;
  indicators: Array<{ type: 'trust' | 'warning' | 'fraud'; label: string; icon: string }>;
}

export function getTrustIndicators(listing: {
  cleanTitle?: boolean;
  score?: number;
  decision?: { status?: string };
  sellerName?: string | null;
  sellerJoinedDate?: string | null;
  paidStatus?: string | null;
}): TrustIndicators {
  const indicators: Array<{ type: 'trust' | 'warning' | 'fraud'; label: string; icon: string }> = [];
  let isTrusted = true;

  // Clean title indicator
  if (listing.cleanTitle === true) {
    indicators.push({ type: 'trust', label: 'Clean Title', icon: '✅' });
  } else if (listing.cleanTitle === false) {
    indicators.push({ type: 'warning', label: 'Title Issue', icon: '⚠️' });
    isTrusted = false;
  }

  // Score-based indicators
  if (listing.score !== undefined) {
    if (listing.score >= 80) {
      indicators.push({ type: 'trust', label: 'High Score', icon: '⭐' });
    } else if (listing.score < 50) {
      indicators.push({ type: 'warning', label: 'Low Score', icon: '⚠️' });
      isTrusted = false;
    }
  }

  // Decision status
  if (listing.decision?.status === 'approved') {
    indicators.push({ type: 'trust', label: 'Approved', icon: '✓' });
  } else if (listing.decision?.status === 'rejected') {
    indicators.push({ type: 'fraud', label: 'Rejected', icon: '✗' });
    isTrusted = false;
  }

  // Seller verification (if seller joined date exists, it's somewhat verified)
  if (listing.sellerJoinedDate) {
    const joinDate = new Date(listing.sellerJoinedDate);
    const yearsSinceJoin = (Date.now() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
    if (yearsSinceJoin >= 1) {
      indicators.push({ type: 'trust', label: 'Established Seller', icon: '👤' });
    }
  }

  // Paid status
  if (listing.paidStatus === 'verified' || listing.paidStatus === 'paid') {
    indicators.push({ type: 'trust', label: 'Verified Payment', icon: '💳' });
  }

  return { isTrusted, indicators };
}

