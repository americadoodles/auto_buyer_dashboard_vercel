import { ApexOptions } from 'apexcharts';
import { baseChartOptions, chartColors, formatInteger } from './theme';

/**
 * Base configuration for Bar charts
 * Use this as a starting point and merge with component-specific options
 */
export const getBarConfig = (customOptions?: Partial<ApexOptions>): ApexOptions => {
  return {
    ...baseChartOptions,
    chart: {
      ...baseChartOptions.chart,
      type: 'bar',
      stacked: false,
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '55%',
        borderRadius: 4,
        dataLabels: {
          position: 'top',
        },
      },
    },
    dataLabels: {
      ...baseChartOptions.dataLabels,
      enabled: false, // Keep disabled for clean look
    },
    tooltip: {
      ...baseChartOptions.tooltip,
      y: {
        formatter: (value: number) => formatInteger(value),
      },
    },
    ...customOptions,
  };
};

