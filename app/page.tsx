"use client";

import React from 'react';
import Link from 'next/link';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Car, 
  TrendingUp, 
  Activity,
  BarChart3,
  Settings,
  List
} from 'lucide-react';
import { useAuth } from './auth/useAuth';
import { useListings } from '../lib/hooks/useListings';
import { useAdminStats } from '../lib/hooks/useAdminStats';
import UserActivityCard from '../components/organisms/UserActivityCard';
import ActivityHeatmap from '../components/organisms/ActivityHeatmap';
import { useActivityHeatmap } from '../lib/hooks/useActivityHeatmap';
import { useChartData } from '../lib/hooks/useChartData';
import { SplineAreaChart, BarChart, ChartTimeRangePicker, TimeRange } from '../components/charts';
import { Card } from '../components/molecules/Card';

interface StatCard {
  title: string;
  value: string | number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

// Helper function to check if a string is a UUID
const isUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export default function Page() {
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === 'admin';
  const { data: listings, backendOk } = useListings();
  const { totalUsers, pendingRequests, activeRoles, totalListings, loading: statsLoading, error: statsError } = useAdminStats();
  const { data: heatmapData, loading: heatmapLoading, error: heatmapError } = useActivityHeatmap();
  const [timeRange, setTimeRange] = React.useState<TimeRange>('1w');
  const [listingsVolumeGranularity, setListingsVolumeGranularity] = React.useState<'daily' | 'weekly'>('weekly');
  const { data: chartData, loading: chartLoading } = useChartData(timeRange);
  const weeklyVolumeSeries = React.useMemo(() => {
    if (!chartData?.weeklyListingsVolume) {
      return { series: [], categories: [] as string[] };
    }

    if (listingsVolumeGranularity === 'daily') {
      return {
        series: chartData.weeklyListingsVolume.map(d => d.value),
        categories: chartData.weeklyListingsVolume.map(d => {
          const date = new Date(d.date);
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }),
      };
    }

    const buckets = new Map<string, { label: string; value: number; date: Date }>();
    chartData.weeklyListingsVolume.forEach((point) => {
      const date = new Date(point.date);
      const day = date.getDay();
      const diff = (day + 6) % 7; // Monday as week start
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - diff);
      weekStart.setHours(0, 0, 0, 0);
      const key = weekStart.toISOString().split('T')[0];
      const bucket = buckets.get(key);
      if (bucket) {
        bucket.value += point.value;
        return;
      }
      buckets.set(key, {
        value: point.value,
        date: weekStart,
        label: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      });
    });

    const ordered = Array.from(buckets.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
    let runningTotal = 0;
    const cumulative = ordered.map((item) => {
      runningTotal += item.value;
      return {
        ...item,
        value: runningTotal,
      };
    });
    return {
      series: cumulative.map(item => item.value),
      categories: cumulative.map(item => item.label),
    };
  }, [chartData?.weeklyListingsVolume, listingsVolumeGranularity]);
  // Dynamic stats based on real data
  const statCards: StatCard[] = [
    {
      title: 'Total Users',
      value: statsLoading ? '...' : totalUsers,
      description: 'Active registered users',
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      title: 'Pending Requests',
      value: statsLoading ? '...' : pendingRequests,
      description: 'Awaiting approval',
      icon: UserPlus,
      color: 'bg-yellow-500'
    },
    {
      title: 'Active Roles',
      value: statsLoading ? '...' : activeRoles,
      description: 'User role types',
      icon: Shield,
      color: 'bg-green-500'
    },
    {
      title: 'Total Listings',
      value: statsLoading ? '...' : totalListings,
      description: 'Vehicle listings',
      icon: Car,
      color: 'bg-purple-500'
    }
  ];

  const quickActions = [
    {
      title: 'Vehicle Listings',
      description: 'View and manage all vehicle listings',
      href: '/listings',
      icon: List,
      color: 'bg-green-100 text-green-700'
    },
    {
      title: 'Buyer Activity Monitor',
      description: 'Monitor individual buyer performance and listings',
      href: '/user-management',
      icon: Activity,
      color: 'bg-orange-100 text-orange-700'
    },
    {
      title: 'Review Signup Requests',
      description: 'Approve or decline new user registrations',
      href: '/user-management/signup-requests',
      icon: UserPlus,
      color: 'bg-blue-100 text-blue-700'
    },
    {
      title: 'Configure Roles',
      description: 'Set up user roles and permissions',
      href: '/user-management/roles',
      icon: Shield,
      color: 'bg-purple-100 text-purple-700'
    }
  ];

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto bg-claude-cream dark:bg-coal-900">
        {/* Header */}
        <div className="border-b border-claude-border dark:border-coal-700 pb-6">
          <h1 className="text-3xl font-bold text-claude-ink dark:text-coal-100">Dashboard</h1>
          <p className="text-claude-muted dark:text-coal-400 mt-2">
            Welcome back, {user?.email}. Manage your application from here.
          </p>
        </div>

        {/* Backend Status */}
        {backendOk === false && (
          <div className="rounded-xl border border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20 p-4 text-amber-900 dark:text-amber-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-400 dark:text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">
                  Backend not reachable. Some features may be limited.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Error */}
        {statsError && (
          <div className="rounded-xl border border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20 p-4 text-red-900 dark:text-red-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400 dark:text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">
                  {statsError}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid - Admin Only */}
        {/* Stats Grid - Admin Only */}
        {isAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <div key={index} className="bg-claude-surface dark:bg-coal-850 rounded-lg shadow-sm border border-claude-border dark:border-coal-700 p-6">
                  <div className="flex items-center">
                    <div className={`p-3 rounded-lg ${card.color}`}>
                      <Icon className="w-6 h-6 text-coal-100" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-claude-muted dark:text-coal-400">{card.title}</p>
                      <p className="text-2xl font-bold text-claude-ink dark:text-coal-100">{card.value}</p>
                    </div>
                  </div>
                  <p className="text-sm text-claude-subtle dark:text-coal-400 mt-2">{card.description}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick Actions - Admin Only */}
        {isAdmin && (
          <div className="bg-claude-surface dark:bg-coal-850 rounded-lg shadow-sm border border-claude-border dark:border-coal-700 p-6">
            <h2 className="text-xl font-semibold text-claude-ink dark:text-coal-100 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={index}
                    href={action.href}
                    className="group p-4 rounded-lg border border-claude-border dark:border-coal-700 bg-claude-surface dark:bg-coal-850 hover:border-claude-divider dark:hover:border-coal-600 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${action.color} dark:opacity-80`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-claude-ink dark:text-coal-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {action.title}
                        </h3>
                        <p className="text-sm text-claude-subtle dark:text-coal-400">{action.description}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Time-Series Charts (Spline Area) */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-claude-ink dark:text-coal-100">Analytics</h2>
            <ChartTimeRangePicker value={timeRange} onChange={setTimeRange} />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-claude-ink dark:text-coal-100 mb-4">Profit Over Time</h3>
            {chartLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : chartData?.profitOverTime ? (
              <SplineAreaChart
                series={[{
                  name: 'Profit',
                  data: chartData.profitOverTime.map(d => d.value)
                }]}
                categories={chartData.profitOverTime.map(d => {
                  const date = new Date(d.date);
                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                })}
                height={300}
                colors={['#3b82f6']}
              />
            ) : null}
          </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-claude-ink dark:text-coal-100">
                  {listingsVolumeGranularity === 'daily' ? 'Daily Listings Volume' : 'Weekly Listings Volume'}
                </h3>
                <label className="text-sm text-claude-subtle dark:text-coal-400">
                  <span className="sr-only">Listings volume granularity</span>
                  <select
                    value={listingsVolumeGranularity}
                    onChange={(event) => setListingsVolumeGranularity(event.target.value as 'daily' | 'weekly')}
                    className="rounded-md border border-claude-border bg-claude-surface px-2 py-1 text-sm text-claude-text shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-coal-700 dark:bg-coal-850 dark:text-coal-200 dark:focus:border-blue-400 dark:focus:ring-blue-500/30"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </label>
              </div>
            {chartLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : chartData?.weeklyListingsVolume ? (
              <SplineAreaChart
                series={[{
                  name: 'Listings',
                  data: weeklyVolumeSeries.series
                }]}
                categories={weeklyVolumeSeries.categories}
                height={300}
                colors={['#10b981']}
              />
            ) : null}
          </Card>

          </div>
        </div>

        {/* Distribution Charts (Bar) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-claude-ink dark:text-coal-100 mb-4">Sourcing Activities per Agent</h3>
            {chartLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : chartData?.sourcingActivitiesPerAgent ? (
              <BarChart
                series={[{
                  name: 'Activities',
                  data: chartData.sourcingActivitiesPerAgent.map(item => item.value)
                }]}
                categories={chartData.sourcingActivitiesPerAgent.map(item => 
                  isUUID(item.name) ? 'Deleted User' : item.name
                )}
                height={300}
                colors={['#3b82f6']}
              />
            ) : null}
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-claude-ink dark:text-coal-100 mb-4">Car Categories Performance</h3>
            {chartLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : chartData?.carCategoriesPerformance ? (
              <BarChart
                series={[{
                  name: 'Count',
                  data: chartData.carCategoriesPerformance.map(item => item.value)
                }]}
                categories={chartData.carCategoriesPerformance.map(item => item.name)}
                height={300}
                colors={['#10b981']}
              />
            ) : null}
          </Card>

          <Card className="p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold text-claude-ink dark:text-coal-100 mb-4">States/Regions Performance</h3>
            {chartLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : chartData?.statesRegions ? (
              <BarChart
                series={[{
                  name: 'Count',
                  data: chartData.statesRegions.map(item => item.value)
                }]}
                categories={chartData.statesRegions.map(item => item.name)}
                height={300}
                colors={['#8b5cf6']}
              />
            ) : null}
          </Card>
        </div>

        {/* Activity Heatmap */}
        <ActivityHeatmap 
          title="Historical Activity Heatmap"
          subtitle="Daily activity patterns over the last year"
          data={heatmapData.data}
          loading={heatmapLoading}
          error={heatmapError}
          year="last"
        />

        {/* User Activity Overview */}
        <UserActivityCard />

        {/* System Overview */}
        <div className="bg-claude-surface dark:bg-coal-850 rounded-lg shadow-sm border border-claude-border dark:border-coal-700 p-6">
          <h2 className="text-xl font-semibold text-claude-ink dark:text-coal-100 mb-4">System Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-claude-cream dark:bg-coal-700/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-claude-ink dark:text-coal-100">Backend Status</span>
                </div>
                <span className={`text-sm font-medium ${backendOk ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {backendOk ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-claude-cream dark:bg-coal-700/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-claude-ink dark:text-coal-100">Data Loading</span>
                </div>
                <span className={`text-sm font-medium ${statsLoading ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>
                  {statsLoading ? 'Loading...' : 'Ready'}
                </span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-claude-cream dark:bg-coal-700/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-sm text-claude-ink dark:text-coal-100">Listings Data</span>
                </div>
                <span className={`text-sm font-medium ${listings ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                  {listings ? `${listings.length} items` : 'Loading...'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-claude-cream dark:bg-coal-700/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                  <span className="text-sm text-claude-ink dark:text-coal-100">User Session</span>
                </div>
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  {user?.email || 'Not logged in'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}
