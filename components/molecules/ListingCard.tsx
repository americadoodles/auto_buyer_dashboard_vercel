'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Listing } from '../../lib/types/listing';
import { formatCurrency, formatNumber, formatDateTime } from '../../lib/utils/formatters';
import { getMarketplaceInfo, getTrustIndicators } from '../../lib/utils/marketplace';
import { Badge } from '../atoms/Badge';
import { AiRecommenderApi, RecommendResponse } from '../../lib/services/aiRecommenderApi';
import {
  Gauge,
  Clock,
  CalendarDays,
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

  /** Lightweight markdown → HTML for AI recommendation text */
  const renderMarkdown = (text: string): string => {
    let html = text
      // Escape HTML entities
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Bold: **text**
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic: *text*
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Headings: lines starting with ### / ## / #
      .replace(/^### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^## (.+)$/gm, '<h3>$1</h3>')
      .replace(/^# (.+)$/gm, '<h2>$1</h2>');

    // Convert bullet lists (lines starting with * or - or numbered 1.)
    html = html.replace(/^(\d+)\.\s+(.+)$/gm, '<li>$2</li>');
    html = html.replace(/^[\*\-]\s+(.+)$/gm, '<li>$1</li>');
    // Wrap consecutive <li> in <ul>
    html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

    // Paragraphs: double newlines
    html = html
      .split(/\n{2,}/)
      .map((block) => {
        const trimmed = block.trim();
        if (!trimmed) return '';
        // Don't wrap if already a block element
        if (/^<(h[1-6]|ul|ol|li|div|blockquote)/.test(trimmed)) return trimmed;
        return `<p>${trimmed.replace(/\n/g, '<br />')}</p>`;
      })
      .join('\n');

    return html;
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
      className={`group relative bg-claude-surface dark:bg-coal-850 rounded-xl border-2 transition-all duration-200 hover:shadow-lg cursor-pointer flex flex-col h-full ${
        isSelected 
          ? 'border-blue-500 dark:border-blue-400 shadow-md' 
          : 'border-claude-border dark:border-coal-700 hover:border-claude-divider dark:hover:border-coal-600'
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
            className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-claude-divider rounded cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Image Section */}
      <div className="relative w-full h-48 bg-claude-sand dark:bg-coal-700 rounded-t-xl overflow-hidden">
        {primaryImage && !imageError ? (
          <img
            src={primaryImage}
            alt={vehicleTitle}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-claude-subtle dark:text-coal-500">
            <Gauge className="h-12 w-12" />
          </div>
        )}
        
        {/* Image Count Badge */}
        {listing.images && listing.images.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/60 text-coal-100 text-xs px-2 py-1 rounded">
            +{listing.images.length - 1}
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4 space-y-3 flex flex-col min-h-0">
        {/* Title and Price Row */}
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-claude-ink dark:text-coal-100 truncate" title={vehicleTitle}>
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
        <div className="flex items-center gap-4 text-sm text-claude-muted dark:text-coal-400 flex-shrink-0">
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
        <div className="text-xs font-mono text-claude-subtle dark:text-coal-400 bg-claude-cream dark:bg-coal-700/50 px-2 py-1 rounded truncate" title={listing.vin || 'Not Available'}>
          VIN: {listing.vin || 'Not Available'}
        </div>

        {/* LPN - Always show */}
        <div className="text-xs font-mono text-claude-subtle dark:text-coal-400 bg-claude-cream dark:bg-coal-700/50 px-2 py-1 rounded truncate" title={listing.lpn || 'Not Available'}>
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
          <p className="text-sm text-claude-muted dark:text-coal-400 line-clamp-2 min-w-0" title={shortDescription}>
            {shortDescription}
          </p>
        )}

        {/* Footer: Score, Trust Indicators, Like, and Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-claude-border dark:border-coal-700 mt-auto flex-shrink-0 gap-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            {/* Score Badge */}
            {listing.score !== undefined && (
              <Badge variant="default" className="bg-blue-700 dark:bg-blue-500 text-coal-100 font-semibold text-xs border border-blue-800 dark:border-blue-400 shadow-sm flex-shrink-0">
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
                        ? 'bg-green-600 dark:bg-green-900/30 text-coal-100 dark:text-green-300 border-green-700 dark:border-green-700/50'
                        : indicator.type === 'warning'
                        ? 'bg-yellow-500 dark:bg-yellow-900/30 text-coal-100 dark:text-yellow-300 border-yellow-600 dark:border-yellow-700/50'
                        : 'bg-red-600 dark:bg-red-900/30 text-coal-100 dark:text-red-300 border-red-700 dark:border-red-700/50'
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
                    : 'text-claude-subtle dark:text-coal-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-claude-sand dark:hover:bg-coal-700'
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
                className="p-2 rounded-lg text-claude-subtle dark:text-coal-500 hover:text-claude-muted dark:hover:text-claude-subtle hover:bg-claude-sand dark:hover:bg-coal-700 transition-colors"
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
                  <div className="absolute bottom-full left-0 mb-2 z-30 bg-claude-surface dark:bg-coal-850 rounded-lg shadow-lg border border-claude-border dark:border-coal-700 py-1 min-w-[160px]">
                    {onNotify && listing.vin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNotify(listing.vin!);
                          setShowActions(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-claude-text dark:text-coal-300 hover:bg-claude-sand dark:hover:bg-coal-700 flex items-center gap-2"
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
                        className="w-full text-left px-4 py-2 text-sm text-claude-text dark:text-coal-300 hover:bg-claude-sand dark:hover:bg-coal-700 flex items-center gap-2"
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
                        className="w-full text-left px-4 py-2 text-sm text-claude-text dark:text-coal-300 hover:bg-claude-sand dark:hover:bg-coal-700 flex items-center gap-2"
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
                      className="w-full text-left px-4 py-2 text-sm text-claude-text dark:text-coal-300 hover:bg-claude-sand dark:hover:bg-coal-700 flex items-center gap-2"
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
              <div className="text-xs text-claude-subtle dark:text-coal-400 truncate" title={`Max: ${formatCurrency(listing.buyMax)}`}>
                Max: {formatCurrency(listing.buyMax)}
              </div>
            )}
          </div>
        </div>

        {/* Bottom line: ingestion date at the right */}
        {listing.created_at && (
          <div className="flex justify-end pt-1 flex-shrink-0">
            <div
              className="flex items-center gap-1 text-[11px] text-claude-subtle dark:text-coal-500 whitespace-nowrap"
              title={`Ingested: ${formatDateTime(listing.created_at)}`}
            >
              <CalendarDays className="h-3 w-3 flex-shrink-0" />
              {formatDateTime(listing.created_at)}
            </div>
          </div>
        )}
      </div>

      {/* AI Recommendation Modal */}
      {showRecommendModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => { e.stopPropagation(); setShowRecommendModal(false); }}
        >
          <div
            className="bg-claude-surface dark:bg-coal-850 rounded-2xl shadow-2xl border border-claude-border dark:border-coal-700 overflow-hidden flex flex-col"
            style={{ width: '50vw', height: '50vh', minWidth: '400px', minHeight: '350px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-coal-700 text-coal-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-5 w-5" />
                <div>
                  <h3 className="font-semibold text-sm">AI Recommendation</h3>
                  <p className="text-xs text-purple-200 truncate max-w-[350px]">{vehicleTitle} &middot; {listing.vin}</p>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setShowRecommendModal(false); }}
                className="p-1.5 rounded-lg hover:bg-claude-surface/20 transition-colors"
                title="Close"
                aria-label="Close recommendation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {recommendLoading && (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                  <p className="text-sm text-claude-subtle dark:text-coal-400">Analyzing {listing.vin}...</p>
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
                <div
                  className="prose prose-sm dark:prose-invert max-w-none text-claude-text dark:text-coal-300 font-normal
                    prose-headings:font-semibold prose-headings:text-claude-ink dark:prose-headings:text-coal-100
                    prose-strong:font-semibold prose-strong:text-claude-ink dark:prose-strong:text-coal-100
                    prose-ul:my-2 prose-li:my-0.5 prose-p:my-2"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(recommendResult.recommendation) }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

