'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lead as BaseLead } from '../../lib/types/lead';
import { formatCurrency, formatNumber, formatLocationWithStateCode } from '../../lib/utils/formatters';
import { getMarketplaceInfo } from '../../lib/utils/marketplace';
import { Badge } from '../atoms/Badge';
import { Icon } from '../atoms/Icon';
import { useAccuTradeData } from '../../lib/hooks/useAccuTradeData';
import { 
  Gauge, 
  Clock, 
  ExternalLink, 
  Heart, 
  MoreVertical,
  User,
  Mail,
  Phone,
  MapPin,
  Check
} from 'lucide-react';

// Extended Lead type matching LeadManagement's transformed type
type Lead = Omit<BaseLead, 'status' | 'assigned_to' | 'source'> & {
  status: {
    id: number;
    name: string;
    color: string;
  };
  source?: {
    id: number;
    name: string;
  };
  assigned_to: {
    id: string;
    username: string;
  };
};

interface LeadCardProps {
  lead: Lead;
  isSelected?: boolean;
  onSelect?: (leadId: string, selected: boolean) => void;
  onLike?: (leadId: string) => void;
  isLiked?: boolean;
}

export const LeadCard: React.FC<LeadCardProps> = ({
  lead,
  isSelected = false,
  onSelect,
  onLike,
  isLiked = false,
}) => {
  const router = useRouter();
  const [imageError, setImageError] = useState(false);
  const [showActions, setShowActions] = useState(false);
  
  const marketplaceInfo = lead.listing?.source ? getMarketplaceInfo(lead.listing.source) : null;
  const { hasData: hasAccuTradeData, refresh: refreshAccuTradeData } = useAccuTradeData(lead.listing?.vin);
  
  const handleAccuTradeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!lead.listing?.vin) return;
    
    const accuTradeUrl = `https://appraiser3.accu-trade.com/appraisal/new?vin=${encodeURIComponent(lead.listing.vin)}`;
    window.open(accuTradeUrl, '_blank');
    
    // Refresh the data status after a delay to check if data was added
    setTimeout(() => {
      refreshAccuTradeData();
    }, 2000);
    
    // Also set up periodic refresh while the window might be open
    const refreshInterval = setInterval(() => {
      refreshAccuTradeData();
    }, 5000);
    
    // Clear interval after 2 minutes (assuming user might take time to add data)
    setTimeout(() => {
      clearInterval(refreshInterval);
    }, 120000);
  };
  const primaryImage = lead.listing?.images && lead.listing.images.length > 0 ? lead.listing.images[0] : null;
  const vehicleTitle = lead.listing 
    ? `${lead.listing.year || ''} ${lead.listing.make || ''} ${lead.listing.model || ''}${lead.listing.trim ? ` ${lead.listing.trim}` : ''}`.trim()
    : 'No Vehicle';
  
  const contactName = lead.contact 
    ? `${lead.contact.first_name || ''} ${lead.contact.last_name || ''}`.trim() || 'Unknown Contact'
    : 'No Contact';
  
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on interactive elements
    if ((e.target as HTMLElement).closest('button, a, input')) {
      return;
    }
    router.push(`/crm/leads/${lead.id}`);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'blue';
    if (score >= 40) return 'yellow';
    return 'red';
  };

  // Helper function to get verification icons for a lead
  const getVerificationIcons = (lead: Lead) => {
    const icons: string[] = [];
    const listing = lead.listing;
    if (!listing) {
      return icons;
    }
    icons.push('mmr');
    icons.push('accutrade');
    icons.push('autocheck');
    icons.push('carfax');
    return icons;
  };

  return (
    <div
      className={`group relative bg-gray-50 dark:bg-gray-800 rounded-xl border-2 transition-all duration-200 hover:shadow-lg cursor-pointer flex flex-col h-full ${
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
            onChange={(e) => onSelect(lead.id, e.target.checked)}
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
        {lead.listing?.images && lead.listing.images.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
            +{lead.listing.images.length - 1}
          </div>
        )}

        {/* Status Badge - Overlay on Image */}
        <div className="absolute top-2 right-2">
          <Badge color={lead.status.color} className="font-semibold text-xs shadow-sm">
            {lead.status.name}
          </Badge>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4 space-y-3 flex flex-col min-h-0">
        {/* Contact Info */}
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate" title={contactName}>
              {contactName}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 dark:text-gray-400 min-w-0">
              {lead.contact?.email && (
                <div className="flex items-center gap-1 min-w-0">
                  <Mail className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate" title={lead.contact.email}>{lead.contact.email}</span>
                </div>
              )}
            </div>
            {lead.contact?.phone && (
              <div className="flex items-center gap-1 mt-1 text-sm text-gray-600 dark:text-gray-400">
                <Phone className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{lead.contact.phone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Vehicle Info */}
        {lead.listing && (
          <>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 min-w-0">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 truncate">Vehicle Interest</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate" title={vehicleTitle}>{vehicleTitle}</span>
                  {lead.listing.price && (
                    <span className="text-base font-bold text-green-600 dark:text-green-400 flex-shrink-0">
                      {formatCurrency(lead.listing.price)}
                    </span>
                  )}
                </div>
                
                {/* Vehicle Details */}
                <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400 flex-wrap">
                  {lead.listing.miles !== undefined && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Gauge className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{formatNumber(lead.listing.miles)} mi</span>
                    </div>
                  )}
                  {lead.listing.dom !== undefined && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Clock className="h-3 w-3 flex-shrink-0" />
                      <span>{lead.listing.dom} days</span>
                    </div>
                  )}
                  {lead.listing.location && (
                    <div className="flex items-center gap-1 min-w-0">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate" title={lead.listing.location}>
                        {formatLocationWithStateCode(lead.listing.location)}
                      </span>
                    </div>
                  )}
                </div>

                {/* VIN & LPN */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded truncate" title={lead.listing.vin || 'Not Available'}>
                    VIN: {lead.listing.vin || 'Not Available'}
                  </div>
                  <div className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded truncate" title={lead.listing.lpn || 'Not Available'}>
                    LPN: {lead.listing.lpn || 'Not Available'}
                  </div>
                </div>

                {/* Source */}
                {marketplaceInfo && lead.listing.source && (
                  <div className="flex items-center gap-2 mt-2 min-w-0">
                    <a
                      href={lead.listing.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className={`flex items-center gap-2 text-xs ${marketplaceInfo.color} hover:underline min-w-0`}
                      title={`View on ${marketplaceInfo.name}`}
                    >
                      <span className="text-sm flex-shrink-0">{marketplaceInfo.icon}</span>
                      <span className="truncate">{marketplaceInfo.name}</span>
                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    </a>
                  </div>
                )}

                {/* Verification Icons */}
                {(() => {
                  const verificationIcons = getVerificationIcons(lead);
                  if (verificationIcons.length > 0) {
                    return (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">Verified:</span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {verificationIcons.map((iconName) => (
                            <div
                              key={iconName}
                              title={iconName.charAt(0).toUpperCase() + iconName.slice(1)}
                              className="inline-flex relative"
                            >
                              {iconName === 'accutrade' ? (
                                <button
                                  onClick={handleAccuTradeClick}
                                  className="relative inline-flex items-center justify-center"
                                  title={hasAccuTradeData ? 'AccuTrade data available - Click to open AccuTrade' : 'Click to open AccuTrade'}
                                >
                                  <Icon
                                    name={iconName}
                                    size={24}
                                    className="opacity-80 hover:opacity-100 transition-opacity rounded"
                                  />
                                  {hasAccuTradeData && (
                                    <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5">
                                      <Check className="h-3 w-3 text-white" strokeWidth={3} />
                                    </div>
                                  )}
                                </button>
                              ) : (
                                <Icon
                                  name={iconName}
                                  size={24}
                                  className="opacity-80 hover:opacity-100 transition-opacity rounded"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          </>
        )}

        {/* Lead Info */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-2 min-w-0">
          <div className="flex items-center justify-between text-xs gap-2">
            <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">Assigned to:</span>
            <span className="font-medium text-gray-700 dark:text-gray-300 truncate" title={lead.assigned_to?.username || 'Unassigned'}>
              {lead.assigned_to?.username || 'Unassigned'}
            </span>
          </div>
          {lead.source && (
            <div className="flex items-center justify-between text-xs gap-2">
              <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">Source:</span>
              <span className="font-medium text-gray-700 dark:text-gray-300 truncate" title={lead.source.name}>{lead.source.name}</span>
            </div>
          )}
        </div>

        {/* Footer: Score, Like, and Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700 mt-auto flex-shrink-0 gap-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            {/* Lead Score Badge */}
            <Badge 
              color={getScoreColor(lead.lead_score)} 
              className="font-semibold text-xs shadow-sm flex-shrink-0"
            >
              Score: {lead.lead_score}
            </Badge>

            {/* Like Button */}
            {onLike && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLike(lead.id);
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
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/crm/leads/${lead.id}`);
                        setShowActions(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <span>✏️</span> Edit Lead
                    </button>
                    {lead.contact?.email && (
                      <a
                        href={`mailto:${lead.contact.email}`}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <span>📧</span> Send Email
                      </a>
                    )}
                    {lead.contact?.phone && (
                      <a
                        href={`tel:${lead.contact.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <span>📞</span> Call
                      </a>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Additional Info */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {lead.budget_range && (lead.budget_range.min || lead.budget_range.max) && (
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate" title={`Budget: ${lead.budget_range.min ? formatCurrency(lead.budget_range.min) : '—'} - ${lead.budget_range.max ? formatCurrency(lead.budget_range.max) : '—'}`}>
                Budget: {lead.budget_range.min ? formatCurrency(lead.budget_range.min) : '—'} - {lead.budget_range.max ? formatCurrency(lead.budget_range.max) : '—'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

