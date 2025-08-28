import { Listing } from '../types/listing';

export const MOCK_DATA: Listing[] = [
  { 
    id: '1', 
    vin: '1HGCM82633A004352', 
    year: 2019, 
    make: 'Toyota', 
    model: 'Camry', 
    trim: 'SE', 
    miles: 41000, 
    price: 18950, 
    score: 88, 
    dom: 27, 
    source: 'AutoTrader', 
    radius: 52, 
    reasonCodes: ['PriceVsBaseline', 'LowDOM'], 
    buyMax: 19600 
  },
  { 
    id: '2', 
    vin: '1C4RJEBG3MC123456', 
    year: 2021, 
    make: 'Jeep', 
    model: 'Grand Cherokee', 
    trim: 'Limited', 
    miles: 36000, 
    price: 27990, 
    score: 73, 
    dom: 44, 
    source: 'Facebook Marketplace', 
    radius: 18, 
    reasonCodes: ['LowMiles'], 
    buyMax: 28600 
  },
  { 
    id: '3', 
    vin: '5YJ3E1EA7KF317000', 
    year: 2019, 
    make: 'Tesla', 
    model: 'Model 3', 
    trim: 'Long Range', 
    miles: 58000, 
    price: 21900, 
    score: 92, 
    dom: 12, 
    source: 'Bring a Trailer', 
    radius: 420, 
    reasonCodes: ['PriceVsBaseline', 'LowDOM'], 
    buyMax: 23000 
  },
];
