'use client';

import React from 'react';
import { CheckCircle } from 'lucide-react';

interface FactoryOption {
  name?: string;
  option_name?: string;
  price?: number;
  value?: number;
  isFactoryUpgrade?: boolean;
}

interface FactoryOptionsDetailedProps {
  options?: FactoryOption[] | Record<string, any>;
  total?: number;
}

export const FactoryOptionsDetailed: React.FC<FactoryOptionsDetailedProps> = ({
  options = [],
  total,
}) => {
  const formatCurrency = (value: number | undefined): string => {
    if (value === undefined || value === null) return '';
    return `$${value.toLocaleString('en-US')}`;
  };

  // Process options - handle both array and object formats
  let processedOptions: FactoryOption[] = [];
  
  if (Array.isArray(options) && options.length > 0) {
    processedOptions = options.map(opt => ({
      name: opt.name || opt.option_name || '',
      price: opt.price || opt.value || 0,
      isFactoryUpgrade: opt.isFactoryUpgrade || false,
    }));
  } else if (options && typeof options === 'object' && !Array.isArray(options)) {
    // Handle object format from AccuTrade
    // AccuTrade options format: { "OPTION NAME": price_or_status, ... }
    processedOptions = Object.entries(options)
      .filter(([key]) => !key.startsWith('_')) // Skip internal fields like _total_options_price
      .map(([key, value]: [string, any]): FactoryOption => {
        let price = 0;
        // Handle different value formats
        if (typeof value === 'number') {
          price = value;
        } else if (typeof value === 'string') {
          // If value is "STD" or similar, it's standard (free)
          const upperValue = value.toUpperCase().trim();
          if (upperValue === 'STD' || upperValue === 'STANDARD' || value === '0' || value === '') {
            price = 0;
          } else {
            // Try to parse as number (remove $ and commas)
            const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''));
            price = isNaN(parsed) ? 0 : parsed;
          }
        } else if (value && typeof value === 'object') {
          price = value.price || value.value || 0;
        }
        
        return {
          name: key,
          price: price,
          isFactoryUpgrade: price > 0, // Factory upgrade if it has a price
        };
      });
  }
  
  // Default options if none provided
  const defaultOptions: FactoryOption[] = processedOptions.length > 0 ? processedOptions : [
    { name: 'Adaptive Cruise Control', price: 1625 },
    { name: '20" Kasuga Wheels', price: 1500, isFactoryUpgrade: true },
    { name: 'Meridian Surround Sound', price: 850 },
    { name: 'Front Massage Seats', price: 1300 },
    { name: 'Ventilated Front & Rear Seats', price: 1200 },
    { name: 'Rear Seat Package', price: 2000 },
    { name: 'Suede Cloth Headliner', price: 1020 },
    { name: 'Power Rear Sunshade', price: 500 },
    { name: 'Heated Wood & Leather Steering', price: 575 },
    { name: 'Illumination Package', price: 1700 },
  ];

  // Calculate total from options if not provided
  // First try to get _total_options_price from options object if it exists
  let optionsTotal = 0;
  if (options && typeof options === 'object' && !Array.isArray(options)) {
    const totalPriceKey = Object.keys(options).find(key => 
      key.toLowerCase().includes('total') && key.startsWith('_')
    );
    if (totalPriceKey) {
      const totalValue = options[totalPriceKey];
      if (typeof totalValue === 'number') {
        optionsTotal = totalValue;
      } else if (typeof totalValue === 'string') {
        const parsed = parseFloat(totalValue.replace(/[^0-9.-]/g, ''));
        optionsTotal = isNaN(parsed) ? 0 : parsed;
      }
    }
  }
  
  const calculatedTotal = total !== undefined 
    ? total 
    : (optionsTotal > 0
      ? optionsTotal
      : (processedOptions.length > 0 
        ? processedOptions.reduce((sum, opt) => sum + (opt.price ?? 0), 0)
        : defaultOptions.reduce((sum, opt) => sum + (opt.price ?? 0), 0)));

  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-[#1a1d29] border-gray-700/50 px-5 py-2">
      <div className="flex items-center justify-between ">
        <h3 className="text-white font-semibold">Factory Equipped Options</h3>
        <div className="text-green-400 text-lg font-bold">{formatCurrency(calculatedTotal)}</div>
      </div>
      <div className="space-y-1">
        {(processedOptions.length > 0 ? processedOptions : defaultOptions).map((option, index) => (
          <div key={index} className="flex items-start justify-between">
            <div className="flex items-start gap-2 flex-1">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-sm text-gray-300">{option.name}</div>
                {option.isFactoryUpgrade && (
                  <div className="text-xs text-gray-500">(Factory Upgrade)</div>
                )}
              </div>
            </div>
            <div className="text-sm text-gray-300 font-semibold">{formatCurrency(option.price)}</div>
          </div>
        ))}
        <div className="flex items-center justify-between pt-1 border-t border-gray-700/50">
          <span className="text-white font-semibold">TOTAL</span>
          <span className="text-green-400 text-lg font-bold">{formatCurrency(calculatedTotal)}</span>
        </div>
      </div>
    </div>
  );
};
