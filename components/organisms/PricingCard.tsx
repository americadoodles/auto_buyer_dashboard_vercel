'use client';

import React from 'react';
import { Button } from '../atoms/Button';

interface PricingCardProps {
  sellerName?: string;
  askingPrice?: number;
  suggestedPrice?: number;
}

export const PricingCard: React.FC<PricingCardProps> = ({
  sellerName,
  askingPrice,
  suggestedPrice,
}) => {
  const formatCurrency = (value: number | undefined): string => {
    if (value === undefined || value === null) return '';
    return `$${value.toLocaleString('en-US')}`;
  };

  const getInitials = (name: string | undefined): string => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-[#1a1d29] border-gray-700/50 p-5">
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-4 border-b border-gray-700/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-sm text-white">
              {getInitials(sellerName)}
            </div>
            <span className="text-gray-300">{sellerName || 'Seller'}'s</span>
          </div>
          {askingPrice && (
            <div className="text-green-400 text-xl font-bold">{formatCurrency(askingPrice)}</div>
          )}
        </div>
        <div>
          {suggestedPrice && (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-300 font-semibold">Suggested Report</span>
                <div className="text-blue-400 text-2xl font-bold">{formatCurrency(suggestedPrice)}</div>
              </div>
              <p className="text-xs text-gray-400 mb-4">
                Based on Condition Report, Factory Options, Distance by zip code, and aftermarket upgrades
              </p>
            </>
          )}
          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
            Accept Offer
          </Button>
        </div>
      </div>
    </div>
  );
};
