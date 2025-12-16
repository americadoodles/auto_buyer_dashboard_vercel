'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Listing } from '../../lib/types/listing';
import { formatCurrency, formatNumber } from '../../lib/utils/formatters';
import { getMarketplaceInfo, getTrustIndicators } from '../../lib/utils/marketplace';
import { Badge } from '../atoms/Badge';
import { 
  Gauge, 
  Clock, 
  ExternalLink, 
  Heart, 
  MoreVertical
} from 'lucide-react';

interface ListingCardProps {
  listing: Listing;
  isSelected?: boolean;
  onSelect?: (listingId: string, selected: boolean) => void;
  onNotify?: (vin: string) => void;
  onNotifySlack?: (vin: string) => void;
  onTriggerWorkflow?: (vin: string) => void;
  onLike?: (listingId: string) => void;
  isLiked?: boolean;
}

export const ListingCard: React.FC<ListingCardProps> = ({
  listing,
  isSelected = false,
  onSelect,
  onNotify,
  onNotifySlack,
  onTriggerWorkflow,
  onLike,
  isLiked = false,
}) => {
  const router = useRouter();
  const [imageError, setImageError] = useState(false);
  const [showActions, setShowActions] = useState(false);
  
  const marketplaceInfo = getMarketplaceInfo(listing.source);
  const trustIndicators = getTrustIndicators(listing);
  
  const primaryImage = listing.images && listing.images.length > 0 ? listing.images[0] : null;
  const vehicleTitle = `${listing.year} ${listing.make} ${listing.model}${listing.trim ? ` ${listing.trim}` : ''}`;
  const shortDescription = listing.sellerDescription 
    ? listing.sellerDescription.substring(0, 120) + (listing.sellerDescription.length > 120 ? '...' : '')
    : `${listing.year} ${listing.make} ${listing.model}${listing.bodyStyle ? ` • ${listing.bodyStyle}` : ''}${listing.exteriorColor ? ` • ${listing.exteriorColor}` : ''}`;

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on interactive elements
    if ((e.target as HTMLElement).closest('button, a, input')) {
      return;
    }
    router.push(`/listings/${listing.id}`);
  };

  return (
    <div
      className={`group relative bg-white dark:bg-gray-800 rounded-xl border-2 transition-all duration-200 hover:shadow-lg cursor-pointer flex flex-col h-full ${
        isSelected 
          ? 'border-blue-500 dark:border-blue-400 shadow-md' 
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
      onClick={handleCardClick}
    >
      {/* Selection Checkbox */}
      {onSelect && (
        <div className="absolute top-3 left-3 z-10" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect(listing.id, e.target.checked)}
            className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Image Section */}
      <div className="relative w-full h-48 bg-gray-100 dark:bg-gray-700 rounded-t-xl overflow-hidden">
        {primaryImage && !imageError ? (
          <img
            src={primaryImage}
            alt={vehicleTitle}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
            <Gauge className="h-12 w-12" />
          </div>
        )}
        
        {/* Image Count Badge */}
        {listing.images && listing.images.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
            +{listing.images.length - 1}
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4 space-y-3 flex flex-col min-h-0">
        {/* Title and Price Row */}
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate" title={vehicleTitle}>
              {vehicleTitle}
            </h3>
            <div className="text-xl font-bold text-green-600 dark:text-green-400 mt-1 truncate">
              {formatCurrency(listing.price)}
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 flex-shrink-0">
          <div className="flex items-center gap-1 min-w-0">
            <Gauge className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{formatNumber(listing.miles)} mi</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Clock className="h-4 w-4 flex-shrink-0" />
            <span>{listing.dom} days</span>
          </div>
        </div>

        {/* VIN - Always show */}
        <div className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded truncate" title={listing.vin || 'Not Available'}>
          VIN: {listing.vin || 'Not Available'}
        </div>

        {/* LPN - Always show */}
        <div className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded truncate" title={listing.lpn || 'Not Available'}>
          LPN: {listing.lpn || 'Not Available'}
        </div>

        {/* Source with Icon */}
        {marketplaceInfo && listing.source && (
          <div className="flex items-center gap-2 min-w-0">
            <a
              href={listing.source}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={`flex items-center gap-2 text-sm ${marketplaceInfo.color} hover:underline min-w-0`}
              title={`View on ${marketplaceInfo.name}`}
            >
              <span className="text-lg flex-shrink-0">{marketplaceInfo.icon}</span>
              <span className="truncate">{marketplaceInfo.name}</span>
              <ExternalLink className="h-3 w-3 flex-shrink-0" />
            </a>
          </div>
        )}

        {/* Short Description */}
        {shortDescription && (
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 min-w-0" title={shortDescription}>
            {shortDescription}
          </p>
        )}

        {/* Footer: Score, Trust Indicators, Like, and Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700 mt-auto flex-shrink-0 gap-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            {/* Score Badge */}
            {listing.score !== undefined && (
              <Badge variant="default" className="bg-blue-700 dark:bg-blue-500 text-white font-semibold text-xs border border-blue-800 dark:border-blue-400 shadow-sm flex-shrink-0">
                Score: {listing.score}
              </Badge>
            )}

            {/* Trust/Fraud Indicators */}
            {trustIndicators.indicators.length > 0 && (
              <>
                {trustIndicators.indicators.slice(0, 3).map((indicator, idx) => (
                  <div
                    key={idx}
                    className={`px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1 border shadow-sm flex-shrink-0 ${
                      indicator.type === 'trust'
                        ? 'bg-green-600 dark:bg-green-900/30 text-white dark:text-green-300 border-green-700 dark:border-green-700/50'
                        : indicator.type === 'warning'
                        ? 'bg-yellow-500 dark:bg-yellow-900/30 text-white dark:text-yellow-300 border-yellow-600 dark:border-yellow-700/50'
                        : 'bg-red-600 dark:bg-red-900/30 text-white dark:text-red-300 border-red-700 dark:border-red-700/50'
                    }`}
                    title={indicator.label}
                  >
                    <span>{indicator.icon}</span>
                  </div>
                ))}
              </>
            )}

            {/* Like Button */}
            {onLike && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLike(listing.id);
                }}
                className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                  isLiked
                    ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
                    : 'text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title={isLiked ? 'Unlike' : 'Like'}
              >
                <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
              </button>
            )}

            {/* More Actions Button */}
            <div className="relative flex-shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowActions(!showActions);
                }}
                className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="More actions"
              >
                <MoreVertical className="h-5 w-5" />
              </button>

              {/* Actions Dropdown */}
              {showActions && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowActions(false);
                    }}
                  />
                  <div className="absolute bottom-full left-0 mb-2 z-30 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[160px]">
                    {onNotify && listing.vin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNotify(listing.vin!);
                          setShowActions(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <span>🔔</span> Notify
                      </button>
                    )}
                    {onNotifySlack && listing.vin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNotifySlack(listing.vin!);
                          setShowActions(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <span>💬</span> Send to Slack
                      </button>
                    )}
                    {onTriggerWorkflow && listing.vin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onTriggerWorkflow(listing.vin!);
                          setShowActions(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <span>⚡</span> Trigger Workflow
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/listings/${listing.id}`);
                        setShowActions(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <span>✏️</span> Edit Details
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Additional Info */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {listing.buyMax && (
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate" title={`Max: ${formatCurrency(listing.buyMax)}`}>
                Max: {formatCurrency(listing.buyMax)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

