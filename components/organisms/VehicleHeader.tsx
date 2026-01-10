'use client';

import React from 'react';
import { Badge } from '../atoms/Badge';
import { CheckCircle } from 'lucide-react';

interface VehicleHeaderProps {
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  miles?: number;
  vin?: string;
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
  hasAutoCheck,
  hasCarfax,
  hasMMR,
  hasAccuTrade,
}) => {
  const formatNumberWithCommas = (value: number | undefined): string => {
    if (value === undefined || value === null) return '';
    return value.toLocaleString('en-US');
  };

  return (
    <div className="bg-[#1a1d29] border border-gray-700/50 rounded-lg p-5">
      <div className="space-y-3">
        <h2 className={`text-xl ${(year && make && model) ? 'text-green-400' : 'text-gray-400'}`}>
          {year} {make} {model} {trim ? trim : ''}
        </h2>
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
        <div className="flex items-center gap-3 pt-2">
          <Badge className={`flex items-center gap-1 ${hasAutoCheck ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-gray-500/10 border-gray-500/30 text-gray-400'}`}>
            <CheckCircle className="h-3 w-3" />
            AutoCheck
          </Badge>
          <Badge className={`flex items-center gap-1 ${hasCarfax ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-gray-500/10 border-gray-500/30 text-gray-400'}`}>
            <CheckCircle className="h-3 w-3" />
            CARFAX
          </Badge>
          <Badge className={`flex items-center gap-1 ${hasMMR ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-gray-500/10 border-gray-500/30 text-gray-400'}`}>
            <CheckCircle className="h-3 w-3" />
            MMR
          </Badge>
          <Badge className={`flex items-center gap-1 ${hasAccuTrade ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-gray-500/10 border-gray-500/30 text-gray-400'}`}>
            <CheckCircle className="h-3 w-3" />
            AccuTrade
          </Badge>
        </div>
      </div>
    </div>
  );
};
