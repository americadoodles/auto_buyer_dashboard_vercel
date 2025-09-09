import { useState, useEffect } from 'react';

interface TrendData {
  current: number;
  previous: number;
  trend: number;
  trend_up: boolean;
}

interface TrendsApiResponse {
  total_listings: TrendData;
  average_price: TrendData;
  conversion_rate: TrendData;
  active_buyers: TrendData;
  average_profit: TrendData;
  aged_inventory: TrendData;
}

export const useTrendsApi = (daysBack: number = 30) => {
  const [trends, setTrends] = useState<TrendsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const baseUrl = (process.env.NEXT_PUBLIC_BACKEND_URL ?? '/api').replace(/\/+$/, '');
        const response = await fetch(`${baseUrl}/trends/?days_back=${daysBack}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch trends: ${response.status}`);
        }

        const data = await response.json();
        setTrends(data);
      } catch (error) {
        console.error('Error fetching trends:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch trends');
      } finally {
        setLoading(false);
      }
    };

    fetchTrends();
  }, [daysBack]);

  return { trends, loading, error };
};
