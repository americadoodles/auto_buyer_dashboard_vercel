'use client';

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
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
  const options = useMemo(() => {
    const config = getSplineAreaConfig({
      colors,
      xaxis: categories
        ? {
            categories,
          }
        : undefined,
      ...customOptions,
    });
    return config;
  }, [categories, colors, customOptions]);

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

