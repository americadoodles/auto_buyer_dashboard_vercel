import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { SparklineChart } from '../charts/SparklineChart';
import { ApexOptions } from 'apexcharts';

interface KpiCardProps {
  label: string;
  value: string | number;
  className?: string;
  icon?: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  change?: string;
  color?: 'blue' | 'green' | 'amber' | 'purple' | 'indigo' | 'emerald' | 'red';
  sparklineData?: number[];
  sparklineColor?: string;
}

const colorClasses = {
  blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
  amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
  emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800',
};

export const KpiCard: React.FC<KpiCardProps> = ({ 
  label, 
  value, 
  className = '', 
  icon: Icon,
  trend,
  trendUp,
  change,
  color = 'blue',
  sparklineData,
  sparklineColor
}) => {
  const sparklineSeries = sparklineData ? [{ name: label, data: sparklineData }] : undefined;
  const defaultSparklineColor = sparklineColor || 
    (color === 'blue' ? '#3b82f6' :
     color === 'green' ? '#10b981' :
     color === 'amber' ? '#f59e0b' :
     color === 'purple' ? '#8b5cf6' :
     color === 'indigo' ? '#6366f1' :
     color === 'emerald' ? '#10b981' :
     '#ef4444');

  return (
    <div className={`rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-3 mb-3">
            {Icon && (
              <div className={`p-2 rounded-lg border ${colorClasses[color]}`}>
                <Icon className="w-5 h-5" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{String(value)}</div>
            </div>
          </div>
          
          {(trend || change) && (
            <div className="flex items-center space-x-1 mb-2">
              {trendUp ? (
                <TrendingUp className="w-4 h-4 text-green-500 dark:text-green-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500 dark:text-red-400" />
              )}
              <span className={`text-sm font-medium ${trendUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {change || trend}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">vs last month</span>
            </div>
          )}

          {/* Sparkline Chart */}
          {sparklineData && sparklineData.length > 0 && (
            <div className="mt-3 w-full overflow-hidden">
              <SparklineChart
                series={sparklineSeries}
                height={60}
                width="100%"
                colors={[defaultSparklineColor]}
                className="w-full"
                customOptions={{
                  chart: {
                    sparkline: {
                      enabled: true,
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
                      opacityFrom: 0.4,
                      opacityTo: 0.1,
                      stops: [0, 100],
                    },
                  },
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
