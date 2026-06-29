'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, X, ExternalLink, ChevronRight } from 'lucide-react';
import { Icon } from '../atoms/Icon';

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
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const PANEL_ANIMATION_MS = 300;
  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsPanelOpen(false);
      setIsClosing(false);
    }, PANEL_ANIMATION_MS);
  };

  // Handle Escape key to close panel
  useEffect(() => {
    if (!isPanelOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose();
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isPanelOpen]);

  const handleMMRClick = (e: React.MouseEvent) => {
    e.stopPropagation();
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

  // Extract Adjusted MMR from features
  const adjustedMMR = mmrData?.features?.['Adjust MMR'] || mmrData?.features?.['Adjusted MMR'] || undefined;
  const displayValue = adjustedMMR !== undefined ? adjustedMMR : mmrValue;

  return (
    <>
      {/* Clickable Title Card */}
      <div 
        className="bg-claude-surface dark:bg-[#1a1d29] rounded-lg shadow-sm border border-claude-border dark:border-coal-700/50 px-6 py-2 cursor-pointer hover:bg-claude-cream dark:hover:bg-coal-850/50 transition-colors"
        onClick={() => setIsPanelOpen(true)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon
              name="mmr"
              size={24}
              className="opacity-80"
            />
            <span className="text-lg font-bold text-black dark:text-coal-100">
              Manheim Market Report
            </span>
          </div>
          <div className="flex items-center gap-2">
            {displayValue && (
              <span className="text-green-600 dark:text-green-400 font-bold">
                {formatCurrency(displayValue)}
              </span>
            )}
            <ChevronRight className="w-5 h-5 text-claude-subtle" />
          </div>
        </div>
      </div>

      {/* Slide-in Panel from Right */}
      {isPanelOpen && (
        <>
          {/* Backdrop */}
          <div 
            className={`fixed inset-0 bg-black/50 z-40 ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}
            onClick={handleClose}
          />
          
          {/* Panel */}
          <div className={`fixed top-0 right-0 h-full w-[30%] min-w-[320px] bg-claude-surface dark:bg-[#1a1d29] shadow-xl z-50 overflow-y-auto ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}>
            {/* Panel Header */}
            <div className="sticky top-0 bg-claude-surface dark:bg-[#1a1d29] border-b border-claude-border dark:border-coal-700/50 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon
                  name="mmr"
                  size={24}
                  className="opacity-80"
                />
                <span 
                  onClick={handleMMRClick}
                  className={`text-black dark:text-coal-100 font-semibold flex items-center gap-1.5 ${vin ? 'cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors' : ''}`}
                >
                  Manheim Market Report
                  {vin && <ExternalLink className="h-4 w-4" />}
                </span>
              </div>
              <button
                onClick={handleClose}
                className="text-claude-subtle hover:text-claude-muted dark:hover:text-coal-100 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Panel Content */}
            <div className="px-6 py-3 space-y-2">
              {/* MMR Value */}
              <div className="text-center py-1">
                {adjustedMMR !== undefined ? (
                  <div>
                    <div className="text-green-600 dark:text-green-400 text-3xl font-bold">
                      {formatCurrency(adjustedMMR)}
                    </div>
                    <div className="text-sm text-claude-subtle dark:text-coal-400">Adjusted MMR</div>
                  </div>
                ) : mmrValue ? (
                  <div>
                    <div className="text-green-600 dark:text-green-400 text-3xl font-bold">
                      {formatCurrency(mmrValue)}
                    </div>
                    <div className="text-sm text-claude-subtle dark:text-coal-400">MMR Value</div>
                  </div>
                ) : null}
              </div>

              {/* Features */}
              {mmrData?.features && typeof mmrData.features === 'object' && Object.keys(mmrData.features).length > 0 && (
                <div>
                  <div className="text-sm font-semibold text-black dark:text-coal-400 mb-1">Features</div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(mmrData.features)
                      .filter(([key]) => key !== 'Adjust MMR' && key !== 'Adjusted MMR')
                      .map(([key, value]) => (
                        <div key={key} className="flex-shrink-0 min-w-[140px] border border-claude-border dark:border-coal-700 rounded-lg p-2 bg-claude-cream dark:bg-coal-850/50">
                          <div className="flex flex-col">
                            <div className="text-xs font-medium text-black dark:text-coal-400 mb-0.5">{key}</div>
                            <div className="text-base font-bold text-black dark:text-coal-100">
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
                  <div className="text-sm font-semibold text-black dark:text-coal-400 mb-1">Historical Average</div>
                  <div className="space-y-0">
                    {historical30Days !== undefined && (
                      <div className="flex items-center justify-between py-1 border-b border-claude-border dark:border-coal-700/50">
                        <span className="text-black dark:text-coal-300 text-sm">Past 30 Days</span>
                        <div className="text-green-600 dark:text-green-400 font-semibold">{formatCurrency(historical30Days)}</div>
                      </div>
                    )}
                    {historical6Months !== undefined && (
                      <div className="flex items-center justify-between py-1 border-b border-claude-border dark:border-coal-700/50">
                        <span className="text-black dark:text-coal-300 text-sm">6 Months Ago</span>
                        <div className="text-green-600 dark:text-green-400 font-semibold">{formatCurrency(historical6Months)}</div>
                      </div>
                    )}
                    {historicalLastYear !== undefined && (
                      <div className="flex items-center justify-between py-1">
                        <span className="text-black dark:text-coal-300 text-sm">Last Year</span>
                        <div className="text-green-600 dark:text-green-400 font-semibold">{formatCurrency(historicalLastYear)}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Projected Average */}
              {mmrData?.projected_average && typeof mmrData.projected_average === 'object' && Object.keys(mmrData.projected_average).length > 0 && (
                <div>
                  <div className="text-sm font-semibold text-black dark:text-coal-400 mb-1">Projected Average</div>
                  {Object.entries(mmrData.projected_average).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between py-1">
                      <span className="text-sm text-black dark:text-coal-300">{key}</span>
                      <div className="text-base font-bold text-green-600 dark:text-green-400">
                        {value ? String(value) : '--'}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Estimated Retail */}
              {estimatedRetail !== undefined && (
                <div>
                  <div className="text-sm font-semibold text-black dark:text-coal-400 mb-1">Estimated Retail</div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm text-black dark:text-coal-300">Retail Value</span>
                    <span className="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(estimatedRetail)}</span>
                  </div>
                  {typicalRange && (
                    <div className="flex items-center justify-between py-1">
                      <span className="text-xs font-medium text-claude-subtle dark:text-coal-400">Typical Range</span>
                      <span className="text-sm text-green-600 dark:text-green-400">
                        {typicalRange.min && formatCurrency(typicalRange.min)}
                        {typicalRange.min && typicalRange.max && <span className="mx-1 text-claude-subtle">-</span>}
                        {typicalRange.max && formatCurrency(typicalRange.max)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Auction Values (fallback if no other data) */}
              {!mmrData?.features && !historical30Days && !estimatedRetail && (
                <div>
                  <div className="text-sm font-semibold text-black dark:text-coal-400 mb-1">Auction Values</div>
                  {above !== undefined && (
                    <div className="flex items-center justify-between py-1 border-b border-claude-border dark:border-coal-700/50">
                      <div className="flex items-center gap-2">
                        <span className="text-black dark:text-coal-300">Above</span>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </div>
                      <div className="text-right">
                        <div className="text-black dark:text-coal-100 font-semibold">{formatCurrency(above)}</div>
                      </div>
                    </div>
                  )}
                  {average !== undefined && (
                    <div className="flex items-center justify-between py-1 border-b border-claude-border dark:border-coal-700/50">
                      <div className="flex items-center gap-2">
                        <span className="text-black dark:text-coal-300">Average</span>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </div>
                      <div className="text-right">
                        <div className="text-black dark:text-coal-100 font-semibold">{formatCurrency(average)}</div>
                      </div>
                    </div>
                  )}
                  {below !== undefined && (
                    <div className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <span className="text-black dark:text-coal-300">Below</span>
                        <X className="h-4 w-4 text-claude-subtle" />
                      </div>
                      <div className="text-right">
                        <div className="text-black dark:text-coal-100 font-semibold">{formatCurrency(below)}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Animation styles */}
      <style jsx global>{`
        @keyframes slide-in-right { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes slide-out-right { from { transform: translateX(0); } to { transform: translateX(100%); } }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fade-out { from { opacity: 1; } to { opacity: 0; } }
        .animate-slide-in-right { animation: slide-in-right 0.3s ease-out forwards; }
        .animate-slide-out-right { animation: slide-out-right 0.3s ease-in forwards; }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
        .animate-fade-out { animation: fade-out 0.3s ease-in forwards; }
      `}</style>
    </>
  );
};
