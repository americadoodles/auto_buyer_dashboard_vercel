import { useState, useEffect } from 'react';
import { Listing } from '../types/listing';

interface TrendData {
  current: number;
  previous: number;
  trend: number; // percentage change
  trendUp: boolean;
}

interface KpiTrends {
  totalListings: TrendData;
  averagePrice: TrendData;
  conversionRate: TrendData;
  activeBuyers: TrendData;
  averageProfit: TrendData;
  agedInventory: TrendData;
  loading: boolean;
  error: string | null;
}

export const useKpiTrends = (listings: Listing[] = []) => {
  const [trends, setTrends] = useState<KpiTrends>({
    totalListings: { current: 0, previous: 0, trend: 0, trendUp: false },
    averagePrice: { current: 0, previous: 0, trend: 0, trendUp: false },
    conversionRate: { current: 0, previous: 0, trend: 0, trendUp: false },
    activeBuyers: { current: 0, previous: 0, trend: 0, trendUp: false },
    averageProfit: { current: 0, previous: 0, trend: 0, trendUp: false },
    agedInventory: { current: 0, previous: 0, trend: 0, trendUp: false },
    loading: true,
    error: null,
  });

  useEffect(() => {
    const calculateTrends = async () => {
      try {
        setTrends(prev => ({ ...prev, loading: true, error: null }));

        const baseUrl = (process.env.NEXT_PUBLIC_BACKEND_URL ?? '/api').replace(/\/+$/, '');
        
        // Calculate date ranges
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

        // Fetch historical data for trend calculation
        const [currentData, previousData] = await Promise.all([
          // Current period (last 30 days)
          fetch(`${baseUrl}/listings/?start_date=${thirtyDaysAgo.toISOString()}&end_date=${now.toISOString()}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth.token')}`,
            },
          }).then(res => res.ok ? res.json() : []),
          
          // Previous period (30-60 days ago)
          fetch(`${baseUrl}/listings/?start_date=${sixtyDaysAgo.toISOString()}&end_date=${thirtyDaysAgo.toISOString()}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth.token')}`,
            },
          }).then(res => res.ok ? res.json() : [])
        ]);

        const calculateTrend = (current: number, previous: number): { trend: number; trendUp: boolean } => {
          if (previous === 0) {
            return { trend: current > 0 ? 100 : 0, trendUp: current > 0 };
          }
          const change = ((current - previous) / previous) * 100;
          return { trend: Math.abs(change), trendUp: change > 0 };
        };

        // Calculate metrics for both periods
        const currentMetrics = calculateMetrics(currentData);
        const previousMetrics = calculateMetrics(previousData);

        setTrends({
          totalListings: {
            current: currentMetrics.totalListings,
            previous: previousMetrics.totalListings,
            ...calculateTrend(currentMetrics.totalListings, previousMetrics.totalListings)
          },
          averagePrice: {
            current: currentMetrics.averagePrice,
            previous: previousMetrics.averagePrice,
            ...calculateTrend(currentMetrics.averagePrice, previousMetrics.averagePrice)
          },
          conversionRate: {
            current: currentMetrics.conversionRate,
            previous: previousMetrics.conversionRate,
            ...calculateTrend(currentMetrics.conversionRate, previousMetrics.conversionRate)
          },
          activeBuyers: {
            current: currentMetrics.activeBuyers,
            previous: previousMetrics.activeBuyers,
            ...calculateTrend(currentMetrics.activeBuyers, previousMetrics.activeBuyers)
          },
          averageProfit: {
            current: currentMetrics.averageProfit,
            previous: previousMetrics.averageProfit,
            ...calculateTrend(currentMetrics.averageProfit, previousMetrics.averageProfit)
          },
          agedInventory: {
            current: currentMetrics.agedInventory,
            previous: previousMetrics.agedInventory,
            ...calculateTrend(currentMetrics.agedInventory, previousMetrics.agedInventory)
          },
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error('Error calculating trends:', error);
        setTrends(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to calculate trends',
        }));
      }
    };

    if (listings.length > 0) {
      calculateTrends();
    } else {
      setTrends(prev => ({ ...prev, loading: false }));
    }
  }, [listings]);

  return trends;
};

// Helper function to calculate metrics for a dataset
function calculateMetrics(data: Listing[]) {
  if (!data || data.length === 0) {
    return {
      totalListings: 0,
      averagePrice: 0,
      conversionRate: 0,
      activeBuyers: 0,
      averageProfit: 0,
      agedInventory: 0,
    };
  }

  const totalListings = data.length;
  const totalValue = data.reduce((sum, listing) => sum + (listing.price || 0), 0);
  const averagePrice = totalValue / totalListings;
  const averageProfit = averagePrice * 0.15; // 15% margin

  const uniqueBuyers = new Set(data.map(listing => listing.buyer_id)).size;
  
  const scoredListings = data.filter(listing => listing.score !== null && listing.score !== undefined);
  const conversionRate = (scoredListings.length / totalListings) * 100;

  // Aged inventory (listings older than 30 days from their creation)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const agedInventory = data.filter(listing => {
    if (!listing.created_at) return false;
    const listingDate = new Date(listing.created_at);
    return listingDate < thirtyDaysAgo;
  }).length;

  return {
    totalListings,
    averagePrice,
    conversionRate,
    activeBuyers: uniqueBuyers,
    averageProfit,
    agedInventory,
  };
}
