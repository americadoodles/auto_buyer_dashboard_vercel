'use client';

import React from 'react';
import { Listing } from '../../lib/types/listing';
import { formatDateTime } from '../../lib/utils/formatters';
import { getMarketplaceInfo } from '../../lib/utils/marketplace';

interface VehicleDetailsProps {
  listing: Listing;
}

// Format number with commas
const formatNumberWithCommas = (value: number | string | undefined): string => {
  if (value === undefined || value === null || value === '') return '';
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
  if (isNaN(numValue)) return '';
  return numValue.toLocaleString('en-US');
};

// Extract marketplace name from source URL using marketplace utils
const getMarketplaceName = (source?: string): string | null => {
  if (!source) return null;
  
  const marketplaceInfo = getMarketplaceInfo(source);
  if (!marketplaceInfo) return null;
  
  // Extract simple marketplace name from the domain or name
  const domain = marketplaceInfo.domain.toLowerCase();
  const parts = domain.split('.');
  
  if (parts.length >= 2) {
    const mainDomain = parts[parts.length - 2];
    
    // Handle special cases
    const domainMappings: Record<string, string> = {
      'autotrader': 'autotrade',
      'facebook': 'facebook',
      'craigslist': 'craigslist',
      'offerup': 'offerup',
      'cars': 'cars',
      'cargurus': 'cargurus',
      'carsforsale': 'carsforsale',
      'ebay': 'ebay',
      'ebaymotors': 'ebay',
    };
    
    return domainMappings[mainDomain] || mainDomain;
  }
  
  return domain.split('.')[0];
};

export const VehicleDetails: React.FC<VehicleDetailsProps> = ({ listing }) => {
  if (!listing) {
    return null;
  }

  const marketplaceName = getMarketplaceName(listing.source);

  return (
    <div className="bg-white dark:bg-[#1a1d29] rounded-lg shadow-sm border border-gray-200 dark:border-gray-700/50 px-6 py-3 space-y-3">
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700/50 pb-2">
        <h4 className="text-lg font-bold text-black dark:text-white">
          Vehicle Detail
          {marketplaceName && <span className="text-black dark:text-gray-400 font-normal"> ({marketplaceName})</span>}
        </h4>
      </div>
    
      <div className="grid grid-cols-1 gap-x-8 gap-y-1">
        {/* LPN */}
        {listing.lpn && (
          <div className="flex items-center w-full group">
            <span className="text-sm font-semibold text-black dark:text-gray-300 w-32 flex-shrink-0">LPN:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-black dark:text-gray-300">{listing.lpn}</span>
            </div>
          </div>
        )}

        {/* DOM */}
        {listing.dom !== undefined && (
          <div className="flex items-center w-full group">
            <span className="text-sm font-semibold text-black dark:text-gray-300 w-32 flex-shrink-0">DOM:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-black dark:text-gray-300">{listing.dom} days</span>
            </div>
          </div>
        )}

        {/* Location */}
        {listing.location && (
          <div className="flex items-center w-full group">
            <span className="text-sm font-semibold text-black dark:text-gray-300 w-32 flex-shrink-0">Location:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-black dark:text-gray-300">{listing.location}</span>
            </div>
          </div>
        )}

        {/* Transmission */}
        {listing.transmission && (
          <div className="flex items-center w-full group">
            <span className="text-sm font-semibold text-black dark:text-gray-300 w-32 flex-shrink-0">Transmission:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-black dark:text-gray-300">{listing.transmission}</span>
            </div>
          </div>
        )}

        {/* Exterior Color */}
        {listing.exteriorColor && (
          <div className="flex items-center w-full group">
            <span className="text-sm font-semibold text-black dark:text-gray-300 w-32 flex-shrink-0">Exterior Color:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-black dark:text-gray-300">{listing.exteriorColor}</span>
            </div>
          </div>
        )}

        {/* Interior Color */}
        {listing.interiorColor && (
          <div className="flex items-center w-full group">
            <span className="text-sm font-semibold text-black dark:text-gray-300 w-32 flex-shrink-0">Interior Color:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-black dark:text-gray-300">{listing.interiorColor}</span>
            </div>
          </div>
        )}

        {/* Fuel Type */}
        {listing.fuelType && (
          <div className="flex items-center w-full group">
            <span className="text-sm font-semibold text-black dark:text-gray-300 w-32 flex-shrink-0">Fuel Type:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-black dark:text-gray-300">{listing.fuelType}</span>
            </div>
          </div>
        )}

        {/* Body Style */}
        {listing.bodyStyle && (
          <div className="flex items-center w-full group">
            <span className="text-sm font-semibold text-black dark:text-gray-300 w-32 flex-shrink-0">Body Style:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-black dark:text-gray-300">{listing.bodyStyle}</span>
            </div>
          </div>
        )}

        {/* Engine */}
        {listing.engine && (
          <div className="flex items-center w-full group">
            <span className="text-sm font-semibold text-black dark:text-gray-300 w-32 flex-shrink-0">Engine:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-black dark:text-gray-300">{listing.engine}</span>
            </div>
          </div>
        )}

        {/* Drive Type */}
        {listing.driveType && (
          <div className="flex items-center w-full group">
            <span className="text-sm font-semibold text-black dark:text-gray-300 w-32 flex-shrink-0">Drive Type:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-black dark:text-gray-300">{listing.driveType}</span>
            </div>
          </div>
        )}

        {/* Condition */}
        {listing.condition && (
          <div className="flex items-center w-full group">
            <span className="text-sm font-semibold text-black dark:text-gray-300 w-32 flex-shrink-0">Condition:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-black dark:text-gray-300">{listing.condition}</span>
            </div>
          </div>
        )}

        {/* MPG */}
        {listing.mpg && (
          <div className="flex items-center w-full group">
            <span className="text-sm font-semibold text-black dark:text-gray-300 w-32 flex-shrink-0">MPG:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-black dark:text-gray-300">{listing.mpg}</span>
            </div>
          </div>
        )}

        {/* Clean Title */}
        {listing.cleanTitle !== undefined && (
          <div className="flex items-center w-full group">
            <span className="text-sm font-semibold text-black dark:text-gray-300 w-32 flex-shrink-0">Clean Title:</span>
            <div className="flex items-center gap-2">
              <span className={`text-sm ${listing.cleanTitle ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {listing.cleanTitle ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        )}

        {/* Overall Rating */}
        {listing.overallRating && (
          <div className="flex items-center w-full group">
            <span className="text-sm font-semibold text-black dark:text-gray-300 w-32 flex-shrink-0">Overall Rating:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-black dark:text-gray-300">{listing.overallRating}</span>
            </div>
          </div>
        )}

        {/* Paid Status */}
        {listing.paidStatus && (
          <div className="flex items-center w-full group">
            <span className="text-sm font-semibold text-black dark:text-gray-300 w-32 flex-shrink-0">Paid Status:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-black dark:text-gray-300">{listing.paidStatus}</span>
            </div>
          </div>
        )}

        {/* Seller Name */}
        {listing.sellerName && (
          <div className="flex items-center w-full group">
            <span className="text-sm font-semibold text-black dark:text-gray-300 w-32 flex-shrink-0">Seller Name:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-black dark:text-gray-300">{listing.sellerName}</span>
            </div>
          </div>
        )}

        {/* Phone Number */}
        {listing.phoneNumber && (
          <div className="flex items-center w-full group">
            <span className="text-sm font-semibold text-black dark:text-gray-300 w-32 flex-shrink-0">Phone:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-black dark:text-gray-300">{listing.phoneNumber}</span>
            </div>
          </div>
        )}

        {/* Seller Joined Date */}
        {listing.sellerJoinedDate && (
          <div className="flex items-center w-full group">
            <span className="text-sm font-semibold text-black dark:text-gray-300 w-32 flex-shrink-0">Seller Joined:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-black dark:text-gray-300">{formatDateTime(listing.sellerJoinedDate)}</span>
            </div>
          </div>
        )}

        {/* Status */}
        {listing.status && (
          <div className="flex items-center w-full group">
            <span className="text-sm font-semibold text-black dark:text-gray-300 w-32 flex-shrink-0">Status:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-black dark:text-gray-300">{listing.status}</span>
            </div>
          </div>
        )}

        {/* Score */}
        {listing.score !== undefined && (
          <div className="flex items-center w-full group">
            <span className="text-sm font-semibold text-black dark:text-gray-300 w-32 flex-shrink-0">Score:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-black dark:text-gray-300">{listing.score}</span>
            </div>
          </div>
        )}

        {/* Buy Max */}
        {listing.buyMax !== undefined && (
          <div className="flex items-center w-full group">
            <span className="text-sm font-semibold text-black dark:text-gray-300 w-32 flex-shrink-0">Buy Max:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-black dark:text-gray-300">${formatNumberWithCommas(listing.buyMax)}</span>
            </div>
          </div>
        )}

        {/* Reason Codes */}
        {listing.reasonCodes && listing.reasonCodes.length > 0 && (
          <div className="flex items-start w-full group">
            <span className="text-sm font-semibold text-gray-300 w-32 flex-shrink-0 pt-1">Reason Codes:</span>
            <div className="flex items-start gap-2 flex-1">
              <span className="text-sm text-black dark:text-gray-300">{listing.reasonCodes.join(', ')}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
