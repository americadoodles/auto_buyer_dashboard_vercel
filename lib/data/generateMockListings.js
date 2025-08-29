// generateMockListings.js
// Drop-in utility to create mock Listing data for UI/dev/testing.

// ---------------------------------------------------------------------------
// Tiny seeded PRNG (xorshift32) for reproducible data
function xorshift32(seed = 123456789) {
  let x = seed | 0;
  return () => {
    // xorshift
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    // map to [0,1)
    return ((x >>> 0) % 0xFFFFFFFF) / 0xFFFFFFFF;
  };
}

function seedFromString(s) {
  let h = 2166136261 >>> 0; // FNV-1a
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0 || 0x1;
}

// helpers
const randInt = (rand, min, max) =>
  Math.floor(rand() * (max - min + 1)) + min;

const pick = (rand, arr) =>
  arr[Math.floor(rand() * arr.length)];

// ---------------------------------------------------------------------------
// Vehicle catalog with rough base prices (for 2019, adjust by year/miles)
const CATALOG = [
  { make: 'Toyota', models: [
    { model: 'Camry',     trims: ['L', 'LE', 'SE', 'XSE'], basePrice: 22000 },
    { model: 'Corolla',   trims: ['L', 'LE', 'SE', 'XSE'], basePrice: 18000 },
    { model: 'RAV4',      trims: ['LE', 'XLE', 'Adventure', 'Limited'], basePrice: 24000 },
  ]},
  { make: 'Honda', models: [
    { model: 'Civic',     trims: ['LX', 'Sport', 'EX', 'Touring'], basePrice: 19000 },
    { model: 'Accord',    trims: ['LX', 'Sport', 'EX-L', 'Touring'], basePrice: 23000 },
  ]},
  { make: 'Ford', models: [
    { model: 'F-150',     trims: ['XL', 'XLT', 'Lariat'], basePrice: 28000 },
    { model: 'Mustang',   trims: ['EcoBoost', 'GT', 'Premium'], basePrice: 26000 },
    { model: 'Fusion',    trims: ['S', 'SE', 'Titanium'], basePrice: 17000 },
  ]},
  { make: 'Subaru', models: [
    { model: 'WRX',       trims: ['Base', 'Premium', 'Limited'], basePrice: 27000 },
    { model: 'Outback',   trims: ['Base', 'Premium', 'Limited'], basePrice: 24000 },
  ]},
  { make: 'BMW', models: [
    { model: '3 Series',  trims: ['320i', '330i', 'M340i'], basePrice: 32000 },
    { model: '4 Series',  trims: ['430i', '440i'], basePrice: 35000 },
  ]},
  { make: 'Tesla', models: [
    { model: 'Model 3',   trims: ['RWD', 'Long Range', 'Performance'], basePrice: 30000 },
    { model: 'Model Y',   trims: ['Long Range', 'Performance'], basePrice: 36000 },
  ]},
  { make: 'Jeep', models: [
    { model: 'Grand Cherokee', trims: ['Laredo', 'Limited', 'Overland'], basePrice: 32000 },
  ]},
];

const SOURCES = [
  'AutoTrader',
  'Cars.com',
  'CarGurus',
  'Facebook Marketplace',
  'Bring a Trailer',
  'Dealer Site',
];

const LOCATIONS = [
  'New York, NY',
  'Los Angeles, CA',
  'Chicago, IL',
  'Houston, TX',
  'Phoenix, AZ',
  'Philadelphia, PA',
  'San Antonio, TX',
  'San Diego, CA',
  'Dallas, TX',
  'San Jose, CA',
  'Austin, TX',
  'Jacksonville, FL',
  'Fort Worth, TX',
  'Columbus, OH',
  'Charlotte, NC',
  'San Francisco, CA',
  'Indianapolis, IN',
  'Seattle, WA',
  'Denver, CO',
  'Washington, DC',
];

const BUYERS = [
  'John Smith',
  'Sarah Johnson',
  'Michael Brown',
  'Emily Davis',
  'David Wilson',
  'Lisa Anderson',
  'Robert Taylor',
  'Jennifer Martinez',
  'William Garcia',
  'Amanda Rodriguez',
  'James Lopez',
  'Michelle White',
  'Christopher Lee',
  'Jessica Hall',
  'Daniel Allen',
  'Ashley Young',
  'Matthew King',
  'Nicole Wright',
  'Joshua Green',
  'Stephanie Baker',
];

const REASON_CODES = [
  'PriceVsBaseline',
  'LowDOM',
  'LowMiles',
  'HighDemand',
  'OneOwner',
  'DealerCertified',
];

// ---------------------------------------------------------------------------
// Generate a single listing
function generateListing(rand, id, source) {
  const vehicle = pick(rand, CATALOG);
  const model = pick(rand, vehicle.models);
  const trim = pick(rand, model.trims);
  const year = randInt(rand, 2015, 2023);
  const miles = randInt(rand, 5000, 120000);
  
  // Price calculation: base price + year adjustment + miles adjustment + random variation
  const yearAdjustment = (year - 2019) * 500; // newer = more expensive
  const milesAdjustment = (miles - 50000) * -0.1; // more miles = cheaper
  const randomVariation = (rand() - 0.5) * 2000; // ±$1000
  const basePrice = model.basePrice + yearAdjustment + milesAdjustment + randomVariation;
  
  // Score: 0-100, based on price, miles, year, and random factors
  const priceScore = Math.max(0, 100 - (basePrice - model.basePrice) / 100);
  const milesScore = Math.max(0, 100 - miles / 1000);
  const yearScore = Math.max(0, 100 - (2023 - year) * 5);
  const randomScore = rand() * 20;
  const score = Math.min(100, Math.max(0, (priceScore + milesScore + yearScore + randomScore) / 4));
  
  // DOM (Days on Market): 1-90, lower is better
  const dom = randInt(rand, 1, 90);
  
  // Reason codes: 1-3 random codes
  const numReasons = randInt(rand, 1, 3);
  const selectedReasons = [];
  const shuffledReasons = [...REASON_CODES].sort(() => rand() - 0.5);
  for (let i = 0; i < numReasons && i < shuffledReasons.length; i++) {
    selectedReasons.push(shuffledReasons[i]);
  }
  
  // VIN: 17 characters, alphanumeric
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let vin = '';
  for (let i = 0; i < 17; i++) {
    vin += chars.charAt(Math.floor(rand() * chars.length));
  }
  
  // Vehicle key: make-model-trim-year
  const vehicleKey = `${vehicle.make.toLowerCase()}-${model.model.toLowerCase()}-${trim.toLowerCase()}-${year}`;
  
  // Buy max: 80-95% of price
  const buyMax = basePrice * (0.8 + rand() * 0.15);
  
  // Radius: 25-200 miles
  const radius = randInt(rand, 25, 200);
  
  // Location and buyer
  const location = pick(rand, LOCATIONS);
  const buyer = pick(rand, BUYERS);
  
  return {
    id,
    vehicle_key: vehicleKey,
    vin,
    year,
    make: vehicle.make,
    model: model.model,
    trim,
    miles,
    price: Math.round(basePrice),
    score: Math.round(score * 10) / 10,
    dom,
    source,
    radius,
    reasonCodes: selectedReasons,
    buyMax: Math.round(buyMax),
    location,
    buyer,
  };
}

// ---------------------------------------------------------------------------
// Generate multiple listings
function generateListings(count, seed = 'default-seed') {
  const rand = xorshift32(seedFromString(seed));
  const listings = [];
  
  for (let i = 0; i < count; i++) {
    const source = pick(rand, SOURCES);
    const listing = generateListing(rand, `listing-${i + 1}`, source);
    listings.push(listing);
  }
  
  return listings;
}

// Export for CommonJS
module.exports = { generateListings };
