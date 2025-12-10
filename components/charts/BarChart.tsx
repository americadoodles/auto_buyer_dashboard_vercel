'use client';

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import { ApexOptions } from 'apexcharts';
import { getBarConfig } from './config/bar';

// Dynamically import ApexCharts to avoid SSR issues
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

// Helper function to check if a string is a UUID
const isUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export interface BarChartProps {
  series: ApexOptions['series'];
  categories?: string[];
  height?: string | number;
  width?: string | number;
  colors?: string[];
  horizontal?: boolean;
  stacked?: boolean;
  customOptions?: Partial<ApexOptions>;
  className?: string;
}

export const BarChart: React.FC<BarChartProps> = ({
  series,
  categories,
  height = 350,
  width = '100%',
  colors,
  horizontal = false,
  stacked = false,
  customOptions,
  className = '',
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  // Process categories to replace UUIDs with "Deleted User"
  const processedCategories = useMemo(() => {
    if (!categories) return undefined;
    return categories.map(category => isUUID(category) ? 'Deleted User' : category);
  }, [categories]);
  
  const options = useMemo(() => {
    const config = getBarConfig({
      colors,
      chart: {
        stacked,
      },
      plotOptions: {
        bar: {
          horizontal,
        },
      },
      xaxis: processedCategories
        ? {
            categories: processedCategories,
            labels: {
              style: {
                colors: isDark ? '#e5e7eb' : undefined, // gray-200 for dark mode
              },
            },
            axisBorder: {
              color: isDark ? '#4b5563' : undefined, // gray-600 for dark mode
            },
            axisTicks: {
              color: isDark ? '#4b5563' : undefined, // gray-600 for dark mode
            },
          }
        : {
            labels: {
              style: {
                colors: isDark ? '#e5e7eb' : undefined,
              },
            },
            axisBorder: {
              color: isDark ? '#4b5563' : undefined,
            },
            axisTicks: {
              color: isDark ? '#4b5563' : undefined,
            },
          },
      yaxis: {
        labels: {
          style: {
            colors: isDark ? '#e5e7eb' : undefined, // gray-200 for dark mode
          },
        },
      },
      grid: {
        borderColor: isDark ? '#4b5563' : undefined, // gray-600 for dark mode
      },
      legend: {
        labels: {
          colors: isDark ? '#f3f4f6' : undefined, // gray-100 for dark mode
        },
      },
      tooltip: {
        theme: isDark ? 'dark' : 'light',
      },
      ...customOptions,
    });
    return config;
  }, [processedCategories, colors, horizontal, stacked, customOptions, isDark]);

  return (
    <div className={className}>
      <Chart
        type="bar"
        series={series}
        options={options}
        height={height}
        width={width}
      />
    </div>
  );
};

