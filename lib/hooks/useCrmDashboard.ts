// Custom hook for CRM Dashboard data
import { useState, useEffect } from 'react';
import { crmApi, CRMStats, LeadConversionMetrics, SalesPerformanceMetrics, RecentActivity, UpcomingTask, DealForecast, HighScoringVehicle } from '../services/crmApi';

export const useCrmDashboard = () => {
  const [stats, setStats] = useState<CRMStats | null>(null);
  const [leadMetrics, setLeadMetrics] = useState<LeadConversionMetrics | null>(null);
  const [salesMetrics, setSalesMetrics] = useState<SalesPerformanceMetrics | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<UpcomingTask[]>([]);
  const [dealForecast, setDealForecast] = useState<DealForecast[]>([]);
  const [highScoringVehicles, setHighScoringVehicles] = useState<HighScoringVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all dashboard data in parallel
      const [
        statsData,
        leadMetricsData,
        salesMetricsData,
        activitiesData,
        tasksData,
        forecastData,
        vehiclesData
      ] = await Promise.all([
        crmApi.getDashboardStats(),
        crmApi.getLeadConversionMetrics(),
        crmApi.getSalesPerformanceMetrics(),
        crmApi.getRecentActivities(),
        crmApi.getUpcomingTasks(),
        crmApi.getDealForecast(),
        crmApi.getHighScoringVehicles()
      ]);

      setStats(statsData);
      setLeadMetrics(leadMetricsData);
      setSalesMetrics(salesMetricsData);
      setRecentActivities(activitiesData);
      setUpcomingTasks(tasksData);
      setDealForecast(forecastData);
      setHighScoringVehicles(vehiclesData);
    } catch (err) {
      console.error('Error fetching CRM dashboard data:', err);
      setError('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const refreshData = () => {
    fetchDashboardData();
  };

  return {
    stats,
    leadMetrics,
    salesMetrics,
    recentActivities,
    upcomingTasks,
    dealForecast,
    highScoringVehicles,
    loading,
    error,
    refreshData
  };
};
