'use client';

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import { ApexOptions } from 'apexcharts';
import { getSplineAreaConfig } from './config/splineArea';

// Dynamically import ApexCharts to avoid SSR issues
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

export interface SplineAreaChartProps {
  series: ApexOptions['series'];
  categories?: string[];
  height?: string | number;
  width?: string | number;
  colors?: string[];
  customOptions?: Partial<ApexOptions>;
  className?: string;
}

export const SplineAreaChart: React.FC<SplineAreaChartProps> = ({
  series,
  categories,
  height = 350,
  width = '100%',
  colors,
  customOptions,
  className = '',
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const options = useMemo(() => {
    const config = getSplineAreaConfig({
      colors,
      xaxis: categories
        ? {
            categories,
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
  }, [categories, colors, customOptions, isDark]);

  return (
    <div className={className}>
      <Chart
        type="area"
        series={series}
        options={options}
        height={height}
        width={width}
      />
    </div>
  );
};

