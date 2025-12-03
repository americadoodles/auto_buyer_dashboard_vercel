'use client';

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { ApexOptions } from 'apexcharts';
import { getSparklineConfig } from './config/sparkline';

// Dynamically import ApexCharts to avoid SSR issues
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

export interface SparklineChartProps {
  series: ApexOptions['series'];
  height?: string | number;
  width?: string | number;
  colors?: string[];
  type?: 'line' | 'area' | 'column';
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
  const options = useMemo(() => {
    const config = getSparklineConfig({
      colors,
      chart: {
        type,
      },
      ...customOptions,
    });
    return config;
  }, [colors, type, customOptions]);

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

