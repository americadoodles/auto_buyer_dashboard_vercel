import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Calendar, X, RefreshCw } from 'lucide-react';
import { Button } from '../atoms/Button';
import { saveDateRangeToStorage, loadDateRangeFromStorage } from '../../lib/utils/dateRangeStorage';

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
  // Load selected button from localStorage on mount
  const storedData = useMemo(() => {
    if (typeof window !== 'undefined') {
      return loadDateRangeFromStorage();
    }
    return { startDate: null, endDate: null, selectedButton: null };
  }, []);
  
  const [selectedButton, setSelectedButton] = useState<string | null>(storedData.selectedButton || 'today');
  // Track if date change came from a button click to avoid clearing button status
  const isFromButtonClick = useRef(false);
  
  // Helper function to check if dates match a preset
  const checkPresetMatch = (start: Date | null, end: Date | null): string | null => {
    if (!start || !end) return null;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Normalize dates for comparison (ignore time)
    const normalizeDate = (date: Date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    };
    
    const startTime = normalizeDate(start);
    const endTime = normalizeDate(end);
    const todayTime = normalizeDate(today);
    
    // Check Today
    if (startTime === todayTime && endTime === todayTime) {
      return 'today';
    }
    
    // Check This Week
    const day = now.getDay();
    const diffToMonday = (day === 0 ? 6 : day - 1);
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);
    monday.setHours(0, 0, 0, 0);
    if (startTime === normalizeDate(monday) && endTime === todayTime) {
      return 'thisWeek';
    }
    
    // Check This Month
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    if (startTime === normalizeDate(firstOfMonth) && endTime === todayTime) {
      return 'thisMonth';
    }
    
    // Check This Year
    const firstOfYear = new Date(now.getFullYear(), 0, 1);
    if (startTime === normalizeDate(firstOfYear) && endTime === todayTime) {
      return 'thisYear';
    }
    
    // Check Last 7 Days
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);
    if (startTime === normalizeDate(weekAgo) && endTime === todayTime) {
      return 'last7Days';
    }
    
    // Check Last 30 Days
    const monthAgo = new Date(today);
    monthAgo.setDate(today.getDate() - 30);
    if (startTime === normalizeDate(monthAgo) && endTime === todayTime) {
      return 'last30Days';
    }
    
    // Check Last 3 Months
    const quarterAgo = new Date(today);
    quarterAgo.setMonth(today.getMonth() - 3);
    if (startTime === normalizeDate(quarterAgo) && endTime === todayTime) {
      return 'last3Months';
    }
    
    // Check Last Year
    const yearAgo = new Date(today);
    yearAgo.setFullYear(today.getFullYear() - 1);
    if (startTime === normalizeDate(yearAgo) && endTime === todayTime) {
      return 'lastYear';
    }
    
    return null;
  };
  
  // Check if current dates match a preset when dates change (but not from button clicks)
  useEffect(() => {
    if (isFromButtonClick.current) {
      isFromButtonClick.current = false;
      return; // Don't check if the change came from a button click
    }
    
    if (startDate && endDate) {
      const matchedPreset = checkPresetMatch(startDate, endDate);
      if (matchedPreset && matchedPreset !== selectedButton) {
        setSelectedButton(matchedPreset);
        saveDateRangeToStorage(startDate, endDate, matchedPreset);
      } else if (!matchedPreset && selectedButton !== null) {
        // If dates don't match any preset but we have a selected button, clear it
        // This happens when dates are manually changed
        setSelectedButton(null);
        saveDateRangeToStorage(startDate, endDate, null);
      }
    } else if (selectedButton !== null) {
      // If dates are cleared, clear button too
      setSelectedButton(null);
      saveDateRangeToStorage(startDate, endDate, null);
    }
  }, [startDate, endDate]); // Only check when dates change, not when selectedButton changes
  
  // Note: We save to localStorage in button click handlers and in the preset match check
  // This avoids duplicate saves

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : null;
    setSelectedButton(null);
    saveDateRangeToStorage(date, endDate, null);
    onDateChange(date, endDate);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : null;
    setSelectedButton(null);
    saveDateRangeToStorage(startDate, date, null);
    onDateChange(startDate, date);
  };

  const clearStartDate = () => {
    setSelectedButton(null);
    saveDateRangeToStorage(null, endDate, null);
    onDateChange(null, endDate);
  };

  const clearEndDate = () => {
    setSelectedButton(null);
    saveDateRangeToStorage(startDate, null, null);
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
              const button = 'today';
              isFromButtonClick.current = true;
              setSelectedButton(button);
              const today = new Date();
              const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
              const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
              saveDateRangeToStorage(start, end, button);
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
              const button = 'thisWeek';
              isFromButtonClick.current = true;
              setSelectedButton(button);
              const now = new Date();
              const day = now.getDay();
              const diffToMonday = (day === 0 ? 6 : day - 1); // Monday start
              const start = new Date(now);
              start.setHours(0,0,0,0);
              start.setDate(now.getDate() - diffToMonday);
              const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23,59,59,999);
              saveDateRangeToStorage(start, end, button);
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
              const button = 'thisMonth';
              isFromButtonClick.current = true;
              setSelectedButton(button);
              const now = new Date();
              const start = new Date(now.getFullYear(), now.getMonth(), 1, 0,0,0,0);
              const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23,59,59,999);
              saveDateRangeToStorage(start, end, button);
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
              const button = 'thisYear';
              isFromButtonClick.current = true;
              setSelectedButton(button);
              const now = new Date();
              const start = new Date(now.getFullYear(), 0, 1, 0,0,0,0);
              const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23,59,59,999);
              saveDateRangeToStorage(start, end, button);
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
              const button = 'last7Days';
              isFromButtonClick.current = true;
              setSelectedButton(button);
              const today = new Date();
              const weekAgo = new Date(today);
              weekAgo.setDate(today.getDate() - 7);
              saveDateRangeToStorage(weekAgo, today, button);
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
              const button = 'last30Days';
              isFromButtonClick.current = true;
              setSelectedButton(button);
              const today = new Date();
              const monthAgo = new Date(today);
              monthAgo.setDate(today.getDate() - 30);
              saveDateRangeToStorage(monthAgo, today, button);
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
              const button = 'last3Months';
              isFromButtonClick.current = true;
              setSelectedButton(button);
              const today = new Date();
              const quarterAgo = new Date(today);
              quarterAgo.setMonth(today.getMonth() - 3);
              saveDateRangeToStorage(quarterAgo, today, button);
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
              const button = 'lastYear';
              isFromButtonClick.current = true;
              setSelectedButton(button);
              const today = new Date();
              const yearAgo = new Date(today);
              yearAgo.setFullYear(today.getFullYear() - 1);
              saveDateRangeToStorage(yearAgo, today, button);
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
              saveDateRangeToStorage(null, null, null);
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