// localStorage key for date range
const DATE_RANGE_STORAGE_KEY = 'listings_date_range';

// Helper functions to save/load date range from localStorage
export const saveDateRangeToStorage = (start: Date | null, end: Date | null, selectedButton?: string | null) => {
  try {
    if (typeof window !== 'undefined') {
      const data: {
        startDate: string | null;
        endDate: string | null;
        selectedButton?: string | null;
      } = {
        startDate: start ? start.toISOString() : null,
        endDate: end ? end.toISOString() : null,
      };
      if (selectedButton !== undefined) {
        data.selectedButton = selectedButton;
      }
      localStorage.setItem(DATE_RANGE_STORAGE_KEY, JSON.stringify(data));
    }
  } catch (error) {
    console.error('Failed to save date range to localStorage:', error);
  }
};

export const loadDateRangeFromStorage = (): { 
  startDate: Date | null; 
  endDate: Date | null;
  selectedButton: string | null;
} => {
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(DATE_RANGE_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        return {
          startDate: data.startDate ? new Date(data.startDate) : null,
          endDate: data.endDate ? new Date(data.endDate) : null,
          selectedButton: data.selectedButton || null,
        };
      }
    }
  } catch (error) {
    console.error('Failed to load date range from localStorage:', error);
  }
  return { startDate: null, endDate: null, selectedButton: null };
};

