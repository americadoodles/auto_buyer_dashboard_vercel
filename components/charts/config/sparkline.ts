import { ApexOptions } from 'apexcharts';
import { baseChartOptions, chartColors } from './theme';

/**
 * Base configuration for Sparkline charts
 * Use this as a starting point and merge with component-specific options
 */
export const getSparklineConfig = (customOptions?: Partial<ApexOptions>): ApexOptions => {
  return {
    ...baseChartOptions,
    chart: {
      ...baseChartOptions.chart,
      type: 'line',
      sparkline: {
        enabled: true,
      },
      toolbar: {
        show: false,
      },
    },
    stroke: {
      curve: 'smooth',
      width: 2,
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.3,
        stops: [0, 90, 100],
      },
    },
    markers: {
      size: 0,
    },
    tooltip: {
      ...baseChartOptions.tooltip,
      fixed: {
        enabled: false,
      },
      x: {
        show: false,
      },
      y: {
        title: {
          formatter: () => '',
        },
      },
    },
    xaxis: {
      ...baseChartOptions.xaxis,
      labels: {
        show: false,
      },
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    yaxis: {
      ...baseChartOptions.yaxis,
      labels: {
        show: false,
      },
    },
    grid: {
      show: false,
    },
    ...customOptions,
  };
};

