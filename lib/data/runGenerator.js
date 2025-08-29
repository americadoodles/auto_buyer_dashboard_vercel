// Simple script to run the mock data generator
const { generateListings } = require('./generateMockListings.js');

// Generate 120 listings (100 new + 3 existing)
const mockData = generateListings(120, 'auto-buyer-seed');

// Output to console and save to file
console.log(JSON.stringify(mockData, null, 2));

// save this to a file if needed
const fs = require('fs');
fs.writeFileSync('generatedMockData.json', JSON.stringify(mockData, null, 2));
console.log('Mock data saved to generatedMockData.json');
