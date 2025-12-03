import { ApexOptions } from 'apexcharts';
import { baseChartOptions, chartColors } from './theme';

/**
 * Base configuration for Spline Area charts
 * Use this as a starting point and merge with component-specific options
 */
export const getSplineAreaConfig = (customOptions?: Partial<ApexOptions>): ApexOptions => {
  return {
    ...baseChartOptions,
    chart: {
      ...baseChartOptions.chart,
      type: 'area',
      stacked: false,
      zoom: {
        enabled: false,
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
      size: 4,
      strokeWidth: 2,
      hover: {
        size: 6,
      },
    },
    ...customOptions,
  };
};

