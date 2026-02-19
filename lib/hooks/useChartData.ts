import { useState, useEffect } from 'react';
import { TimeRange, getDateRangeFromTimeRange } from '../../components/charts/ChartTimeRangePicker';
import { ApiService } from '../services/api';
import { Listing } from '../types/listing';
import { isMarketplaceSource } from '../utils/marketplace';

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

const PURCHASE_STATUSES = new Set([
  'purchased',
  'bought',
  'closed',
  'won',
  'completed',
  'approved'
]);

const toDateKey = (value: Date): string => value.toISOString().split('T')[0];

const tryParseDate = (value?: string): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const buildDateKeys = (startDate: Date, endDate: Date): string[] => {
  const keys: string[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    keys.push(toDateKey(current));
    current.setDate(current.getDate() + 1);
  }
  return keys;
};

const getListingPurchaseStatus = (listing: Listing): boolean => {
  const status = listing.status || listing.decision?.status;
  if (!status) return false;
  return PURCHASE_STATUSES.has(status.toLowerCase());
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

        // Format dates for API calls
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        // Fetch real distribution data from API
        const [
          listings,
          sourcingActivities,
          carCategories,
          statesRegions,
          leadSourcePerformance,
          leadToPurchaseFunnel
        ] = await Promise.all([
          ApiService.getListings({ start_date: startDateStr, end_date: endDateStr }).catch(() => [] as Listing[]),
          ApiService.getChartDistribution('sourcing-activities').catch(() => ({ data: [], success: false })),
          ApiService.getChartDistribution('car-categories').catch(() => ({ data: [], success: false })),
          ApiService.getChartDistribution('states-regions').catch(() => ({ data: [], success: false })),
          ApiService.getChartDistribution('lead-source-performance').catch(() => ({ data: [], success: false })),
          ApiService.getChartTimeSeries('lead-to-purchase-funnel', startDateStr, endDateStr).catch(() => ({ data: [], success: false })),
        ]);

        const dateKeys = buildDateKeys(startDate, endDate);
        const buckets = new Map<string, {
          total: number;
          sumPrice: number;
          scored: number;
          buyers: Set<string>;
          purchased: number;
          domSum: number;
          domCount: number;
          aged: number;
          marketplaceCount: number;
        }>();

        dateKeys.forEach((key) => {
          buckets.set(key, {
            total: 0,
            sumPrice: 0,
            scored: 0,
            buyers: new Set<string>(),
            purchased: 0,
            domSum: 0,
            domCount: 0,
            aged: 0,
            marketplaceCount: 0,
          });
        });

        listings.forEach((listing) => {
          const createdAt = tryParseDate(listing.created_at);
          if (!createdAt) return;
          const key = toDateKey(createdAt);
          const bucket = buckets.get(key);
          if (!bucket) return;

          bucket.total += 1;
          bucket.sumPrice += Number(listing.price || 0);
          if (listing.score !== undefined && listing.score !== null) {
            bucket.scored += 1;
          }
          if (listing.buyer_id) {
            bucket.buyers.add(listing.buyer_id);
          }
          if (getListingPurchaseStatus(listing)) {
            bucket.purchased += 1;
          }
          if (isMarketplaceSource(listing.source)) {
            bucket.marketplaceCount += 1;
          }
          if (listing.dom !== undefined && listing.dom !== null) {
            bucket.domSum += Number(listing.dom);
            bucket.domCount += 1;
            if (Number(listing.dom) > 30) {
              bucket.aged += 1;
            }
          }
        });

        const leadToPurchaseMap = new Map<string, number>();
        (leadToPurchaseFunnel.data || []).forEach((point) => {
          if (point?.date) {
            leadToPurchaseMap.set(point.date, point.value);
          }
        });

        const profitOverTimeData: ChartDataPoint[] = dateKeys.map((date) => {
          const bucket = buckets.get(date)!;
          return {
            date,
            value: Math.round(bucket.sumPrice * 0.15),
          };
        });

        const weeklyListingsData: ChartDataPoint[] = dateKeys.map((date) => {
          const bucket = buckets.get(date)!;
          return {
            date,
            value: bucket.total,
          };
        });

        const buyerActivityData: ChartDataPoint[] = dateKeys.map((date) => {
          const bucket = buckets.get(date)!;
          return {
            date,
            value: bucket.marketplaceCount,
          };
        });

        const chartData: ChartData = {
          // Sparkline data (derived from listings)
          dailyActivities: dateKeys.map((date) => buckets.get(date)!.total),
          conversionRate: dateKeys.map((date) => {
            const bucket = buckets.get(date)!;
            if (bucket.total === 0) return 0;
            return Math.round((bucket.scored / bucket.total) * 1000) / 10;
          }),
          activeBuyersGrowth: dateKeys.map((date) => buckets.get(date)!.buyers.size),
          leadsToPurchases: dateKeys.map((date) => {
            const fromFunnel = leadToPurchaseMap.get(date);
            if (fromFunnel !== undefined) return fromFunnel;
            return buckets.get(date)!.purchased;
          }),
          averageProfitPerUnit: dateKeys.map((date) => {
            const bucket = buckets.get(date)!;
            if (bucket.total === 0) return 0;
            return Math.round(((bucket.sumPrice / bucket.total) * 0.15) * 100) / 100;
          }),
          leadToPurchaseTime: dateKeys.map((date) => {
            const bucket = buckets.get(date)!;
            if (bucket.domCount === 0) return 0;
            return Math.round((bucket.domSum / bucket.domCount) * 10) / 10;
          }),
          agedInventory: dateKeys.map((date) => buckets.get(date)!.aged),
          totalListings: dateKeys.map((date) => buckets.get(date)!.total),

          // Time-series data (based on time range)
          profitOverTime: profitOverTimeData,
          weeklyListingsVolume: weeklyListingsData,
          buyerActivityPerDay: buyerActivityData,
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

