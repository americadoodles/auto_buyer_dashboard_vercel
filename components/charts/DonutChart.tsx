'use client';

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
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
  const options = useMemo(() => {
    const config = getDonutConfig({
      colors,
      labels,
      legend: {
        show: showLegend,
      },
      plotOptions: {
        pie: {
          donut: {
            labels: {
              show: showLabels,
            },
          },
        },
      },
      ...customOptions,
    });
    return config;
  }, [labels, colors, showLegend, showLabels, customOptions]);

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

