'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Listing } from '../../lib/types/listing';
import { formatCurrency, formatNumber } from '../../lib/utils/formatters';
import { getMarketplaceInfo, getTrustIndicators } from '../../lib/utils/marketplace';
import { Badge } from '../atoms/Badge';
import { AiRecommenderApi, RecommendResponse } from '../../lib/services/aiRecommenderApi';
import { 
  Gauge, 
  Clock, 
  ExternalLink, 
  Heart, 
  MoreVertical,
  Sparkles,
  Loader2,
  X,
  ThumbsUp,
  ThumbsDown,
  Minus,
  AlertCircle,
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
  const searchParams = useSearchParams();
  const [imageError, setImageError] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showRecommendModal, setShowRecommendModal] = useState(false);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [recommendResult, setRecommendResult] = useState<RecommendResponse | null>(null);
  const [recommendError, setRecommendError] = useState<string | null>(null);

  const handleRecommend = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!listing.vin) return;
    setShowRecommendModal(true);
    setRecommendLoading(true);
    setRecommendResult(null);
    setRecommendError(null);
    try {
      const result = await AiRecommenderApi.recommend(listing.vin);
      setRecommendResult(result);
    } catch (err) {
      setRecommendError(err instanceof Error ? err.message : 'Failed to get recommendation');
    } finally {
      setRecommendLoading(false);
    }
  };

  const getRecommendationBadge = (rec: string) => {
    const lower = rec.toLowerCase();
    if (lower.includes('buy') || lower.includes('strong')) {
      return { icon: <ThumbsUp className="h-5 w-5" />, color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700', label: rec };
    }
    if (lower.includes('pass') || lower.includes('skip') || lower.includes('avoid')) {
      return { icon: <ThumbsDown className="h-5 w-5" />, color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700', label: rec };
    }
    return { icon: <Minus className="h-5 w-5" />, color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700', label: rec };
  };
  
  const marketplaceInfo = getMarketplaceInfo(listing.source);
  const trustIndicators = getTrustIndicators(listing);
  
  const primaryImage = listing.images && listing.images.length > 0 ? listing.images[0] : null;
  const vehicleTitle = `${listing.year} ${listing.make} ${listing.model}${listing.trim ? ` ${listing.trim}` : ''}`;
  const shortDescription = listing.sellerDescription 
    ? listing.sellerDescription.substring(0, 120) + (listing.sellerDescription.length > 120 ? '...' : '')
    : `${listing.year} ${listing.make} ${listing.model}${listing.bodyStyle ? ` • ${listing.bodyStyle}` : ''}${listing.exteriorColor ? ` • ${listing.exteriorColor}` : ''}`;

  const navigateToDetail = () => {
    // Preserve page parameter when navigating to detail page
    const page = searchParams.get('page');
    const perPage = searchParams.get('perPage');
    const params = new URLSearchParams();
    if (page) params.set('page', page);
    if (perPage) params.set('perPage', perPage);
    const queryString = params.toString();
    router.push(`/listings/${listing.id}${queryString ? `?${queryString}` : ''}`);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on interactive elements
    if ((e.target as HTMLElement).closest('button, a, input')) {
      return;
    }
    navigateToDetail();
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
            <div className="flex items-center gap-2 mt-1">
              <div className="text-xl font-bold text-green-600 dark:text-green-400 truncate">
                {formatCurrency(listing.price)}
              </div>
              {listing.vin && (
                <button
                  onClick={handleRecommend}
                  title="AI Recommendation"
                  className="shrink-0 flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>AI</span>
                </button>
              )}
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
                        navigateToDetail();
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

      {/* AI Recommendation Modal */}
      {showRecommendModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => { e.stopPropagation(); setShowRecommendModal(false); }}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white">
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-5 w-5" />
                <div>
                  <h3 className="font-semibold text-sm">AI Recommendation</h3>
                  <p className="text-xs text-purple-200 truncate max-w-[250px]">{vehicleTitle}</p>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setShowRecommendModal(false); }}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                title="Close"
                aria-label="Close recommendation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-5 py-5">
              {recommendLoading && (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Analyzing {listing.vin}...</p>
                </div>
              )}

              {recommendError && (
                <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                  <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-700 dark:text-red-300">Failed to get recommendation</p>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">{recommendError}</p>
                  </div>
                </div>
              )}

              {recommendResult && !recommendLoading && (
                <div className="space-y-4">
                  {/* Recommendation Badge */}
                  {(() => {
                    const badge = getRecommendationBadge(recommendResult.recommendation);
                    return (
                      <div className={`flex items-center gap-3 p-4 rounded-xl border ${badge.color}`}>
                        {badge.icon}
                        <div>
                          <p className="font-bold text-lg capitalize">{badge.label}</p>
                          {recommendResult.confidence != null && (
                            <p className="text-xs mt-0.5 opacity-80">
                              Confidence: {(recommendResult.confidence * 100).toFixed(0)}%
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Reasoning */}
                  {recommendResult.reasoning && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Reasoning</h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                        {recommendResult.reasoning}
                      </p>
                    </div>
                  )}

                  {/* Extra data */}
                  {recommendResult.data && typeof recommendResult.data === 'object' && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Details</h4>
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-100 dark:border-gray-700 text-xs space-y-1">
                        {Object.entries(recommendResult.data).map(([key, val]) => (
                          <div key={key} className="flex justify-between gap-2">
                            <span className="text-gray-500 dark:text-gray-400 capitalize">{key.replace(/_/g, ' ')}</span>
                            <span className="text-gray-800 dark:text-gray-200 font-medium text-right truncate max-w-[200px]">
                              {val == null ? '—' : typeof val === 'object' ? JSON.stringify(val) : String(val)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* VIN */}
                  <div className="text-xs text-gray-400 dark:text-gray-500 font-mono pt-2 border-t border-gray-100 dark:border-gray-700">
                    VIN: {recommendResult.vin}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

