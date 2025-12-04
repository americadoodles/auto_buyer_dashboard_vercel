"use client";

import React, { useState, useEffect, forwardRef } from 'react';
import Calendar, { Skeleton, type Props as ActivityCalendarProps, type ThemeInput } from 'react-activity-calendar';
import { Calendar as CalendarIcon, TrendingUp, Activity } from 'lucide-react';

interface ActivityData {
  date: string;
  count: number;
  level: number; // 0-4 for heatmap intensity
}

interface ActivityHeatmapProps {
  className?: string;
  data?: ActivityData[];
  title?: string;
  subtitle?: string;
  year?: number | 'last';
  loading?: boolean;
  error?: string | null;
  throwOnError?: boolean;
  errorMessage?: string;
}

// GitHub-style theme
const gitHubTheme: ThemeInput = {
  light: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
  dark: ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'],
};

// Transform data for react-activity-calendar
const transformData = (data: ActivityData[]) => {
  return data.map(item => ({
    date: item.date,
    count: item.count,
    level: item.level
  }));
};

const ActivityHeatmap = forwardRef<HTMLElement, ActivityHeatmapProps>(
  (
    {
      className = "",
      data = [],
      title = "Activity Heatmap",
      subtitle = "Historical usage patterns",
      year = 'last',
      loading = false,
      error = null,
      throwOnError = false,
      errorMessage = "Error loading activity data",
      ...props
    },
    ref
  ) => {
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [hoveredDate, setHoveredDate] = useState<string | null>(null);

    // Transform data for the calendar
    const transformedData = transformData(data);
    
    // Calculate statistics
    const totalActivities = data.reduce((sum, day) => sum + day.count, 0);
    const activeDays = data.filter(day => day.count > 0).length;
    const averagePerWeek = Math.round(totalActivities / 52);

    // Error handling
    if (error) {
      if (throwOnError) {
        throw new Error(error);
      } else {
        return (
          <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                  <CalendarIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
                  <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
                </div>
              </div>
            </div>
          </div>
        );
      }
    }

    // Loading state
    if (loading || !data.length) {
      return (
        <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <CalendarIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <Skeleton loading />
          </div>
        </div>
      );
    }

    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <CalendarIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className="p-4 sm:p-6">
          <div className="flex justify-center items-center overflow-x-auto">
            <div className="w-full max-w-6xl min-w-0">
              <div className="flex justify-center">
                <Calendar
                  ref={ref}
                  data={transformedData}
                  theme={gitHubTheme}
                  labels={{
                    totalCount: `{{count}} activities in ${year === 'last' ? 'the last year' : year}`,
                  }}
                  maxLevel={4}
                  blockSize={14}
                  blockMargin={3}
                  blockRadius={2}
                  fontSize={12}
                  weekStart={0} // Sunday
                  style={{
                    margin: '0 auto',
                    display: 'block',
                    width: '100%',
                    maxWidth: '100%'
                  }}
                  {...props}
                />
              </div>
            </div>
          </div>

          {/* Summary stats */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {totalActivities}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Total Activities</div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {averagePerWeek}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Avg per Week</div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {activeDays}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Active Days</div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ActivityHeatmap.displayName = 'ActivityHeatmap';

export default ActivityHeatmap;
