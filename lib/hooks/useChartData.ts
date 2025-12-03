import { useState, useEffect } from 'react';

interface ChartDataPoint {
  date: string;
  value: number;
}

interface ChartData {
  dailyActivities: number[];
  conversionRate: number[];
  activeBuyersGrowth: number[];
  leadsToPurchases: number[];
  profitOverTime: ChartDataPoint[];
  weeklyListingsVolume: ChartDataPoint[];
  buyerActivityPerDay: ChartDataPoint[];
  leadToPurchaseFunnel: ChartDataPoint[];
  sourcingActivitiesPerAgent: { name: string; value: number }[];
  leadSourcePerformance: { name: string; value: number }[];
  carCategoriesPerformance: { name: string; value: number }[];
  statesRegions: { name: string; value: number }[];
}

// Generate mock data for charts
const generateMockTimeSeries = (days: number, baseValue: number, variance: number = 0.2): number[] => {
  return Array.from({ length: days }, (_, i) => {
    const trend = Math.sin((i / days) * Math.PI * 2) * variance;
    const random = (Math.random() - 0.5) * variance;
    return Math.max(0, baseValue * (1 + trend + random));
  });
};

const generateMockDataPoints = (days: number, baseValue: number, variance: number = 0.2): ChartDataPoint[] => {
  const dates = Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - i - 1));
    return date.toISOString().split('T')[0];
  });

  return dates.map((date, i) => {
    const trend = Math.sin((i / days) * Math.PI * 2) * variance;
    const random = (Math.random() - 0.5) * variance;
    return {
      date,
      value: Math.max(0, baseValue * (1 + trend + random)),
    };
  });
};

export const useChartData = () => {
  const [data, setData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        setLoading(true);
        setError(null);

        // TODO: Replace with actual API calls
        // For now, generate mock data
        const chartData: ChartData = {
          // Sparkline data (last 30 days)
          dailyActivities: generateMockTimeSeries(30, 45, 0.3),
          conversionRate: generateMockTimeSeries(30, 12, 0.15).map(v => Math.min(100, v)),
          activeBuyersGrowth: generateMockTimeSeries(30, 25, 0.25),
          leadsToPurchases: generateMockTimeSeries(30, 8, 0.3),

          // Time-series data (last 90 days)
          profitOverTime: generateMockDataPoints(90, 50000, 0.25),
          weeklyListingsVolume: generateMockDataPoints(90, 120, 0.3),
          buyerActivityPerDay: generateMockDataPoints(90, 35, 0.2),
          leadToPurchaseFunnel: generateMockDataPoints(90, 15, 0.25),

          // Distribution data
          sourcingActivitiesPerAgent: [
            { name: 'John Doe', value: 145 },
            { name: 'Jane Smith', value: 132 },
            { name: 'Mike Johnson', value: 128 },
            { name: 'Sarah Williams', value: 115 },
            { name: 'Tom Brown', value: 98 },
          ],
          leadSourcePerformance: [
            { name: 'Website', value: 245 },
            { name: 'Referral', value: 189 },
            { name: 'Social Media', value: 156 },
            { name: 'Email Campaign', value: 134 },
            { name: 'Direct', value: 98 },
          ],
          carCategoriesPerformance: [
            { name: 'Sedan', value: 342 },
            { name: 'SUV', value: 298 },
            { name: 'Truck', value: 187 },
            { name: 'Coupe', value: 134 },
            { name: 'Convertible', value: 89 },
          ],
          statesRegions: [
            { name: 'California', value: 456 },
            { name: 'Texas', value: 389 },
            { name: 'Florida', value: 312 },
            { name: 'New York', value: 267 },
            { name: 'Arizona', value: 198 },
          ],
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
  }, []);

  return { data, loading, error };
};

