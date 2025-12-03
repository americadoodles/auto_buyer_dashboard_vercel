'use client';

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { ApexOptions } from 'apexcharts';
import { getBarConfig } from './config/bar';

// Dynamically import ApexCharts to avoid SSR issues
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

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
      xaxis: categories
        ? {
            categories,
          }
        : undefined,
      ...customOptions,
    });
    return config;
  }, [categories, colors, horizontal, stacked, customOptions]);

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

