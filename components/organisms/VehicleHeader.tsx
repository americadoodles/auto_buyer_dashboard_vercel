'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Check, ExternalLink, FileText } from 'lucide-react';
import { Icon } from '../atoms/Icon';
import { useAccuTradeData } from '../../lib/hooks/useAccuTradeData';
import { useMMRData } from '../../lib/hooks/useMMRData';
import { AUTOCHECK_BASE_URL, CARFAX_BASE_URL, MMR_BASE_URL, ACCU_TRADE_BASE_URL } from '../../lib/constants/url';

interface VehicleHeaderProps {
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  miles?: number;
  vin?: string;
  price?: number;
  source?: string;
  listingId?: number;
  hasAutoCheck?: boolean;
  hasCarfax?: boolean;
  hasMMR?: boolean;
  hasAccuTrade?: boolean;
}

export const VehicleHeader: React.FC<VehicleHeaderProps> = ({
  year,
  make,
  model,
  trim,
  miles,
  vin,
  price,
  source,
  listingId,
  hasAutoCheck,
  hasCarfax,
  hasMMR,
  hasAccuTrade,
}) => {
  const router = useRouter();
  const { hasData: hasAccuTradeData, refresh: refreshAccuTradeData } = useAccuTradeData(vin);
  const { hasData: hasMMRData, refresh: refreshMMRData } = useMMRData(vin);
  
  const formatNumberWithCommas = (value: number | undefined): string => {
    if (value === undefined || value === null) return '';
    return value.toLocaleString('en-US');
  };

  const handleMarketplaceClick = () => {
    if (source) {
      window.open(source, '_blank', 'noopener,noreferrer');
    }
  };

  const handleListingDetailClick = () => {
    if (listingId) {
      router.push(`/listings/${listingId}`);
    }
  };

  const handleBadgeClick = async (
    type: 'autocheck' | 'carfax' | 'mmr' | 'accutrade',
    config: {
      hasData?: boolean | null;
      hasDataProp?: boolean;
      externalUrl: string;
      detailPagePath?: string;
      refreshFn?: () => void;
      copyToClipboard?: boolean;
    }
  ) => {
    if (!vin) return;

    const { hasData, hasDataProp, externalUrl, detailPagePath, refreshFn, copyToClipboard } = config;
    
    // Determine if data exists (use hook data if available, otherwise fall back to prop)
    const dataExists = hasData ?? hasDataProp ?? false;

    // Copy VIN to clipboard if needed (for MMR)
    if (copyToClipboard) {
      try {
        await navigator.clipboard.writeText(vin);
      } catch (err) {
        console.error('Failed to copy VIN to clipboard:', err);
      }
    }

    window.open(externalUrl, '_blank');

    // Set up refresh intervals if refresh function is provided
    if (refreshFn) {
      // Refresh the data status after a delay to check if data was added
      setTimeout(() => {
        refreshFn();
      }, 2000);

      // Also set up periodic refresh while the window might be open
      const refreshInterval = setInterval(() => {
        refreshFn();
      }, 5000);

      // Clear interval after 2 minutes (assuming user might take time to add data)
      setTimeout(() => {
        clearInterval(refreshInterval);
      }, 120000);
    }
  };

  const handleAutoCheckClick = () => {
    handleBadgeClick('autocheck', {
      externalUrl: `${AUTOCHECK_BASE_URL}/${encodeURIComponent(vin!)}`,
    });
  };

  const handleCarfaxClick = () => {
    handleBadgeClick('carfax', {
      externalUrl: `${CARFAX_BASE_URL}/${encodeURIComponent(vin!)}`,
    });
  };

  const handleMMRClick = () => {
    const mileageParam = miles !== undefined ? `&mileage=${encodeURIComponent(miles)}` : '';
    handleBadgeClick('mmr', {
      hasData: hasMMRData,
      hasDataProp: hasMMR,
      externalUrl: `${MMR_BASE_URL}=${encodeURIComponent(vin!)}${mileageParam}`,
      // detailPagePath: `/crm/leads/mmr/${encodeURIComponent(vin!)}`,
      refreshFn: refreshMMRData,
      copyToClipboard: true,
    });
  };

  const handleAccuTradeClick = () => {
    handleBadgeClick('accutrade', {
      hasData: hasAccuTradeData,
      hasDataProp: hasAccuTrade,
      externalUrl: `${ACCU_TRADE_BASE_URL}=${encodeURIComponent(vin!)}`,
      // detailPagePath: `/crm/leads/accu-trade/${encodeURIComponent(vin!)}`,
      refreshFn: refreshAccuTradeData,
    });
  };

  return (
    <div className="bg-claude-surface dark:bg-[#1a1d29] border border-claude-border dark:border-coal-700/50 rounded-lg px-4 py-2">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <h2 className={`text-xl ${(year && make && model) ? 'text-green-600 dark:text-green-400' : 'text-black dark:text-coal-400'}`}>
            {year} {make} {model} {trim ? trim : ''}
          </h2>
          {price !== undefined && (
            <div className="text-xl font-bold text-green-600 dark:text-green-400">
              ${formatNumberWithCommas(price)}
            </div>
          )}
        </div>
        <div className="flex items-center gap-6 text-sm">
          {miles !== undefined && (
            <div className="flex items-center gap-2">
              <span className="text-black dark:text-coal-400">🚗</span>
              <span className="text-black dark:text-coal-300">{formatNumberWithCommas(miles)} Miles</span>
            </div>
          )}
          {vin && (
            <div className="flex items-center gap-2">
              <span className="text-black dark:text-coal-400">VIN:</span>
              <span className="text-black dark:text-coal-300">{vin}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleAutoCheckClick}
            className={`relative flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors cursor-pointer ${hasAutoCheck ? 'bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400 hover:bg-green-500/20' : 'bg-claude-sand dark:bg-black border border-claude-divider dark:border-coal-600 text-black dark:text-coal-100 hover:bg-claude-sand dark:hover:bg-coal-900'}`}
          >
            <Icon
              name="autocheck"
              size={12}
              className="opacity-80 hover:opacity-100 transition-opacity rounded"
            />
            AutoCheck
            {hasAutoCheck && (
              <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5">
                <Check className="h-3 w-3 text-coal-100" strokeWidth={3} />
              </div>
            )}
          </button>
          <button
            type="button"
            onClick={handleCarfaxClick}
            className={`relative flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors cursor-pointer ${hasCarfax ? 'bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20' : 'bg-black border border-coal-600 text-coal-100 hover:bg-coal-900'}`}
          >
            <Icon
              name="carfax"
              size={12}
              className="opacity-80 hover:opacity-100 transition-opacity rounded"
            />
            CARFAX
            {hasCarfax && (
              <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5">
                <Check className="h-3 w-3 text-coal-100" strokeWidth={3} />
              </div>
            )}
          </button>
          <button
            type="button"
            onClick={handleMMRClick}
            className={`relative flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors cursor-pointer ${hasMMR ? 'bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20' : 'bg-black border border-coal-600 text-coal-100 hover:bg-coal-900'}`}
          >
            <Icon
              name="mmr"
              size={12}
              className="opacity-80 hover:opacity-100 transition-opacity rounded"
            />
            MMR
            {hasMMR && (
              <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5">
                <Check className="h-3 w-3 text-coal-100" strokeWidth={3} />
              </div>
            )}
          </button>
          <button
            type="button"
            onClick={handleAccuTradeClick}
            className={`relative flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors cursor-pointer ${hasAccuTrade ? 'bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20' : 'bg-black border border-coal-600 text-coal-100 hover:bg-coal-900'}`}
          >
            <Icon
              name="accutrade"
              size={12}
              className="opacity-80 hover:opacity-100 transition-opacity rounded"
            />
            AccuTrade
            {hasAccuTrade && (
              <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5">
                <Check className="h-3 w-3 text-coal-100" strokeWidth={3} />
              </div>
            )}
          </button>
          {source && (
            <button
              type="button"
              onClick={handleMarketplaceClick}
              className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors cursor-pointer bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20"
            >
              <ExternalLink className="h-3 w-3" />
              Marketplace
            </button>
          )}
          {listingId && (
            <button
              type="button"
              onClick={handleListingDetailClick}
              className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors cursor-pointer bg-purple-500/10 border border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20"
            >
              <FileText className="h-3 w-3" />
              Listing Detail
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
