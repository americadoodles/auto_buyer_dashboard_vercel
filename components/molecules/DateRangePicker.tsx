import React, { useState } from 'react';
import { Calendar, X, RefreshCw } from 'lucide-react';
import { Button } from '../atoms/Button';

interface DateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onDateChange: (start: Date | null, end: Date | null) => void;
  onRefreshToday?: () => void;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onDateChange,
  onRefreshToday
}) => {
  const [selectedButton, setSelectedButton] = useState<string | null>('today');
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : null;
    setSelectedButton(null);
    onDateChange(date, endDate);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : null;
    setSelectedButton(null);
    onDateChange(startDate, date);
  };

  const clearStartDate = () => {
    setSelectedButton(null);
    onDateChange(null, endDate);
  };

  const clearEndDate = () => {
    setSelectedButton(null);
    onDateChange(startDate, null);
  };

  const formatDateForInput = (date: Date | null) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Start Date */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Start Date
          </label>
          <div className="relative">
            <input
              type="date"
              value={formatDateForInput(startDate)}
              onChange={handleStartDateChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
            />
            {startDate && (
              <button
                onClick={clearStartDate}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* End Date */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            End Date
          </label>
          <div className="relative">
            <input
              type="date"
              value={formatDateForInput(endDate)}
              onChange={handleEndDateChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
            />
            {endDate && (
              <button
                onClick={clearEndDate}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Date Presets */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Quick Presets
        </label>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className={selectedButton === 'today' ? '!bg-blue-100 !text-blue-700 dark:!bg-gray-700 dark:!text-gray-200' : ''}
            onClick={() => {
              setSelectedButton('today');
              const today = new Date();
              const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
              const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
              onDateChange(start, end);
            }}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={selectedButton === 'thisWeek' ? '!bg-blue-100 !text-blue-700 dark:!bg-gray-700 dark:!text-gray-200' : ''}
            onClick={() => {
              setSelectedButton('thisWeek');
              const now = new Date();
              const day = now.getDay();
              const diffToMonday = (day === 0 ? 6 : day - 1); // Monday start
              const start = new Date(now);
              start.setHours(0,0,0,0);
              start.setDate(now.getDate() - diffToMonday);
              const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23,59,59,999);
              onDateChange(start, end);
            }}
          >
            This Week
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={selectedButton === 'thisMonth' ? '!bg-blue-100 !text-blue-700 dark:!bg-gray-700 dark:!text-gray-200' : ''}
            onClick={() => {
              setSelectedButton('thisMonth');
              const now = new Date();
              const start = new Date(now.getFullYear(), now.getMonth(), 1, 0,0,0,0);
              const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23,59,59,999);
              onDateChange(start, end);
            }}
          >
            This Month
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={selectedButton === 'thisYear' ? '!bg-blue-100 !text-blue-700 dark:!bg-gray-700 dark:!text-gray-200' : ''}
            onClick={() => {
              setSelectedButton('thisYear');
              const now = new Date();
              const start = new Date(now.getFullYear(), 0, 1, 0,0,0,0);
              const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23,59,59,999);
              onDateChange(start, end);
            }}
          >
            This Year
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={selectedButton === 'last7Days' ? '!bg-blue-100 !text-blue-700 dark:!bg-gray-700 dark:!text-gray-200' : ''}
            onClick={() => {
              setSelectedButton('last7Days');
              const today = new Date();
              const weekAgo = new Date(today);
              weekAgo.setDate(today.getDate() - 7);
              onDateChange(weekAgo, today);
            }}
          >
            Last 7 Days
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={selectedButton === 'last30Days' ? '!bg-blue-100 !text-blue-700 dark:!bg-gray-700 dark:!text-gray-200' : ''}
            onClick={() => {
              setSelectedButton('last30Days');
              const today = new Date();
              const monthAgo = new Date(today);
              monthAgo.setDate(today.getDate() - 30);
              onDateChange(monthAgo, today);
            }}
          >
            Last 30 Days
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={selectedButton === 'last3Months' ? '!bg-blue-100 !text-blue-700 dark:!bg-gray-700 dark:!text-gray-200' : ''}
            onClick={() => {
              setSelectedButton('last3Months');
              const today = new Date();
              const quarterAgo = new Date(today);
              quarterAgo.setMonth(today.getMonth() - 3);
              onDateChange(quarterAgo, today);
            }}
          >
            Last 3 Months
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={selectedButton === 'lastYear' ? '!bg-blue-100 !text-blue-700 dark:!bg-gray-700 dark:!text-gray-200' : ''}
            onClick={() => {
              setSelectedButton('lastYear');
              const today = new Date();
              const yearAgo = new Date(today);
              yearAgo.setFullYear(today.getFullYear() - 1);
              onDateChange(yearAgo, today);
            }}
          >
            Last Year
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="inline-flex items-center gap-2"
            onClick={() => {
              setSelectedButton(null);
              if (onRefreshToday) {
                onRefreshToday();
              } else {
                const today = new Date();
                const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
                const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
                onDateChange(start, end);
              }
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Today
          </Button>
        </div>
      </div>

      {/* Current Selection Display */}
      {(startDate || endDate) && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm text-blue-800 dark:text-blue-300">
              Showing listings from{' '}
              {startDate ? startDate.toLocaleDateString() : 'beginning'} to{' '}
              {endDate ? endDate.toLocaleDateString() : 'now'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};