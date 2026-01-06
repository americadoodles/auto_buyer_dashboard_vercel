'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ApiService } from '../../../../../lib/services/api';
import { Card } from '../../../../../components/molecules/Card';
import { Button } from '../../../../../components/atoms/Button';
import { ArrowLeft, ExternalLink, Loader2 } from 'lucide-react';

export default function AccuTradeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const vin = params.vin as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!vin) return;
      
      setLoading(true);
      setError(null);
      try {
        const result = await ApiService.getAccuTradeData(vin);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load AccuTrade data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [vin]);

  const handleOpenExternal = () => {
    const accuTradeUrl = `https://appraiser3.accu-trade.com/appraisal/new?vin=${encodeURIComponent(vin)}`;
    window.open(accuTradeUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6">
          <div className="text-center">
            <p className="text-red-600 dark:text-red-400 mb-4">{error || 'Data not found'}</p>
            <Button onClick={() => router.back()}>Go Back</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AccuTrade Data</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">VIN: {vin}</p>
          </div>
          <Button onClick={handleOpenExternal}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Open AccuTrade
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {data.pricebar && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Price Bar</h2>
            <div className="flex flex-wrap gap-4">
              {Object.entries(data.pricebar).map(([key, value]) => (
                <div key={key} className="flex-1 min-w-[180px] border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex flex-col">
                    <section className="mb-2">
                      <div className="text-sm font-medium text-gray-600 dark:text-gray-400">{key}</div>
                    </section>
                    <main>
                      <section className="mb-2">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{String(value)}</div>
                      </section>
                    </main>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {data.options && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Options</h2>
            <div className="space-y-2">
              {Object.entries(data.options).map(([key, value]) => (
                <div key={key} className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
                  <span className="text-gray-700 dark:text-gray-300">{key}</span>
                  <span className="text-gray-900 dark:text-white font-medium">{String(value)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {data.local_market_listing && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Local Market Listing</h2>
            <div className="local-market-most-recent-listing">
              <div className="content">
                {/* Heading Row */}
                <div className="heading-row mb-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="label-and-age flex items-center gap-2">
                        <div className="most-recent-listing text-sm font-medium text-gray-700 dark:text-gray-300">
                          Most Recent Listing:
                        </div>
                        {data.local_market_listing.age && (
                          <div className="age">
                            <span className="property-box inline-block px-2 py-1 rounded text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                              {String(data.local_market_listing.age)}
                            </span>
                          </div>
                        )}
                      </div>
                      {data.local_market_listing.dealershipName && (
                        <div className="dealer flex items-center gap-2">
                          <div className="dealership-name text-sm font-medium text-gray-900 dark:text-white">
                            {String(data.local_market_listing.dealershipName)}
                          </div>
                          {data.local_market_listing.dealershipWebsite && (
                            <a
                              href={String(data.local_market_listing.dealershipWebsite)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="dealership-website text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                    {data.local_market_listing.viewDetailsLink && (
                      <div className="view-details-link">
                        <a
                          href={String(data.local_market_listing.viewDetailsLink)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          View Details
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Details Row */}
                <div className="details-row flex gap-4">
                  {/* Photo */}
                  {data.local_market_listing.photoUrl && (
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
                            backgroundImage: `url("${String(data.local_market_listing.photoUrl)}"), url("/assets/images/car-placeholder.png")`
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Details */}
                  <div className="details flex-1 min-w-0">
                    {data.local_market_listing.vehicleTitle && (
                      <div className="first-row text-base font-semibold text-gray-900 dark:text-white mb-1">
                        {String(data.local_market_listing.vehicleTitle)}
                      </div>
                    )}
                    <div className="second-row text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {data.local_market_listing.vin && (
                        <span>{String(data.local_market_listing.vin)}</span>
                      )}
                      {data.local_market_listing.miles && (
                        <>
                          {data.local_market_listing.vin && <span>  |  </span>}
                          <span>{String(data.local_market_listing.miles).toLocaleString()} MI</span>
                        </>
                      )}
                    </div>
                    <div className="third-row flex items-center justify-between flex-wrap gap-2">
                      <div className="text text-sm font-medium text-gray-900 dark:text-white">
                        {data.local_market_listing.price && (
                          <span>{String(data.local_market_listing.price)}</span>
                        )}
                        {data.local_market_listing.dom && (
                          <>
                            {data.local_market_listing.price && <span>  |  </span>}
                            <span>DOM: {String(data.local_market_listing.dom)}</span>
                          </>
                        )}
                      </div>
                      {data.local_market_listing.viewDetailsLink && (
                        <div className="view-details-link">
                          <a
                            href={String(data.local_market_listing.viewDetailsLink)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            View Details
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {data.local_market_stats && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Local Market Stats</h2>
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
                  .filter(key => data.local_market_stats.hasOwnProperty(key))
                  .map(key => [key, data.local_market_stats[key]]);
                
                // Add any remaining keys that weren't in the ordered list
                Object.entries(data.local_market_stats).forEach(([key, value]) => {
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
                        <div className="label text-sm text-gray-600 dark:text-gray-400 mb-1">{key}</div>
                        <div className="value text-lg font-semibold text-gray-900 dark:text-white">
                          {formatValue(value)}
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
