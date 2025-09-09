import React from 'react';
import { KpiCard } from '../molecules/KpiCard';
import { TrendingUp, Clock, AlertTriangle, DollarSign, Car, Users } from 'lucide-react';
import { useListings } from '../../lib/hooks/useListings';
import { useKpiMetrics } from '../../lib/hooks/useKpiMetrics';
import { useTrendsApi } from '../../lib/hooks/useTrendsApi';

export const KpiGrid: React.FC = () => {
  const { data: listings, backendOk } = useListings();
  const metrics = useKpiMetrics(listings);
  const { trends: trendsData, loading: trendsLoading, error: trendsError } = useTrendsApi(30);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDays = (days: number) => {
    return `${days.toFixed(1)} days`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const formatTrend = (trend: number) => {
    return `${trend.toFixed(1)}%`;
  };

  // Show loading state when backend is not available or data is loading
  const isLoading = !backendOk || !listings || trendsLoading;

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <KpiCard 
        label="Average Profit per Unit" 
        value={isLoading ? "..." : formatCurrency(metrics.averageProfitPerUnit)}
        icon={DollarSign}
        trend={isLoading || !trendsData ? undefined : formatTrend(trendsData.average_profit.trend)}
        trendUp={trendsData?.average_profit.trend_up}
        color="blue"
      />
      <KpiCard 
        label="Lead to Purchase Time" 
        value={isLoading ? "..." : formatDays(metrics.leadToPurchaseTime)}
        icon={Clock}
        trend={isLoading || !trendsData ? undefined : formatTrend(trendsData.total_listings.trend)}
        trendUp={!trendsData?.total_listings.trend_up} // Inverted: more listings = longer lead time
        color="green"
      />
      <KpiCard 
        label="Aged Inventory" 
        value={isLoading ? "..." : `${metrics.agedInventory} units`}
        icon={AlertTriangle}
        trend={isLoading || !trendsData ? undefined : formatTrend(trendsData.aged_inventory.trend)}
        trendUp={trendsData?.aged_inventory.trend_up}
        color="amber"
      />
      <KpiCard 
        label="Total Listings" 
        value={isLoading ? "..." : metrics.totalListings.toString()}
        icon={Car}
        trend={isLoading || !trendsData ? undefined : formatTrend(trendsData.total_listings.trend)}
        trendUp={trendsData?.total_listings.trend_up}
        color="purple"
      />
      <KpiCard 
        label="Active Buyers" 
        value={isLoading ? "..." : metrics.activeBuyers.toString()}
        icon={Users}
        trend={isLoading || !trendsData ? undefined : formatTrend(trendsData.active_buyers.trend)}
        trendUp={trendsData?.active_buyers.trend_up}
        color="indigo"
      />
      <KpiCard 
        label="Conversion Rate" 
        value={isLoading ? "..." : formatPercentage(metrics.conversionRate)}
        icon={TrendingUp}
        trend={isLoading || !trendsData ? undefined : formatTrend(trendsData.conversion_rate.trend)}
        trendUp={trendsData?.conversion_rate.trend_up}
        color="emerald"
      />
    </div>
  );
};
