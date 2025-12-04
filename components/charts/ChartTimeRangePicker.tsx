'use client';

import React from 'react';
import { Calendar } from 'lucide-react';
import { Button } from '../atoms/Button';

export type TimeRange = '1w' | '2w' | '1m' | '3m' | '6m' | '1y';

interface ChartTimeRangePickerProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
  className?: string;
}

const timeRangeOptions: { value: TimeRange; label: string }[] = [
  { value: '1w', label: '1 Week' },
  { value: '2w', label: '2 Weeks' },
  { value: '1m', label: '1 Month' },
  { value: '3m', label: '3 Months' },
  { value: '6m', label: '6 Months' },
  { value: '1y', label: '1 Year' },
];

export const ChartTimeRangePicker: React.FC<ChartTimeRangePickerProps> = ({
  value,
  onChange,
  className = '',
}) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700/50 rounded-lg p-1">
        {timeRangeOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
              value === option.value
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};

/**
 * Get date range from time range selection
 */
export const getDateRangeFromTimeRange = (range: TimeRange): { startDate: Date; endDate: Date } => {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  
  const startDate = new Date();
  
  switch (range) {
    case '1w':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case '2w':
      startDate.setDate(endDate.getDate() - 14);
      break;
    case '1m':
      startDate.setMonth(endDate.getMonth() - 1);
      break;
    case '3m':
      startDate.setMonth(endDate.getMonth() - 3);
      break;
    case '6m':
      startDate.setMonth(endDate.getMonth() - 6);
      break;
    case '1y':
      startDate.setFullYear(endDate.getFullYear() - 1);
      break;
  }
  
  startDate.setHours(0, 0, 0, 0);
  
  return { startDate, endDate };
};

