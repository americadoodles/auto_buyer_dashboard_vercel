'use client';

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import { ApexOptions } from 'apexcharts';
import { getSparklineConfig } from './config/sparkline';

// Dynamically import ApexCharts to avoid SSR issues
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

export interface SparklineChartProps {
  series: ApexOptions['series'];
  height?: string | number;
  width?: string | number;
  colors?: string[];
  type?: 'line' | 'area' | 'bar';
  customOptions?: Partial<ApexOptions>;
  className?: string;
}

export const SparklineChart: React.FC<SparklineChartProps> = ({
  series,
  height = 100,
  width = '100%',
  colors,
  type = 'area',
  customOptions,
  className = '',
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const options = useMemo(() => {
    const config = getSparklineConfig({
      colors,
      chart: {
        type,
      },
      tooltip: {
        theme: isDark ? 'dark' : 'light',
      },
      ...customOptions,
    });
    return config;
  }, [colors, type, customOptions, isDark]);

  return (
    <div className={className}>
      <Chart
        type={type}
        series={series}
        options={options}
        height={height}
        width={width}
      />
    </div>
  );
};

