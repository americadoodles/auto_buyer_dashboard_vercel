'use client';

import React from 'react';
import { CRMDashboard } from '../../components/organisms/CRMDashboard';
import { useCrmDashboard } from '../../lib/hooks/useCrmDashboard';

export default function CRMPage() {
  const {
    stats,
    leadMetrics,
    recentActivities,
    highScoringVehicles,
    loading,
    error,
    refreshData
  } = useCrmDashboard();

  // Show loading state
  if (loading) {
    return (
      <div className="p-6 bg-claude-cream dark:bg-coal-900 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="p-6 bg-claude-cream dark:bg-coal-900 min-h-screen">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400 dark:text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                Error loading CRM dashboard
              </h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={refreshData}
                  className="bg-red-100 dark:bg-red-900/30 px-3 py-2 rounded-md text-sm font-medium text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-900/50"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Transform API data to match component props
  const transformedRecentActivities = recentActivities.map(activity => ({
    id: activity.id,
    type: activity.type,
    description: activity.description,
    timestamp: activity.activity_date,
    user: activity.user_name
  }));

  const leadConversionRate = leadMetrics?.conversion_rate || 0;

  return (
    <div className="p-6 bg-claude-cream dark:bg-coal-900">
      <CRMDashboard
          stats={stats || {
            total_leads: 0,
            qualified_leads: 0,
            total_contacts: 0,
            active_deals: 0,
            won_deals: 0,
            lost_deals: 0,
            total_revenue: 0,
            pending_tasks: 0,
            overdue_tasks: 0
          }}
          recentActivities={transformedRecentActivities}
          highScoringVehicles={highScoringVehicles}
          leadConversionRate={leadConversionRate}
        />
    </div>
  );
}

