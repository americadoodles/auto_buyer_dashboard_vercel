import React from 'react';
import { KpiCard } from '../molecules/KpiCard';
import { TrendingUp, Clock, AlertTriangle, DollarSign, Car, Users } from 'lucide-react';

export const KpiGrid: React.FC = () => {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <KpiCard 
        label="Average Profit per Unit" 
        value="$2,140" 
        icon={DollarSign}
        trend="+12.5%"
        trendUp={true}
        color="blue"
      />
      <KpiCard 
        label="Lead to Purchase Time" 
        value="3.2 days" 
        icon={Clock}
        trend="-8.3%"
        trendUp={false}
        color="green"
      />
      <KpiCard 
        label="Aged Inventory" 
        value="4 units" 
        icon={AlertTriangle}
        trend="+2.1%"
        trendUp={false}
        color="amber"
      />
      <KpiCard 
        label="Total Listings" 
        value="156" 
        icon={Car}
        trend="+5.7%"
        trendUp={true}
        color="purple"
      />
      <KpiCard 
        label="Active Buyers" 
        value="24" 
        icon={Users}
        trend="+3.2%"
        trendUp={true}
        color="indigo"
      />
      <KpiCard 
        label="Conversion Rate" 
        value="68.5%" 
        icon={TrendingUp}
        trend="+4.1%"
        trendUp={true}
        color="emerald"
      />
    </div>
  );
};
