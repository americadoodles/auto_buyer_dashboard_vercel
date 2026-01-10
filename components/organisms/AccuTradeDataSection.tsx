'use client';

import React from 'react';
import { Button } from '../atoms/Button';
import { ExternalLink } from 'lucide-react';
import { FactoryOptionsDetailed } from './FactoryOptionsDetailed';

interface AccuTradeDataSectionProps {
  accuTradeData: any;
  vin?: string;
  hasAccuTradeData?: boolean;
}

export const AccuTradeDataSection: React.FC<AccuTradeDataSectionProps> = ({
  accuTradeData,
  vin,
  hasAccuTradeData,
}) => {
  if (!accuTradeData) return null;

  return (
    <div className="space-y-6">
      {/* AccuTrade View Details Button */}
      {vin && hasAccuTradeData && (
        <Button
          onClick={() => {
            const accuTradeUrl = `https://appraiser3.accu-trade.com/appraisal/new?vin=${encodeURIComponent(vin)}`;
            window.open(accuTradeUrl, '_blank');
          }}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center justify-center gap-2"
        >
          View Full AccuTrade Details
          <ExternalLink className="h-4 w-4" />
        </Button>
      )}
      
      {/* Factory Options */}
      {accuTradeData?.options && (
        <FactoryOptionsDetailed
          options={accuTradeData.options}
          total={accuTradeData.pricebar?.total || undefined}
        />
      )}
      {/* Price Bar */}
      {accuTradeData.pricebar && (
        <div className="flex flex-col gap-1 rounded-xl border bg-[#1a1d29] border-gray-700/50 px-5 py-2">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-white">Price Bar</h2>
          </div>
          <div className="space-y-1">
            {Object.entries(accuTradeData.pricebar).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <div className="text-sm text-gray-300">{key}</div>
                <div className="text-sm text-green-400 font-semibold">{String(value)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Local Market Listing */}
      {accuTradeData.local_market_listing && (
        <div className="bg-[#1a1d29] border border-gray-700/50 rounded-lg p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Local Market Listing</h2>
          <div className="local-market-most-recent-listing">
            <div className="content">
              {/* Heading Row */}
              <div className="heading-row mb-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="label-and-age flex items-center gap-2">
                      <div className="most-recent-listing text-sm font-medium text-gray-300">
                        Most Recent Listing:
                      </div>
                      {accuTradeData.local_market_listing.age && (
                        <div className="age">
                          <span className="property-box inline-block px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                            {String(accuTradeData.local_market_listing.age)}
                          </span>
                        </div>
                      )}
                    </div>
                    {accuTradeData.local_market_listing.dealershipName && (
                      <div className="dealer flex items-center gap-2">
                        <div className="dealership-name text-sm font-medium text-white">
                          {String(accuTradeData.local_market_listing.dealershipName)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Details Row */}
              <div className="details-row flex gap-4">
                {/* Photo */}
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

                {/* Details */}
                <div className="details flex-1 min-w-0">
                  {accuTradeData.local_market_listing.vehicleTitle && (
                    <div className="first-row text-base font-semibold text-white mb-1">
                      {String(accuTradeData.local_market_listing.vehicleTitle)}
                    </div>
                  )}
                  <div className="second-row text-sm text-gray-400 mb-2">
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
                    <div className="text text-sm font-medium text-white">
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
        </div>
      )}

      {/* Local Market Stats */}
      {accuTradeData.local_market_stats && (
        <div className="bg-[#1a1d29] border border-gray-700/50 rounded-lg p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Local Market Stats</h2>
          <div className="local-market-stats grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(() => {
              // Define the order of fields
              const orderedKeys = [
                'Median Price',
                'Median Odometer',
                'Median DOM',
                'Market Day Supply'
              ];
              
              // Get all available keys from data, preserving order
              const stats = orderedKeys
                .filter(key => accuTradeData.local_market_stats.hasOwnProperty(key))
                .map(key => [key, accuTradeData.local_market_stats[key]]);
              
              // Add any remaining keys that weren't in the ordered list
              Object.entries(accuTradeData.local_market_stats).forEach(([key, value]) => {
                if (!orderedKeys.includes(key)) {
                  stats.push([key, value]);
                }
              });
              
              return stats.map(([key, value]) => {
                const formatValue = (val: any) => {
                  if (!val && val !== 0) return 'N/A';
                  
                  // Check if it's a price field
                  const isPrice = key.toLowerCase().includes('price');
                  
                  // Try to parse as number
                  const numValue = typeof val === 'string' 
                    ? parseFloat(val.replace(/[^0-9.-]/g, '')) 
                    : Number(val);
                  
                  if (isNaN(numValue)) return String(val);
                  
                  // Format with commas
                  const formatted = numValue.toLocaleString('en-US');
                  
                  // Add $ prefix for prices
                  return isPrice ? `$${formatted}` : formatted;
                };
                
                return (
                  <div key={key} className="block">
                    <div className="wrapper">
                      <div className="label text-sm text-gray-400 mb-1">{key}</div>
                      <div className="value text-lg font-semibold text-white">
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
    </div>
  );
};
