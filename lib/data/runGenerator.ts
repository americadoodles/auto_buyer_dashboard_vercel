import { generateListings } from './generateMockListings';
import * as fs from 'fs';
import * as path from 'path';

// Generate 120 listings (100 new + 3 existing)
const mockData = generateListings(120, 'auto-buyer-seed');

// Output to console
console.log(`Generated ${mockData.length} mock listings`);
console.log('Sample entry:', mockData[0]);

// Save to JSON file
const outputPath = path.join(__dirname, 'generatedMockData.json');
fs.writeFileSync(outputPath, JSON.stringify(mockData, null, 2));
console.log(`Mock data saved to: ${outputPath}`);

// Also update the mockData.ts file with the new data
const mockDataContent = `import { Listing } from '../types/listing';

export const MOCK_DATA: Listing[] = ${JSON.stringify(mockData, null, 2)};
`;

const mockDataPath = path.join(__dirname, 'mockData.ts');
fs.writeFileSync(mockDataPath, mockDataContent);
console.log(`Updated mockData.ts with ${mockData.length} entries`);
