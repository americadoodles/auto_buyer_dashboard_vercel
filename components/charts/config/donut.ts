import { ApexOptions } from 'apexcharts';
import { baseChartOptions, chartColors } from './theme';

/**
 * Base configuration for Donut charts
 * Use this as a starting point and merge with component-specific options
 */
export const getDonutConfig = (customOptions?: Partial<ApexOptions>): ApexOptions => {
  return {
    ...baseChartOptions,
    chart: {
      ...baseChartOptions.chart,
      type: 'donut',
    },
    plotOptions: {
      pie: {
        donut: {
          size: '70%',
          labels: {
            show: true,
            name: {
              show: true,
              fontSize: '14px',
              fontWeight: 600,
              color: chartColors.text.primary,
            },
            value: {
              show: true,
              fontSize: '16px',
              fontWeight: 700,
              color: chartColors.text.primary,
              formatter: (val: string) => val,
            },
            total: {
              show: true,
              label: 'Total',
              fontSize: '14px',
              fontWeight: 600,
              color: chartColors.text.secondary,
              formatter: () => '',
            },
          },
        },
      },
    },
    dataLabels: {
      ...baseChartOptions.dataLabels,
      enabled: true,
      style: {
        ...baseChartOptions.dataLabels?.style,
        fontSize: '12px',
        fontWeight: 600,
      },
    },
    legend: {
      ...baseChartOptions.legend,
      position: 'bottom',
      horizontalAlign: 'center',
    },
    ...customOptions,
  };
};

