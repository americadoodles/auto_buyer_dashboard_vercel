'use client';

import React from 'react';
import { Card } from '../molecules/Card';
import { KpiCard } from '../molecules/KpiCard';
import { TableHeader } from '../molecules/TableHeader';
import { TableRow } from '../molecules/TableRow';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { SplineAreaChart, BarChart, ChartTimeRangePicker, TimeRange } from '../charts';
import { useChartData } from '../../lib/hooks/useChartData';

interface CRMStats {
  total_leads: number;
  qualified_leads: number;
  total_contacts: number;
  active_deals: number;
  won_deals: number;
  lost_deals: number;
  total_revenue: number;
  pending_tasks: number;
  overdue_tasks: number;
}

interface RecentActivity {
  id: string;
  type: 'lead' | 'contact' | 'deal' | 'task';
  description: string;
  user: string;
  timestamp: string;
}

interface HighScoringVehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  trim: string;
  score: number;
  price: number;
  miles: number;
  location: string;
}

interface CRMDashboardProps {
  stats: CRMStats;
  recentActivities: RecentActivity[];
  highScoringVehicles: HighScoringVehicle[];
  leadConversionRate: number;
}

export const CRMDashboard: React.FC<CRMDashboardProps> = ({
  stats,
  recentActivities,
  highScoringVehicles,
  leadConversionRate
}) => {
  const [timeRange, setTimeRange] = React.useState<TimeRange>('1w');
  const { data: chartData, loading: chartLoading } = useChartData(timeRange);
  const kpiData: Array<{
    title: string;
    value: string | number;
    change: string;
    trend: string;
    color: 'blue' | 'green' | 'amber' | 'purple' | 'indigo' | 'emerald' | 'red';
  }> = [
    {
      title: 'Total Leads',
      value: stats.total_leads,
      change: '+12%',
      trend: 'up',
      color: 'blue'
    },
    {
      title: 'Qualified Leads',
      value: stats.qualified_leads,
      change: '+8%',
      trend: 'up',
      color: 'green'
    },
    {
      title: 'Active Deals',
      value: stats.active_deals,
      change: '+5%',
      trend: 'up',
      color: 'purple'
    },
    {
      title: 'Revenue',
      value: `$${(stats.total_revenue / 1000000).toFixed(1)}M`,
      change: '+15%',
      trend: 'up',
      color: 'green'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">CRM Dashboard</h1>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Icon name="download" className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Icon name="settings" className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiData.map((kpi, index) => {
          // Map KPI cards to sparkline data
          let sparklineData: number[] | undefined;
          let sparklineColor: string | undefined;
          
          if (kpi.title === 'Total Leads' && chartData?.dailyActivities) {
            sparklineData = chartData.dailyActivities;
            sparklineColor = '#3b82f6';
          } else if (kpi.title === 'Qualified Leads' && chartData?.leadsToPurchases) {
            sparklineData = chartData.leadsToPurchases;
            sparklineColor = '#10b981';
          } else if (kpi.title === 'Active Deals' && chartData?.activeBuyersGrowth) {
            sparklineData = chartData.activeBuyersGrowth;
            sparklineColor = '#8b5cf6';
          } else if (kpi.title === 'Revenue' && chartData?.profitOverTime) {
            sparklineData = chartData.profitOverTime.map(d => d.value / 1000); // Scale down for sparkline
            sparklineColor = '#10b981';
          }

          return (
            <KpiCard
              key={index}
              label={kpi.title}
              value={kpi.value}
              change={kpi.change}
              trend={kpi.trend}
              color={kpi.color}
              sparklineData={sparklineData}
              sparklineColor={sparklineColor}
            />
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Analytics</h2>
          <ChartTimeRangePicker value={timeRange} onChange={setTimeRange} />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead → Purchase Funnel</h3>
          {chartLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : chartData?.leadToPurchaseFunnel ? (
            <SplineAreaChart
              series={[{
                name: 'Conversions',
                data: chartData.leadToPurchaseFunnel.map(d => d.value)
              }]}
              categories={chartData.leadToPurchaseFunnel.map(d => {
                const date = new Date(d.date);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              })}
              height={300}
              colors={['#3b82f6']}
            />
          ) : null}
        </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Source Performance</h3>
          {chartLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : chartData?.leadSourcePerformance ? (
            <BarChart
              series={[{
                name: 'Leads',
                data: chartData.leadSourcePerformance.map(item => item.value)
              }]}
              categories={chartData.leadSourcePerformance.map(item => item.name)}
              height={300}
              colors={['#10b981']}
            />
            ) : null}
          </Card>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Recent Activities</h2>
            <Button variant="ghost" size="sm">
              View All
            </Button>
          </div>
          <div className="space-y-3">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    activity.type === 'lead' ? 'bg-blue-100 text-blue-600' :
                    activity.type === 'contact' ? 'bg-green-100 text-green-600' :
                    activity.type === 'deal' ? 'bg-purple-100 text-purple-600' :
                    'bg-orange-100 text-orange-600'
                  }`}>
                    <Icon name={
                      activity.type === 'lead' ? 'users' :
                      activity.type === 'contact' ? 'user' :
                      activity.type === 'deal' ? 'briefcase' :
                      'check-circle'
                    } className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{activity.description}</p>
                  <p className="text-xs text-gray-500">
                    {activity.user} • {activity.timestamp}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Lead Pipeline */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Lead Pipeline</h2>
            <Button variant="ghost" size="sm">
              View All
            </Button>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">New</span>
              <span className="font-medium">45</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: '45%' }}></div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Contacted</span>
              <span className="font-medium">23</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full" style={{ width: '23%' }}></div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Qualified</span>
              <span className="font-medium">12</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '12%' }}></div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Converted</span>
              <span className="font-medium">8</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full" style={{ width: '8%' }}></div>
            </div>
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Conversion Rate:</span> {leadConversionRate}%
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* High-Scoring Vehicles */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">High-Scoring Vehicles</h2>
          <Button variant="ghost" size="sm">
            View All
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <TableHeader
              columns={[
                { key: 'vehicle', label: 'Vehicle', sortable: true },
                { key: 'score', label: 'Score', sortable: true },
                { key: 'price', label: 'Price', sortable: true },
                { key: 'miles', label: 'Miles', sortable: true },
                { key: 'location', label: 'Location', sortable: true },
                { key: 'actions', label: 'Actions', sortable: false }
              ]}
            />
            <tbody className="bg-white divide-y divide-gray-200">
              {highScoringVehicles.map((vehicle) => (
                <TableRow key={vehicle.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge
                      color={vehicle.score >= 90 ? 'green' : vehicle.score >= 80 ? 'blue' : 'yellow'}
                    >
                      {vehicle.score}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${vehicle.price.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {vehicle.miles.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {vehicle.location}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Icon name="plus" className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </TableRow>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
