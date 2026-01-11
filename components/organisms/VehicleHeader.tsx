'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Check, ExternalLink, FileText } from 'lucide-react';
import { Icon } from '../atoms/Icon';

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

  return (
    <div className="bg-[#1a1d29] border border-gray-700/50 rounded-lg p-5">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className={`text-xl ${(year && make && model) ? 'text-green-400' : 'text-gray-400'}`}>
            {year} {make} {model} {trim ? trim : ''}
          </h2>
          {price !== undefined && (
            <div className="text-xl font-bold text-green-400">
              ${formatNumberWithCommas(price)}
            </div>
          )}
        </div>
        <div className="flex items-center gap-6 text-sm">
          {miles !== undefined && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400">🚗</span>
              <span className="text-gray-300">{formatNumberWithCommas(miles)} Miles</span>
            </div>
          )}
          {vin && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400">VIN:</span>
              <span className="text-gray-300">{vin}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 pt-2 flex-wrap">
          <button
            type="button"
            className={`relative flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors cursor-pointer ${hasAutoCheck ? 'bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20' : 'bg-black border border-gray-600 text-white hover:bg-gray-900'}`}
          >
            <Icon
              name="autocheck"
              size={12}
              className="opacity-80 hover:opacity-100 transition-opacity rounded"
            />
            AutoCheck
            {hasAutoCheck && (
              <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5">
                <Check className="h-3 w-3 text-white" strokeWidth={3} />
              </div>
            )}
          </button>
          <button
            type="button"
            className={`relative flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors cursor-pointer ${hasCarfax ? 'bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20' : 'bg-black border border-gray-600 text-white hover:bg-gray-900'}`}
          >
            <Icon
              name="carfax"
              size={12}
              className="opacity-80 hover:opacity-100 transition-opacity rounded"
            />
            CARFAX
            {hasCarfax && (
              <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5">
                <Check className="h-3 w-3 text-white" strokeWidth={3} />
              </div>
            )}
          </button>
          <button
            type="button"
            className={`relative flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors cursor-pointer ${hasMMR ? 'bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20' : 'bg-black border border-gray-600 text-white hover:bg-gray-900'}`}
          >
            <Icon
              name="mmr"
              size={12}
              className="opacity-80 hover:opacity-100 transition-opacity rounded"
            />
            MMR
            {hasMMR && (
              <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5">
                <Check className="h-3 w-3 text-white" strokeWidth={3} />
              </div>
            )}
          </button>
          <button
            type="button"
            className={`relative flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors cursor-pointer ${hasAccuTrade ? 'bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20' : 'bg-black border border-gray-600 text-white hover:bg-gray-900'}`}
          >
            <Icon
              name="accutrade"
              size={12}
              className="opacity-80 hover:opacity-100 transition-opacity rounded"
            />
            AccuTrade
            {hasAccuTrade && (
              <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5">
                <Check className="h-3 w-3 text-white" strokeWidth={3} />
              </div>
            )}
          </button>
          {source && (
            <button
              type="button"
              onClick={handleMarketplaceClick}
              className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors cursor-pointer bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20"
            >
              <ExternalLink className="h-3 w-3" />
              Marketplace
            </button>
          )}
          {listingId && (
            <button
              type="button"
              onClick={handleListingDetailClick}
              className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors cursor-pointer bg-purple-500/10 border border-purple-500/30 text-purple-400 hover:bg-purple-500/20"
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
