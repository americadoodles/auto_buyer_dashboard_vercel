'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, X, ExternalLink } from 'lucide-react';

interface MMRCardProps {
  mmrValue?: number;
  average?: number;
  above?: number;
  below?: number;
  transactions?: number;
  similar?: number;
  period?: string;
  mmrData?: any; // Full MMR data object
  vin?: string; // VIN for navigation
}

export const MMRCard: React.FC<MMRCardProps> = ({
  mmrValue,
  average,
  above,
  below,
  transactions = 37,
  similar = 37,
  period = 'Last 30 days',
  mmrData,
  vin,
}) => {
  const router = useRouter();

  const handleMMRClick = () => {
    if (vin) {
      router.push(`/crm/leads/mmr/${encodeURIComponent(vin)}`);
    }
  };
  const formatCurrency = (value: number | undefined | string): string => {
    if (value === undefined || value === null || value === '') return '';
    const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value;
    if (isNaN(numValue)) return '';
    return `$${numValue.toLocaleString('en-US')}`;
  };

  // Extract values from MMR data structure
  const getHistoricalAverage = (key: string) => {
    if (!mmrData?.historical_average || typeof mmrData.historical_average !== 'object') return undefined;
    const value = mmrData.historical_average[key];
    if (typeof value === 'object' && value !== null && value.value) {
      return value.value;
    }
    return typeof value === 'number' ? value : undefined;
  };

  const getEstimatedRetail = () => {
    if (!mmrData?.estimated_retail) return undefined;
    if (typeof mmrData.estimated_retail === 'object') {
      return mmrData.estimated_retail.Retail || mmrData.estimated_retail.retail || mmrData.estimated_retail.average;
    }
    return typeof mmrData.estimated_retail === 'number' ? mmrData.estimated_retail : undefined;
  };

  const getTypicalRange = () => {
    if (!mmrData?.estimated_retail || typeof mmrData.estimated_retail !== 'object') return null;
    const range = mmrData.estimated_retail['Typical Range'] || mmrData.estimated_retail.typical_range;
    return range;
  };

  const transactionCount = Array.isArray(mmrData?.transactions) ? mmrData.transactions.length : transactions;
  const historical30Days = getHistoricalAverage('Past 30 Days') || getHistoricalAverage('past_30_days');
  const historical6Months = getHistoricalAverage('6 Months Ago') || getHistoricalAverage('6_months_ago');
  const historicalLastYear = getHistoricalAverage('Last Year') || getHistoricalAverage('last_year');
  const estimatedRetail = getEstimatedRetail();
  const typicalRange = getTypicalRange();

  return (
    <div className="flex flex-col gap-6 rounded-xl border bg-[#1a1d29] border-gray-700/50 p-5">
      <div className="flex items-center justify-between ">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">📊</span>
          <span 
            onClick={handleMMRClick}
            className={`text-white font-semibold flex items-center gap-1.5 ${vin ? 'cursor-pointer hover:text-blue-400 transition-colors' : ''}`}
          >
            Manheim Market Report
            {vin && <ExternalLink className="h-4 w-4" />}
          </span>
        </div>
        <div className="text-green-400 text-xl font-bold">
          {mmrValue ? formatCurrency(mmrValue) : ''}
        </div>
      </div>
      <div className="space-y-4">
        {/* Features */}
        {mmrData?.features && typeof mmrData.features === 'object' && Object.keys(mmrData.features).length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-white mb-3">Features</h2>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(mmrData.features).map(([key, value]) => (
                <div key={key} className="border border-gray-700 rounded-lg p-3 bg-gray-800/50">
                  <div className="flex flex-col">
                    <div className="text-xs font-medium text-gray-400 mb-1">{key}</div>
                    <div className="text-lg font-bold text-white">
                      {value ? (typeof value === 'number' ? formatCurrency(value) : String(value)) : 'N/A'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Historical Average */}
        {(historical30Days !== undefined || historical6Months !== undefined || historicalLastYear !== undefined) && (
          <div>
            <div className="text-sm text-gray-400 mb-2">Historical Average</div>
            <div className="space-y-2">
              {historical30Days !== undefined && (
                <div className="flex items-center justify-between py-2 border-b border-gray-700/50">
                  <span className="text-gray-300 text-sm">Past 30 Days</span>
                  <div className="text-white font-semibold">{formatCurrency(historical30Days)}</div>
                </div>
              )}
              {historical6Months !== undefined && (
                <div className="flex items-center justify-between py-2 border-b border-gray-700/50">
                  <span className="text-gray-300 text-sm">6 Months Ago</span>
                  <div className="text-white font-semibold">{formatCurrency(historical6Months)}</div>
                </div>
              )}
              {historicalLastYear !== undefined && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-300 text-sm">Last Year</span>
                  <div className="text-white font-semibold">{formatCurrency(historicalLastYear)}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Projected Average */}
        {mmrData?.projected_average && typeof mmrData.projected_average === 'object' && Object.keys(mmrData.projected_average).length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Projected Average</h3>
            <div className="space-y-2">
              {Object.entries(mmrData.projected_average).map(([key, value]) => (
                <div key={key} className="flex flex-col">
                  <span className="text-xs text-gray-400 mb-1">{key}</span>
                  <div className="text-base font-bold text-white">
                    {value ? String(value) : '--'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Estimated Retail */}
        {estimatedRetail !== undefined && (
          <div>
            <h3 className="text-sm font-semibold text-white mb-1">
              Estimated Retail Value
              <div className="text-xs font-normal text-gray-400 mt-1">
                Based on Cox Automotive Retail Transactions
              </div>
            </h3>
            <div className="mt-3">
              <div className="text-xl font-bold text-white mb-3">{formatCurrency(estimatedRetail)}</div>
              {typicalRange && (
                <div>
                  <div className="text-xs font-medium text-gray-400 mb-2">Typical Range</div>
                  <div className="text-sm text-gray-300">
                    {typicalRange.min && formatCurrency(typicalRange.min)}
                    {typicalRange.min && typicalRange.max && <span className="mx-2 text-gray-400">-</span>}
                    {typicalRange.max && formatCurrency(typicalRange.max)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Auction Values (fallback if no other data) */}
        {!mmrData?.features && !historical30Days && !estimatedRetail && (
          <div>
            <div className="text-sm text-gray-400 mb-2">Auction Values</div>
            {above !== undefined && (
              <div className="flex items-center justify-between py-2 border-b border-gray-700/50">
                <div className="flex items-center gap-2">
                  <span className="text-gray-300">Above</span>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
                <div className="text-right">
                  <div className="text-white">{formatCurrency(above)}</div>
                </div>
              </div>
            )}
            {average !== undefined && (
              <div className="flex items-center justify-between py-2 border-b border-gray-700/50">
                <div className="flex items-center gap-2">
                  <span className="text-gray-300">Average</span>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
                <div className="text-right">
                  <div className="text-white">{formatCurrency(average)}</div>
                </div>
              </div>
            )}
            {below !== undefined && (
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <span className="text-gray-300">Below</span>
                  <X className="h-4 w-4 text-gray-500" />
                </div>
                <div className="text-right">
                  <div className="text-white">{formatCurrency(below)}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
