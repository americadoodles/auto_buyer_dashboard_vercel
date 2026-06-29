'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ApiService } from '../../../../../lib/services/api';
import { Card } from '../../../../../components/molecules/Card';
import { Button } from '../../../../../components/atoms/Button';
import { ArrowLeft, ExternalLink, Loader2 } from 'lucide-react';
import { MMR_BASE_URL } from '../../../../../lib/constants/url';

export default function MMRDetailPage() {
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
        const result = await ApiService.getMMRData(vin);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load MMR data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [vin]);

  const handleOpenExternal = () => {
    const mmrUrl = `${MMR_BASE_URL}=${encodeURIComponent(vin)}`;
    window.open(mmrUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-claude-subtle" />
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
            <h1 className="text-2xl font-bold text-claude-ink dark:text-coal-100">MMR Data</h1>
            <p className="text-claude-muted dark:text-coal-400 mt-1">VIN: {vin}</p>
          </div>
          <Button onClick={handleOpenExternal}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Open MMR
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {data.features && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-claude-ink dark:text-coal-100 mb-4">Features</h2>
            <div className="flex flex-wrap gap-4">
              {Object.entries(data.features).map(([key, value]) => (
                <div key={key} className="flex-1 min-w-[180px] border border-claude-border dark:border-coal-700 rounded-lg p-4 bg-claude-cream dark:bg-coal-850/50">
                  <div className="flex flex-col">
                    <section className="mb-2">
                      <div className="text-sm font-medium text-claude-muted dark:text-coal-400">{key}</div>
                    </section>
                    <main>
                      <section className="mb-2">
                        <div className="text-2xl font-bold text-claude-ink dark:text-coal-100">{value ? String(value) : 'N/A'}</div>
                      </section>
                    </main>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {data.transactions && Array.isArray(data.transactions) && data.transactions.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-claude-ink dark:text-coal-100 mb-4">Transactions</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-claude-border dark:border-coal-700">
                    {Object.keys(data.transactions[0]).map((key) => {
                      // Capitalize first letter of each word
                      const formattedKey = key
                        .split(' ')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                        .join(' ');
                      return (
                        <th key={key} className="text-left py-2 px-4 text-sm font-semibold text-claude-text dark:text-coal-300">
                          {formattedKey}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.map((transaction: any, index: number) => (
                    <tr key={index} className="border-b border-claude-border dark:border-coal-700">
                      {Object.values(transaction).map((value: any, valIndex: number) => (
                        <td key={valIndex} className="py-2 px-4 text-sm text-claude-ink dark:text-coal-100">
                          {value ? String(value) : '--'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Historical Average */}
          {data.historical_average && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-claude-ink dark:text-coal-100 mb-4">Historical Average</h3>
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(data.historical_average).map(([key, value]: [string, any]) => {
                  const formatValue = (val: any) => {
                    if (!val) return '--';
                    if (typeof val === 'object' && val !== null) {
                      // If it's an object, show the value property
                      return val.value ? String(val.value) : '--';
                    }
                    return String(val);
                  };
                  
                  return (
                    <div key={key} className="container">
                      <span className="header block text-sm text-claude-muted dark:text-coal-400 mb-2">{key}</span>
                      <div className="value text-lg font-bold text-claude-ink dark:text-coal-100">
                        {formatValue(value)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Projected Average */}
          {data.projected_average && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-claude-ink dark:text-coal-100 mb-4">Projected Average</h3>
              <div className="grid grid-cols-1 gap-4">
                {Object.entries(data.projected_average).map(([key, value]) => (
                  <div key={key} className="container">
                    <span className="header block text-sm text-claude-muted dark:text-coal-400 mb-2">{key}</span>
                    <div className="value text-lg font-bold text-claude-ink dark:text-coal-100">
                      {value ? String(value) : '--'}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Estimated Retail */}
        {data.estimated_retail && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-claude-ink dark:text-coal-100 mb-1">
              Estimated Retail Value
              <div className="subHeading text-sm font-normal text-claude-muted dark:text-coal-400 mt-1">
                Based on Cox Automotive Retail Transactions
              </div>
            </h3>
            <div className="mt-4">
              <div className="retailDisplay">
                <div className="flex flex-col gap-4">
                  {data.estimated_retail.Retail && (
                    <div className="retail text-2xl font-bold text-claude-ink dark:text-coal-100 w-full">
                      {String(data.estimated_retail.Retail)}
                    </div>
                  )}
                  {data.estimated_retail['Typical Range'] && (
                    <div className="range w-full">
                      <div className="title text-sm font-medium text-claude-text dark:text-coal-300 mb-2">
                        Typical Range
                      </div>
                      <div>
                        {data.estimated_retail['Typical Range'].min && (
                          <span className="currency text-xl font-semibold text-claude-ink dark:text-coal-100">
                            {String(data.estimated_retail['Typical Range'].min)}
                          </span>
                        )}
                        {data.estimated_retail['Typical Range'].min && data.estimated_retail['Typical Range'].max && (
                          <span className="mx-2 text-claude-muted dark:text-coal-400">-</span>
                        )}
                        {data.estimated_retail['Typical Range'].max && (
                          <span className="currency text-xl font-semibold text-claude-ink dark:text-coal-100">
                            {String(data.estimated_retail['Typical Range'].max)}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
