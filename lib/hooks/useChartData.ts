import { useState, useEffect } from 'react';
import { TimeRange, getDateRangeFromTimeRange } from '../../components/charts/ChartTimeRangePicker';
import { ApiService } from '../services/api';

interface ChartDataPoint {
  date: string;
  value: number;
}

interface ChartData {
  dailyActivities: number[];
  conversionRate: number[];
  activeBuyersGrowth: number[];
  leadsToPurchases: number[];
  averageProfitPerUnit: number[];
  leadToPurchaseTime: number[];
  agedInventory: number[];
  totalListings: number[];
  profitOverTime: ChartDataPoint[];
  weeklyListingsVolume: ChartDataPoint[];
  buyerActivityPerDay: ChartDataPoint[];
  leadToPurchaseFunnel: ChartDataPoint[];
  sourcingActivitiesPerAgent: { name: string; value: number }[];
  leadSourcePerformance: { name: string; value: number }[];
  carCategoriesPerformance: { name: string; value: number }[];
  statesRegions: { name: string; value: number }[];
}

// Generate mock data for charts (returns integers only)
const generateMockTimeSeries = (days: number, baseValue: number, variance: number = 0.2): number[] => {
  return Array.from({ length: days }, (_, i) => {
    const trend = Math.sin((i / days) * Math.PI * 2) * variance;
    const random = (Math.random() - 0.5) * variance;
    return Math.round(Math.max(0, baseValue * (1 + trend + random)));
  });
};

const generateMockDataPoints = (startDate: Date, endDate: Date, baseValue: number, variance: number = 0.2): ChartDataPoint[] => {
  const dates: string[] = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    dates.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates.map((date, i) => {
    const trend = Math.sin((i / dates.length) * Math.PI * 2) * variance;
    const random = (Math.random() - 0.5) * variance;
    return {
      date,
      value: Math.round(Math.max(0, baseValue * (1 + trend + random))),
    };
  });
};

export const useChartData = (timeRange: TimeRange = '1w') => {
  const [data, setData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Normalize timeRange to ensure it always has a value
  const normalizedTimeRange = timeRange || '1w';

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        setLoading(true);
        setError(null);

        const { startDate, endDate } = getDateRangeFromTimeRange(normalizedTimeRange);
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const days = Math.max(7, daysDiff); // Minimum 7 days

        // Format dates for API calls
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        // Fetch real distribution data from API
        const [
          sourcingActivities,
          carCategories,
          statesRegions,
          leadSourcePerformance,
          leadToPurchaseFunnel
        ] = await Promise.all([
          ApiService.getChartDistribution('sourcing-activities').catch(() => ({ data: [], success: false })),
          ApiService.getChartDistribution('car-categories').catch(() => ({ data: [], success: false })),
          ApiService.getChartDistribution('states-regions').catch(() => ({ data: [], success: false })),
          ApiService.getChartDistribution('lead-source-performance').catch(() => ({ data: [], success: false })),
          ApiService.getChartTimeSeries('lead-to-purchase-funnel', startDateStr, endDateStr).catch(() => ({ data: [], success: false })),
        ]);

        // Generate mock data for time-series (TODO: Replace with actual API calls)
        const profitOverTimeData = generateMockDataPoints(startDate, endDate, 50000, 0.25);
        const weeklyListingsData = generateMockDataPoints(startDate, endDate, 120, 0.3);
        
        const chartData: ChartData = {
          // Sparkline data (based on time range)
          dailyActivities: generateMockTimeSeries(days, 45, 0.3),
          conversionRate: generateMockTimeSeries(days, 12, 0.15).map(v => Math.min(100, Math.round(v))),
          activeBuyersGrowth: generateMockTimeSeries(days, 25, 0.25),
          leadsToPurchases: generateMockTimeSeries(days, 8, 0.3),
          averageProfitPerUnit: profitOverTimeData.map(d => Math.round(d.value)),
          leadToPurchaseTime: generateMockTimeSeries(days, 12, 0.2).map(v => Math.round(v * 10) / 10), // Days with decimal
          agedInventory: generateMockTimeSeries(days, 15, 0.3),
          totalListings: weeklyListingsData.map(d => Math.round(d.value)),

          // Time-series data (based on time range)
          profitOverTime: profitOverTimeData,
          weeklyListingsVolume: weeklyListingsData,
          buyerActivityPerDay: generateMockDataPoints(startDate, endDate, 35, 0.2),
          leadToPurchaseFunnel: leadToPurchaseFunnel.data || [],

          // Distribution data - from real API
          sourcingActivitiesPerAgent: sourcingActivities.data || [],
          leadSourcePerformance: leadSourcePerformance.data || [],
          carCategoriesPerformance: carCategories.data || [],
          statesRegions: statesRegions.data || [],
        };

        setData(chartData);
      } catch (err) {
        console.error('Error fetching chart data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch chart data');
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, [normalizedTimeRange]);

  return { data, loading, error };
};

