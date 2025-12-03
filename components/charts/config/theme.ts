/**
 * Shared theme configuration for all ApexCharts
 * This ensures consistent styling across all charts in the application
 */
export const chartTheme = {
  mode: 'light',
  palette: 'palette1',
  monochrome: {
    enabled: false,
    color: '#255aee',
    shadeTo: 'light',
    shadeIntensity: 0.65,
  },
};

/**
 * Shared color palette for charts
 * Matches the project's Tailwind slate color scheme
 */
export const chartColors = {
  primary: '#0f172a', // slate-900
  secondary: '#475569', // slate-600
  accent: '#3b82f6', // blue-500
  success: '#10b981', // emerald-500
  warning: '#f59e0b', // amber-500
  error: '#ef4444', // red-500
  info: '#06b6d4', // cyan-500
  background: '#ffffff',
  grid: '#e2e8f0', // slate-200
  text: {
    primary: '#0f172a', // slate-900
    secondary: '#64748b', // slate-500
  },
  series: [
    '#3b82f6', // blue-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#ef4444', // red-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#06b6d4', // cyan-500
    '#84cc16', // lime-500
  ],
};

/**
 * Shared chart options that apply to all charts
 */
export const baseChartOptions = {
  chart: {
    fontFamily: 'inherit',
    toolbar: {
      show: false,
    },
    animations: {
      enabled: true,
      easing: 'easeinout',
      speed: 800,
    },
  },
  grid: {
    borderColor: chartColors.grid,
    strokeDashArray: 4,
  },
  legend: {
    fontSize: '12px',
    fontFamily: 'inherit',
    fontWeight: 500,
    labels: {
      colors: chartColors.text.secondary,
    },
  },
  tooltip: {
    theme: 'light',
    style: {
      fontSize: '12px',
      fontFamily: 'inherit',
    },
  },
  dataLabels: {
    style: {
      fontSize: '12px',
      fontFamily: 'inherit',
      fontWeight: 500,
    },
  },
  xaxis: {
    labels: {
      style: {
        colors: chartColors.text.secondary,
        fontSize: '12px',
        fontFamily: 'inherit',
      },
    },
    axisBorder: {
      color: chartColors.grid,
    },
    axisTicks: {
      color: chartColors.grid,
    },
  },
  yaxis: {
    labels: {
      style: {
        colors: chartColors.text.secondary,
        fontSize: '12px',
        fontFamily: 'inherit',
      },
    },
  },
};

