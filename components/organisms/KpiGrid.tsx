import React from 'react';
import { KpiCard } from '../molecules/KpiCard';
import { TrendingUp, Clock, AlertTriangle, DollarSign, Car, Users } from 'lucide-react';
import { useListings } from '../../lib/hooks/useListings';
import { useKpiMetrics } from '../../lib/hooks/useKpiMetrics';

export const KpiGrid: React.FC = () => {
  const { data: listings, backendOk } = useListings();
  const metrics = useKpiMetrics(listings);

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

  // Show loading state when backend is not available or data is loading
  const isLoading = !backendOk || !listings;

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <KpiCard 
        label="Average Profit per Unit" 
        value={isLoading ? "..." : formatCurrency(metrics.averageProfitPerUnit)}
        icon={DollarSign}
        trend={null}
        trendUp={true}
        color="blue"
      />
      <KpiCard 
        label="Lead to Purchase Time" 
        value={isLoading ? "..." : formatDays(metrics.leadToPurchaseTime)}
        icon={Clock}
        trend={null}
        trendUp={false}
        color="green"
      />
      <KpiCard 
        label="Aged Inventory" 
        value={isLoading ? "..." : `${metrics.agedInventory} units`}
        icon={AlertTriangle}
        trend={null}
        trendUp={false}
        color="amber"
      />
      <KpiCard 
        label="Total Listings" 
        value={isLoading ? "..." : metrics.totalListings.toString()}
        icon={Car}
        trend={null}
        trendUp={true}
        color="purple"
      />
      <KpiCard 
        label="Active Buyers" 
        value={isLoading ? "..." : metrics.activeBuyers.toString()}
        icon={Users}
        trend={null}
        trendUp={true}
        color="indigo"
      />
      <KpiCard 
        label="Conversion Rate" 
        value={isLoading ? "..." : formatPercentage(metrics.conversionRate)}
        icon={TrendingUp}
        trend={null}
        trendUp={true}
        color="emerald"
      />
    </div>
  );
};
