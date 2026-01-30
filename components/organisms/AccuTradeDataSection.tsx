'use client';

import React, { useState } from 'react';
import { Button } from '../atoms/Button';
import { ExternalLink, X } from 'lucide-react';
import { Icon } from '../atoms/Icon';
import { FactoryOptionsDetailed } from './FactoryOptionsDetailed';
import { PricingCard } from './PricingCard';
import { ConditionReportModal } from '../molecules/ConditionReport/ConditionReportModal';

interface AccuTradeDataSectionProps {
  accuTradeData: any;
  vin?: string;
  hasAccuTradeData?: boolean;
  sellerName?: string;
  askingPrice?: number;
  suggestedPrice?: number;
}

/** Renders the shared AccuTrade content (pricing, options, price bar, local market). */
function AccuTradeContent({
  accuTradeData,
  sellerName,
  askingPrice,
  suggestedPrice,
}: {
  accuTradeData: any;
  sellerName?: string;
  askingPrice?: number;
  suggestedPrice?: number;
}) {
  return (
    <>
          {/* Pricing (Seller's / Suggested Report) */}
          {(sellerName || askingPrice || suggestedPrice) && (
            <div className="pb-4 border-b border-slate-300 dark:border-slate-500">
              <PricingCard
                sellerName={sellerName}
                askingPrice={askingPrice}
                suggestedPrice={suggestedPrice}
                embedded
              />
            </div>
          )}
          {/* Factory Options */}
          {accuTradeData?.options && (
            <div className="pb-4 border-b border-slate-300 dark:border-slate-500">
              <FactoryOptionsDetailed
                options={accuTradeData.options}
                total={accuTradeData.pricebar?.total || undefined}
                embedded
              />
            </div>
          )}

          {/* Price Bar */}
          {accuTradeData?.pricebar && (
            <div className="flex flex-col gap-1 py-4 border-b border-slate-300 dark:border-slate-500">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg font-semibold text-black dark:text-white">Price Bar</h2>
              </div>
              <div className="space-y-1">
                {Object.entries(accuTradeData.pricebar).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="text-sm text-black dark:text-gray-300">{key}</div>
                    <div className="text-sm text-green-600 dark:text-green-400 font-semibold">{String(value)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Local Market Listing */}
          {accuTradeData?.local_market_listing && (
            <div className="local-market-most-recent-listing py-4 border-b border-slate-300 dark:border-slate-500">
              <h2 className="text-lg font-semibold text-black dark:text-white mb-3">Local Market Listing</h2>
              <div className="content">
                <div className="heading-row mb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="label-and-age flex items-center gap-2">
                        <div className="most-recent-listing text-sm font-medium text-black dark:text-gray-300">
                          Most Recent Listing:
                        </div>
                        {accuTradeData.local_market_listing.age && (
                          <div className="age">
                            <span className="property-box inline-block px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30">
                              {String(accuTradeData.local_market_listing.age)}
                            </span>
                          </div>
                        )}
                      </div>
                      {accuTradeData.local_market_listing.dealershipName && (
                        <div className="dealer flex items-center gap-2">
                          <div className="dealership-name text-sm font-medium text-black dark:text-white">
                            {String(accuTradeData.local_market_listing.dealershipName)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="details-row flex gap-4">
                  {accuTradeData.local_market_listing.photoUrl && (
                    <div className="photo flex-shrink-0">
                      <div
                        className="grid-photo rounded overflow-hidden"
                        style={{ width: '132px', height: '96px' }}
                      >
                        <div
                          className="image bg-cover bg-center rounded"
                          style={{
                            width: '132px',
                            height: '96px',
                            backgroundImage: `url("${String(accuTradeData.local_market_listing.photoUrl)}"), url("/assets/images/car-placeholder.png")`
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="details flex-1 min-w-0">
                    {accuTradeData.local_market_listing.vehicleTitle && (
                      <div className="first-row text-base font-semibold text-black dark:text-white mb-1">
                        {String(accuTradeData.local_market_listing.vehicleTitle)}
                      </div>
                    )}
                    <div className="second-row text-sm text-black dark:text-gray-400 mb-2">
                      {accuTradeData.local_market_listing.vin && (
                        <span>{String(accuTradeData.local_market_listing.vin)}</span>
                      )}
                      {accuTradeData.local_market_listing.miles && (
                        <>
                          {accuTradeData.local_market_listing.vin && <span>  |  </span>}
                          <span>{String(accuTradeData.local_market_listing.miles).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} MI</span>
                        </>
                      )}
                    </div>
                    <div className="third-row flex items-center justify-between flex-wrap gap-2">
                      <div className="text text-sm font-medium text-black dark:text-white">
                        {accuTradeData.local_market_listing.price && (
                          <span>{String(accuTradeData.local_market_listing.price)}</span>
                        )}
                        {accuTradeData.local_market_listing.dom && (
                          <>
                            {accuTradeData.local_market_listing.price && <span>  |  </span>}
                            <span>DOM: {String(accuTradeData.local_market_listing.dom)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Local Market Stats */}
          {accuTradeData?.local_market_stats && (
            <div className="local-market-stats pt-4">
              <h2 className="text-lg font-semibold text-black dark:text-white mb-3">Local Market Stats</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {(() => {
                  const orderedKeys = [
                    'Median Price',
                    'Median Odometer',
                    'Median DOM',
                    'Market Day Supply'
                  ];
                  const stats = orderedKeys
                    .filter(key => accuTradeData.local_market_stats.hasOwnProperty(key))
                    .map(key => [key, accuTradeData.local_market_stats[key]]);
                  Object.entries(accuTradeData.local_market_stats).forEach(([key, value]) => {
                    if (!orderedKeys.includes(key)) {
                      stats.push([key, value]);
                    }
                  });
                  return stats.map(([key, value]) => {
                    const formatValue = (val: any) => {
                      if (!val && val !== 0) return 'N/A';
                      const isPrice = key.toLowerCase().includes('price');
                      const numValue = typeof val === 'string'
                        ? parseFloat(val.replace(/[^0-9.-]/g, ''))
                        : Number(val);
                      if (isNaN(numValue)) return String(val);
                      const formatted = numValue.toLocaleString('en-US');
                      return isPrice ? `$${formatted}` : formatted;
                    };
                    return (
                      <div key={key} className="block">
                        <div className="wrapper">
                          <div className="label text-sm text-black dark:text-gray-400 mb-1">{key}</div>
                          <div className="value text-lg font-semibold text-black dark:text-white">
                            {formatValue(value)}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}
    </>
  );
}

export const AccuTradeDataSection: React.FC<AccuTradeDataSectionProps> = ({
  accuTradeData,
  vin,
  hasAccuTradeData,
  sellerName,
  askingPrice,
  suggestedPrice,
}) => {
  const [isConditionReportModalOpen, setIsConditionReportModalOpen] = useState(false);
  const [isAccuTradeContentModalOpen, setIsAccuTradeContentModalOpen] = useState(false);
  const [isAccuTradePanelClosing, setIsAccuTradePanelClosing] = useState(false);

  const handleCloseAccuTradePanel = () => {
    if (isAccuTradePanelClosing) return;
    setIsAccuTradePanelClosing(true);
    setTimeout(() => {
      setIsAccuTradeContentModalOpen(false);
      setIsAccuTradePanelClosing(false);
    }, 300);
  };

  React.useEffect(() => {
    if (!isAccuTradeContentModalOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCloseAccuTradePanel();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isAccuTradeContentModalOpen]);

  if (!accuTradeData) return null;

  const hasCardContent = accuTradeData?.options || accuTradeData?.pricebar || accuTradeData?.local_market_listing || accuTradeData?.local_market_stats || sellerName || askingPrice || suggestedPrice;

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      {/* AccuTrade actions: one component (View Full Details + View Condition Report) */}
      {vin && hasAccuTradeData && (
        <div className="flex flex-col gap-2 flex-shrink-0">
          <Button
            onClick={() => {
              const accuTradeUrl = `https://appraiser3.accu-trade.com/appraisal/new?vin=${encodeURIComponent(vin)}`;
              window.open(accuTradeUrl, '_blank');
            }}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <Icon
                name="accutrade"
                size={24}
                className="opacity-80 hover:opacity-100 transition-opacity rounded"
              />
              <span>View Full AccuTrade Details</span>
            </div>
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => setIsConditionReportModalOpen(true)}
            className="w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-black dark:text-white transition-colors flex items-center justify-center gap-2"
          >
            <span>View Condition Report</span>
          </Button>
        </div>
      )}

      {/* Single AccuTrade card: scrollable, visible scrollbar, click to open modal */}
      {hasCardContent && (
        <div className="flex-1 min-h-0 flex flex-col rounded-xl border bg-white dark:bg-[#1a1d29] border-gray-200 dark:border-gray-700/50 overflow-hidden">
          <div
            role="button"
            tabIndex={0}
            onClick={() => setIsAccuTradeContentModalOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsAccuTradeContentModalOpen(true);
              }
            }}
            className="flex-1 min-h-0 overflow-y-auto px-5 py-4 flex flex-col gap-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors rounded-b-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <AccuTradeContent
              accuTradeData={accuTradeData}
              sellerName={sellerName}
              askingPrice={askingPrice}
              suggestedPrice={suggestedPrice}
            />
          </div>
        </div>
      )}

      {/* AccuTrade full content panel (slide-in from right, same as VehicleDetails) */}
      {isAccuTradeContentModalOpen && (
        <>
          <div
            className={`fixed inset-0 bg-black/50 z-40 ${isAccuTradePanelClosing ? 'animate-fade-out' : 'animate-fade-in'}`}
            onClick={handleCloseAccuTradePanel}
          />
          <div
            className={`fixed top-0 right-0 h-full w-1/3 min-w-[320px] max-w-[500px] bg-white dark:bg-[#1a1d29] shadow-xl z-50 overflow-y-auto ${isAccuTradePanelClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}
          >
            <div className="sticky top-0 bg-white dark:bg-[#1a1d29] border-b border-gray-200 dark:border-gray-700/50 px-6 py-4 flex items-center justify-between">
              <h4 className="text-lg font-bold text-black dark:text-white">AccuTrade Data</h4>
              <button
                type="button"
                onClick={handleCloseAccuTradePanel}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
                aria-label="Close"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="px-6 py-4">
              <AccuTradeContent
                accuTradeData={accuTradeData}
                sellerName={sellerName}
                askingPrice={askingPrice}
                suggestedPrice={suggestedPrice}
              />
            </div>
          </div>
        </>
      )}

      {/* Panel animation styles (same as VehicleDetails / CompactCarfaxSection) */}
      <style jsx global>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes slide-out-right {
          from { transform: translateX(0); }
          to { transform: translateX(100%); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fade-out {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        .animate-slide-in-right { animation: slide-in-right 0.3s ease-out forwards; }
        .animate-slide-out-right { animation: slide-out-right 0.3s ease-in forwards; }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
        .animate-fade-out { animation: fade-out 0.3s ease-in forwards; }
      `}</style>

      {/* Condition Report Modal */}
      <ConditionReportModal
        isOpen={isConditionReportModalOpen}
        onClose={() => setIsConditionReportModalOpen(false)}
        vin={vin}
      />
    </div>
  );
};
