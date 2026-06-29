'use client';

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import { ApexOptions } from 'apexcharts';
import { getDonutConfig } from './config/donut';

// Dynamically import ApexCharts to avoid SSR issues
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

export interface DonutChartProps {
  series: number[];
  labels?: string[];
  height?: string | number;
  width?: string | number;
  colors?: string[];
  showLegend?: boolean;
  showLabels?: boolean;
  customOptions?: Partial<ApexOptions>;
  className?: string;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  series,
  labels,
  height = 350,
  width = '100%',
  colors,
  showLegend = true,
  showLabels = true,
  customOptions,
  className = '',
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const options = useMemo(() => {
    const config = getDonutConfig({
      colors,
      labels,
      legend: {
        show: showLegend,
        labels: {
          colors: isDark ? '#f3f4f6' : undefined, // gray-100 for dark mode
        },
      },
      plotOptions: {
        pie: {
          donut: {
            labels: {
              show: showLabels,
              name: {
                color: isDark ? '#f9fafb' : undefined, // gray-50 for dark mode
              },
              value: {
                color: isDark ? '#ffffff' : undefined, // white for dark mode
              },
              total: {
                color: isDark ? '#e5e7eb' : undefined, // gray-200 for dark mode
              },
            },
          },
        },
      },
      tooltip: {
        theme: isDark ? 'dark' : 'light',
      },
      ...customOptions,
    });
    return config;
  }, [labels, colors, showLegend, showLabels, customOptions, isDark]);

  return (
    <div className={className}>
      <Chart
        type="donut"
        series={series}
        options={options}
        height={height}
        width={width}
      />
    </div>
  );
};

