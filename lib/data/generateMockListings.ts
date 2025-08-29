// generateMockListings.ts
// Drop-in utility to create mock Listing data for UI/dev/testing.

export interface Listing {
    id: string;
    vehicle_key: string;
    vin: string;
    year: number;
    make: string;
    model: string;
    trim: string;
    miles: number;
    price: number;
    score: number;
    dom: number;
    source: string; // can be a host name or URL; your UI handles both
    radius: number;
    reasonCodes: string[];
    buyMax: number;
  }
  
  // ---------------------------------------------------------------------------
  // Tiny seeded PRNG (xorshift32) for reproducible data
  function xorshift32(seed = 123456789): () => number {
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
  function seedFromString(s: string): number {
    let h = 2166136261 >>> 0; // FNV-1a
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0 || 0x1;
  }
  // helpers
  const randInt = (rand: () => number, min: number, max: number) =>
    Math.floor(rand() * (max - min + 1)) + min;
  const pick = <T,>(rand: () => number, arr: Readonly<T[]>): T =>
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
  ] as const;
  
  const SOURCES = [
    'AutoTrader',
    'Cars.com',
    'CarGurus',
    'Facebook Marketplace',
    'Bring a Trailer',
    'Dealer Site',
  ] as const;
  
  const REASON_CODES = [
    'PriceVsBaseline',
    'LowDOM',
    'LowMiles',
    'HighDemand',
    'OneOwner',
    'DealerCertified',
  ] as const;
  
  // VIN generation: 17 chars, excluding I, O, Q
  const VIN_CHARS = '0123456789ABCDEFGHJKLMNPRSTUVWXYZ';
  function generateVin(rand: () => number, used: Set<string>): string {
    let vin = '';
    do {
      vin = '';
      for (let i = 0; i < 17; i++) {
        vin += VIN_CHARS[Math.floor(rand() * VIN_CHARS.length)];
      }
    } while (used.has(vin));
    used.add(vin);
    return vin;
  }
  
  // Price heuristic: base adjusted by year/miles/trim
  function priceFor(
    base: number,
    year: number,
    miles: number,
    trimIndex: number,
    rand: () => number
  ): number {
    // Depreciation: ~5%/year from 2019
    const yearDelta = year - 2019;
    let price = base * Math.pow(0.95, Math.max(0, 2019 - year)) * Math.pow(1.03, Math.max(0, yearDelta));
  
    // Miles effect: -$0.06 per mile over 30k, +$0.04 per mile under 30k
    const deltaMiles = miles - 30000;
    price += deltaMiles * (deltaMiles > 0 ? -0.06 : 0.04);
  
    // Trim bump (higher trims +3–10%)
    const trimBump = 1 + (trimIndex * 0.03) + (rand() * 0.04);
    price *= trimBump;
  
    // Random market variance ±5%
    price *= 0.95 + rand() * 0.10;
  
    // Minimum floor
    return Math.max(Math.round(price / 50) * 50, 3500);
  }
  
  // Score heuristic: 50–99 based on miles, DOM, price vs. base
  function scoreFor(miles: number, dom: number, price: number, base: number, rand: () => number): number {
    let score = 60;
    if (miles < 30000) score += 10;
    if (miles < 15000) score += 6;
    if (dom < 14) score += 6;
    if (dom < 7) score += 4;
  
    const discount = (base - price) / base; // positive if under base
    score += Math.round(discount * 40); // up to +40
  
    score += Math.round((rand() - 0.5) * 6); // small noise
    return Math.max(25, Math.min(99, score));
  }
  
  // BuyMax: a tad above price or computed threshold
  function buyMaxFor(price: number, score: number): number {
    const bump = score >= 85 ? 0.06 : score >= 70 ? 0.04 : 0.02;
    const buy = price * (1 + bump);
    return Math.round(buy / 50) * 50;
  }
  
  // Choose some reasons consistent with score/mileage/dom
  function pickReasons(rand: () => number, price: number, base: number, dom: number, miles: number): string[] {
    const reasons = new Set<string>();
    if (price < base * 0.95) reasons.add('PriceVsBaseline');
    if (dom <= 14) reasons.add('LowDOM');
    if (miles <= 25000) reasons.add('LowMiles');
    if (rand() < 0.25) reasons.add(pick(rand, REASON_CODES));
    if (reasons.size === 0) reasons.add(pick(rand, REASON_CODES));
    return Array.from(reasons);
  }
  
  // Public API: generate N listings
  export function generateListings(n = 120, seed = 'mock-seed'): Listing[] {
    const rand = xorshift32(seedFromString(seed));
    const usedVINs = new Set<string>();
    const listings: Listing[] = [];
  
    for (let i = 0; i < n; i++) {
      const makeBlock = pick(rand, CATALOG);
      const modelBlock = pick(rand, makeBlock.models);
      const trim = pick(rand, modelBlock.trims);
      const year = randInt(rand, 2013, 2024);
      const miles = randInt(rand, 0, 140_000);
      const dom = randInt(rand, 1, 60);
      const radius = randInt(rand, 5, 75);
      const vin = generateVin(rand, usedVINs);
      const vehicle_key = vin;
      const base = modelBlock.basePrice;
  
      const price = priceFor(base, year, miles, modelBlock.trims.indexOf(trim), rand);
      const score = scoreFor(miles, dom, price, base, rand);
      const buyMax = buyMaxFor(price, score);
      const reasonCodes = pickReasons(rand, price, base, dom, miles);
      const source = pick(rand, SOURCES);
  
      listings.push({
        id: String(i + 1),
        vehicle_key,
        vin,
        year,
        make: makeBlock.make,
        model: modelBlock.model,
        trim,
        miles,
        price,
        score,
        dom,
        source,
        radius,
        reasonCodes,
        buyMax,
      });
    }
  
    return listings;
  }
  
  // Example:
  // const data = generateListings(150, 'seed-123');
  // console.log(data[0]);
  