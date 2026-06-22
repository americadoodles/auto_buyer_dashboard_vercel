'use client';

import React, { useState, useEffect } from 'react';
import { Listing } from '../../lib/types/listing';
import { formatDateTime } from '../../lib/utils/formatters';
import { getMarketplaceInfo } from '../../lib/utils/marketplace';
import { X, ChevronRight } from 'lucide-react';

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

const PANEL_ANIMATION_MS = 300;

export const VehicleDetails: React.FC<VehicleDetailsProps> = ({ listing }) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsPanelOpen(false);
      setIsClosing(false);
    }, PANEL_ANIMATION_MS);
  };

  // Log the license plate to the browser console for debugging/inspection.
  useEffect(() => {
    console.log('[VehicleDetails] LPN:', listing?.lpn ?? '(none)', '| State:', listing?.lpnState ?? '(none)');
  }, [listing?.lpn, listing?.lpnState]);

  // Handle Escape key to close panel
  useEffect(() => {
    if (!isPanelOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose();
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isPanelOpen]);

  if (!listing) {
    return null;
  }

  const marketplaceName = getMarketplaceName(listing.source);

  return (
    <>
      {/* Clickable Title Card */}
      <div 
        className="bg-claude-surface dark:bg-[#1a1d29] rounded-lg shadow-sm border border-claude-border dark:border-coal-700/50 px-6 py-2 cursor-pointer hover:bg-claude-cream dark:hover:bg-coal-850/50 transition-colors"
        onClick={() => setIsPanelOpen(true)}
      >
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-bold text-black dark:text-coal-100">
            Vehicle Detail
            {marketplaceName && <span className="text-black dark:text-coal-400 font-normal"> ({marketplaceName})</span>}
          </h4>
          <ChevronRight className="w-5 h-5 text-claude-subtle" />
        </div>
      </div>

      {/* Slide-in Panel from Right */}
      {isPanelOpen && (
        <>
          {/* Backdrop */}
          <div 
            className={`fixed inset-0 bg-black/50 z-40 ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}
            onClick={handleClose}
          />
          
          {/* Panel */}
          <div className={`fixed top-0 right-0 h-full w-[30%] min-w-[320px] bg-claude-surface dark:bg-[#1a1d29] shadow-xl z-50 overflow-y-auto ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}>
            {/* Panel Header */}
            <div className="sticky top-0 bg-claude-surface dark:bg-[#1a1d29] border-b border-claude-border dark:border-coal-700/50 px-6 py-4 flex items-center justify-between">
              <h4 className="text-lg font-bold text-black dark:text-coal-100">
                Vehicle Detail
                {marketplaceName && <span className="text-black dark:text-coal-400 font-normal"> ({marketplaceName})</span>}
              </h4>
              <button
                onClick={handleClose}
                className="text-claude-subtle hover:text-claude-muted dark:hover:text-coal-100 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Panel Content */}
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 gap-x-8 gap-y-2">
        {/* LPN */}
        {listing.lpn && (
          <div className="flex items-center w-full group">
            <span className="text-sm font-semibold text-black dark:text-coal-300 w-32 flex-shrink-0">LPN:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-black dark:text-coal-300">{listing.lpn}</span>
              {listing.lpnState && (
                <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-claude-sand text-claude-ink dark:bg-coal-700 dark:text-coal-200">
                  {listing.lpnState}
                </span>
              )}
            </div>
          </div>
        )}

        {/* LPN State (shown standalone only when the plate number itself is absent) */}
        {!listing.lpn && listing.lpnState && (
          <div className="flex items-center w-full group">
            <span className="text-sm font-semibold text-black dark:text-coal-300 w-32 flex-shrink-0">LPN State:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-black dark:text-coal-300">{listing.lpnState}</span>
            </div>
          </div>
        )}

        {/* DOM */}
        {listing.dom !== undefined && (
          <div className="flex items-center w-full group">
            <span className="text-sm font-semibold text-black dark:text-coal-300 w-32 flex-shrink-0">DOM:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-black dark:text-coal-300">{listing.dom} days</span>
            </div>
          </div>
        )}

        {/* Location */}
        {listing.location && (
          <div className="flex items-center w-full group">
            <span className="text-sm font-semibold text-black dark:text-coal-300 w-32 flex-shrink-0">Location:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-black dark:text-coal-300">{listing.location}</span>
            </div>
          </div>
        )}

        {/* Transmission */}
        {listing.transmission && (
          <div className="flex items-center w-full group">
            <span className="text-sm font-semibold text-black dark:text-coal-300 w-32 flex-shrink-0">Transmission:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-black dark:text-coal-300">{listing.transmission}</span>
            </div>
          </div>
        )}

        {/* Exterior Color */}
        {listing.exteriorColor && (
          <div className="flex items-center w-full group">
            <span className="text-sm font-semibold text-black dark:text-coal-300 w-32 flex-shrink-0">Exterior Color:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-black dark:text-coal-300">{listing.exteriorColor}</span>
            </div>
          </div>
        )}

        {/* Interior Color */}
        {listing.interiorColor && (
          <div className="flex items-center w-full group">
            <span className="text-sm font-semibold text-black dark:text-coal-300 w-32 flex-shrink-0">Interior Color:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-black dark:text-coal-300">{listing.interiorColor}</span>
            </div>
          </div>
        )}

        {/* Fuel Type */}
        {listing.fuelType && (
          <div className="flex items-center w-full group">
            <span className="text-sm font-semibold text-black dark:text-coal-300 w-32 flex-shrink-0">Fuel Type:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-black dark:text-coal-300">{listing.fuelType}</span>
            </div>
          </div>
        )}

        {/* Body Style */}
        {listing.bodyStyle && (
          <div className="flex items-center w-full group">
            <span className="text-sm font-semibold text-black dark:text-coal-300 w-32 flex-shrink-0">Body Style:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-black dark:text-coal-300">{listing.bodyStyle}</span>
            </div>
          </div>
        )}

        {/* Engine */}
        {listing.engine && (
          <div className="flex items-center w-full group">
            <span className="text-sm font-semibold text-black dark:text-coal-300 w-32 flex-shrink-0">Engine:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-black dark:text-coal-300">{listing.engine}</span>
            </div>
          </div>
        )}

        {/* Drive Type */}
        {listing.driveType && (
          <div className="flex items-center w-full group">
            <span className="text-sm font-semibold text-black dark:text-coal-300 w-32 flex-shrink-0">Drive Type:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-black dark:text-coal-300">{listing.driveType}</span>
            </div>
          </div>
        )}

        {/* Condition */}
        {listing.condition && (
          <div className="flex items-center w-full group">
            <span className="text-sm font-semibold text-black dark:text-coal-300 w-32 flex-shrink-0">Condition:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-black dark:text-coal-300">{listing.condition}</span>
            </div>
          </div>
        )}

        {/* MPG */}
        {listing.mpg && (
          <div className="flex items-center w-full group">
            <span className="text-sm font-semibold text-black dark:text-coal-300 w-32 flex-shrink-0">MPG:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-black dark:text-coal-300">{listing.mpg}</span>
            </div>
          </div>
        )}

        {/* Clean Title */}
        {listing.cleanTitle !== undefined && (
          <div className="flex items-center w-full group">
            <span className="text-sm font-semibold text-black dark:text-coal-300 w-32 flex-shrink-0">Clean Title:</span>
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
            <span className="text-sm font-semibold text-black dark:text-coal-300 w-32 flex-shrink-0">Overall Rating:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-black dark:text-coal-300">{listing.overallRating}</span>
            </div>
          </div>
        )}

        {/* Paid Status */}
        {listing.paidStatus && (
          <div className="flex items-center w-full group">
            <span className="text-sm font-semibold text-black dark:text-coal-300 w-32 flex-shrink-0">Paid Status:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-black dark:text-coal-300">{listing.paidStatus}</span>
            </div>
          </div>
        )}

        {/* Seller Name */}
        {listing.sellerName && (
          <div className="flex items-center w-full group">
            <span className="text-sm font-semibold text-black dark:text-coal-300 w-32 flex-shrink-0">Seller Name:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-black dark:text-coal-300">{listing.sellerName}</span>
            </div>
          </div>
        )}

        {/* Phone Number */}
        {listing.phoneNumber && (
          <div className="flex items-center w-full group">
            <span className="text-sm font-semibold text-black dark:text-coal-300 w-32 flex-shrink-0">Phone:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-black dark:text-coal-300">{listing.phoneNumber}</span>
            </div>
          </div>
        )}

        {/* Seller Joined Date */}
        {listing.sellerJoinedDate && (
          <div className="flex items-center w-full group">
            <span className="text-sm font-semibold text-black dark:text-coal-300 w-32 flex-shrink-0">Seller Joined:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-black dark:text-coal-300">{formatDateTime(listing.sellerJoinedDate)}</span>
            </div>
          </div>
        )}

        {/* Status */}
        {listing.status && (
          <div className="flex items-center w-full group">
            <span className="text-sm font-semibold text-black dark:text-coal-300 w-32 flex-shrink-0">Status:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-black dark:text-coal-300">{listing.status}</span>
            </div>
          </div>
        )}

        {/* Score */}
        {listing.score !== undefined && (
          <div className="flex items-center w-full group">
            <span className="text-sm font-semibold text-black dark:text-coal-300 w-32 flex-shrink-0">Score:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-black dark:text-coal-300">{listing.score}</span>
            </div>
          </div>
        )}

        {/* Buy Max */}
        {listing.buyMax !== undefined && (
          <div className="flex items-center w-full group">
            <span className="text-sm font-semibold text-black dark:text-coal-300 w-32 flex-shrink-0">Buy Max:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-black dark:text-coal-300">${formatNumberWithCommas(listing.buyMax)}</span>
            </div>
          </div>
        )}

                {/* Reason Codes */}
                {listing.reasonCodes && listing.reasonCodes.length > 0 && (
                  <div className="flex items-start w-full group">
                    <span className="text-sm font-semibold text-claude-subtle w-32 flex-shrink-0 pt-1">Reason Codes:</span>
                    <div className="flex items-start gap-2 flex-1">
                      <span className="text-sm text-black dark:text-coal-300">{listing.reasonCodes.join(', ')}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Animation styles */}
      <style jsx global>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes slide-out-right {
          from { transform: translateX(0); }
          to { transform: translateX(100%); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fade-out {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        .animate-slide-in-right { animation: slide-in-right 0.3s ease-out forwards; }
        .animate-slide-out-right { animation: slide-out-right 0.3s ease-in forwards; }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
        .animate-fade-out { animation: fade-out 0.3s ease-in forwards; }
      `}</style>
    </>
  );
};
