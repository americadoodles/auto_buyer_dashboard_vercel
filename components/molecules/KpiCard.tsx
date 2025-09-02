import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string;
  className?: string;
  icon?: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  color?: 'blue' | 'green' | 'amber' | 'purple' | 'indigo' | 'emerald' | 'red';
}

const colorClasses = {
  blue: 'bg-blue-50 text-blue-600 border-blue-200',
  green: 'bg-green-50 text-green-600 border-green-200',
  amber: 'bg-amber-50 text-amber-600 border-amber-200',
  purple: 'bg-purple-50 text-purple-600 border-purple-200',
  indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  red: 'bg-red-50 text-red-600 border-red-200',
};

export const KpiCard: React.FC<KpiCardProps> = ({ 
  label, 
  value, 
  className = '', 
  icon: Icon,
  trend,
  trendUp,
  color = 'blue'
}) => {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-200 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-3">
            {Icon && (
              <div className={`p-2 rounded-lg border ${colorClasses[color]}`}>
                <Icon className="w-5 h-5" />
              </div>
            )}
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-600 mb-1">{label}</div>
              <div className="text-2xl font-bold text-gray-900">{value}</div>
            </div>
          </div>
          
          {trend && (
            <div className="flex items-center space-x-1">
              {trendUp ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span className={`text-sm font-medium ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
                {trend}
              </span>
              <span className="text-xs text-gray-500">vs last month</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
