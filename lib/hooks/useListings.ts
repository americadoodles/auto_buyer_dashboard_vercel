import { useState, useEffect, useMemo, useRef } from 'react';
import { Listing, SortConfig } from '../types/listing';
import { MOCK_DATA } from '../data/mockData';
import { ApiService } from '../services/api';
import { useAuth } from '../../app/auth/useAuth';
import { useToast } from '../../hooks/useToast';
import { getCurrentTodayRange } from 'lib/services/helper';
import { loadDateRangeFromStorage, saveDateRangeToStorage } from '../utils/dateRangeStorage';

// Module-level cache for listings data
interface ListingsCache {
  data: Listing[];
  cacheKey: string;
  timestamp: number;
}

let listingsCache: ListingsCache | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Generate cache key based on user and date range
const generateCacheKey = (userId: string | undefined, role: string | undefined, startDate: Date | null, endDate: Date | null): string => {
  const start = startDate ? startDate.toISOString().split('T')[0] : 'null';
  const end = endDate ? endDate.toISOString().split('T')[0] : 'null';
  return `${userId || 'anonymous'}_${role || 'buyer'}_${start}_${end}`;
};

// Check if cache is valid
const isCacheValid = (cache: ListingsCache | null, cacheKey: string): boolean => {
  if (!cache) return false;
  if (cache.cacheKey !== cacheKey) return false;
  const age = Date.now() - cache.timestamp;
  return age < CACHE_DURATION;
};

// Invalidate cache (call this when listing is updated)
export const invalidateListingsCache = () => {
  listingsCache = null;
};

export const useListings = () => {
  const { user } = useAuth();
  const { showSuccess, showError, showWarning } = useToast();
  const [data, setData] = useState<Listing[]>([]);
  const [sort, setSort] = useState<SortConfig>({ key: 'score', dir: 'desc' });
  const [loading, setLoading] = useState<boolean>(false);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  

  
  // Initialize date range from localStorage or use default
  const getInitialDateRange = () => {
    if (typeof window !== 'undefined') {
      const stored = loadDateRangeFromStorage();
      if (stored.startDate || stored.endDate) {
        return { start: stored.startDate, end: stored.endDate };
      }
    }
    return getCurrentTodayRange();
  };

  const initialDateRange = getInitialDateRange();
  const [startDate, setStartDate] = useState<Date | null>(initialDateRange.start);
  const [endDate, setEndDate] = useState<Date | null>(initialDateRange.end);

  const sortedRows = useMemo(() => {
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...data].sort((a, b) => {
      let av: any;
      let bv: any;
      
      // Handle nested decision fields
      if (sort.key === 'decision_status') {
        av = a.decision?.status;
        bv = b.decision?.status;
      } else if (sort.key === 'decision_reasons') {
        av = a.decision?.reasons?.join(', ') || '';
        bv = b.decision?.reasons?.join(', ') || '';
      } else {
        av = a[sort.key as keyof Listing];
        bv = b[sort.key as keyof Listing];
      }
      
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [data, sort]);

  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return sortedRows.slice(startIndex, endIndex);
  }, [sortedRows, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(sortedRows.length / rowsPerPage);

  // Reset to first page when data changes or rows per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [data.length, rowsPerPage]);

  // Track if we've initialized to avoid refetching on navigation
  const hasInitialized = useRef(false);
  const currentCacheKey = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    
    const checkBackend = async () => {
      try {
        const isHealthy = await ApiService.checkHealth();
        if (!mounted) return;
        
        setBackendOk(isHealthy);
        
        if (isHealthy) {
          // Use stored date range from localStorage or default
          const dateRange = getInitialDateRange();
          setStartDate(dateRange.start);
          setEndDate(dateRange.end);
          
          // Generate cache key
          const cacheKey = generateCacheKey(user?.id, user?.role, dateRange.start, dateRange.end);
          currentCacheKey.current = cacheKey;
          
          // Check if we have valid cached data
          if (isCacheValid(listingsCache, cacheKey) && hasInitialized.current) {
            // Use cached data
            if (mounted && listingsCache && listingsCache.data.length > 0) {
              setData(listingsCache.data);
              return; // Don't fetch if we have valid cache
            }
          }
          
          // Fetch from API
          const listings = user?.role === 'admin' 
            ? await ApiService.getListings({ 
                start_date: dateRange.start?.toISOString(), 
                end_date: dateRange.end?.toISOString() 
              })
            : user?.id 
              ? await ApiService.getBuyerListings(user.id, { 
                  start_date: dateRange.start?.toISOString(), 
                  end_date: dateRange.end?.toISOString() 
                })
              : [];
          
          if (mounted && Array.isArray(listings) && listings.length > 0) {
            setData(listings);
            // Update cache
            listingsCache = {
              data: listings,
              cacheKey,
              timestamp: Date.now()
            };
          }
          
          hasInitialized.current = true;
        } else {
          // Only show mock data when backend is unavailable
          setData(MOCK_DATA);
          hasInitialized.current = true;
        }
      } catch {
        if (!mounted) return;
        setBackendOk(false);
        // Only show mock data when backend is unavailable
        setData(MOCK_DATA);
        hasInitialized.current = true;
      }
    };

    checkBackend();
    
    return () => { mounted = false; };
  }, [user]);

  const rescoreVisible = async () => {
    try {
      setLoading(true);
      const scores = await ApiService.scoreListings(sortedRows);
      
      const byVin: Record<string, { score: number; buyMax: number; reasonCodes: string[] }> = {};
      for (const s of scores) {
        byVin[s.vin] = { score: s.score, buyMax: s.buyMax, reasonCodes: s.reasonCodes };
      }
      
      setData(d => d.map(x => x.vin && byVin[x.vin] ? { ...x, ...byVin[x.vin] } : x));
      showSuccess('Re-scoring Complete', `Re-scored ${scores.length} listings.`);
    } catch (e: any) {
      showError('Re-scoring Failed', 'Failed to score: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const seedBackend = async () => {
    try {
      setLoading(true);
      const seeded = await ApiService.ingestListings(MOCK_DATA);
      setData(seeded);
      setBackendOk(true);
      showSuccess('Backend Seeded', `Seeded ${seeded.length} listings to backend.`);
    } catch (e: any) {
      showError('Seeding Failed', 'Failed to seed backend: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadFromBackend = async () => {
    try {
      setLoading(true);
      // Use appropriate API call based on user role
      const listings = user?.role === 'admin' 
        ? await ApiService.getListings({ start_date: startDate?.toISOString(), end_date: endDate?.toISOString() })
        : user?.id 
          ? await ApiService.getBuyerListings(user.id, { start_date: startDate?.toISOString(), end_date: endDate?.toISOString() })
          : [];
      setData(Array.isArray(listings) && listings.length ? listings : data);
      setBackendOk(true);
    } catch (e: any) {
      showError('Load Failed', 'Failed to load from backend: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadWithDateRange = async (start: Date | null, end: Date | null) => {
    try {
      setLoading(true);
      setStartDate(start);
      setEndDate(end);
      // Save to localStorage whenever date range changes
      saveDateRangeToStorage(start, end);
      
      // Generate cache key for new date range
      const cacheKey = generateCacheKey(user?.id, user?.role, start, end);
      currentCacheKey.current = cacheKey;
      
      // Check cache first
      if (isCacheValid(listingsCache, cacheKey)) {
        if (listingsCache && listingsCache.data.length > 0) {
          setData(listingsCache.data);
          setBackendOk(true);
          setLoading(false);
          return;
        }
      }
      
      // Fetch from API
      const listings = user?.role === 'admin'
        ? await ApiService.getListings({ start_date: start?.toISOString() || undefined, end_date: end?.toISOString() || undefined })
        : user?.id
          ? await ApiService.getBuyerListings(user.id, { start_date: start?.toISOString() || undefined, end_date: end?.toISOString() || undefined })
          : [];
      
      const listingsArray = Array.isArray(listings) ? listings : [];
      setData(listingsArray);
      
      // Update cache
      listingsCache = {
        data: listingsArray,
        cacheKey,
        timestamp: Date.now()
      };
      
      setBackendOk(true);
    } catch (e: any) {
      showError('Load Failed', 'Failed to load listings: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshToday = async () => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    // loadWithDateRange will save to localStorage automatically
    await loadWithDateRange(startOfToday, endOfToday);
  };

  const notify = async (vin: string) => {
    try {
      setLoading(true);
      // Find the listing to get the vehicle_key
      const listing = data.find(l => l.vin === vin);
      if (!listing) {
        showWarning('Listing Not Found', 'The requested listing could not be found.');
        return;
      }
      
      const res = await ApiService.notifyListing(listing.vehicle_key, vin);
      showSuccess('Notification Sent', `Notified for VIN ${vin}: ${res?.[0]?.channel ?? 'ok'}`);
    } catch (e: any) {
      showError('Notification Failed', 'Failed to notify: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const notifySlack = async (vin: string, customMessage?: string) => {
    try {
      setLoading(true);
      // Find the listing to get the vehicle_key
      const listing = data.find(l => l.vin === vin);
      if (!listing) {
        showWarning('Listing Not Found', 'The requested listing could not be found.');
        return;
      }
      
      const res = await ApiService.sendSlackNotification(listing.vehicle_key, vin, customMessage);
      if (res.sent) {
        showSuccess('Slack Notification Sent', `Slack notification sent to ${res.channel} for VIN ${vin}`);
      } else {
        showError('Slack Notification Failed', `Failed to send Slack notification: ${res.error || res.message}`);
      }
    } catch (e: any) {
      showError('Slack Notification Failed', 'Failed to send Slack notification: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const triggerWorkflow = async (vin: string, customMessage?: string) => {
    try {
      setLoading(true);
      // Find the listing to get the vehicle_key
      const listing = data.find(l => l.vin === vin);
      if (!listing) {
        showWarning('Listing Not Found', 'The requested listing could not be found.');
        return;
      }
      
      const res = await ApiService.triggerSlackWorkflow(listing.vehicle_key, vin, customMessage);
      if (res.triggered) {
        showSuccess('Slack Workflow Triggered', `Slack workflow triggered for VIN ${vin}${res.workflow_id ? ` (ID: ${res.workflow_id})` : ''}`);
      } else {
        showError('Slack Workflow Failed', `Failed to trigger Slack workflow: ${res.error || res.message}`);
      }
    } catch (e: any) {
      showError('Slack Workflow Failed', 'Failed to trigger Slack workflow: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const updateListingInState = (updatedListing: Listing) => {
    setData(prevData => {
      const updated = prevData.map(listing => 
        listing.id === updatedListing.id ? updatedListing : listing
      );
      
      // Update cache if it exists and matches current cache key
      if (listingsCache && listingsCache.cacheKey === currentCacheKey.current) {
        listingsCache.data = updated;
      }
      
      return updated;
    });
  };

  return {
    data,
    sortedRows,
    paginatedRows,
    sort,
    setSort,
    loading,
    backendOk,
    currentPage,
    setCurrentPage,
    rowsPerPage,
    setRowsPerPage,
    totalPages,
    rescoreVisible,
    seedBackend,
    loadFromBackend,
    loadWithDateRange,
    refreshToday,
    startDate,
    endDate,
    notify,
    notifySlack,
    triggerWorkflow,
    updateListingInState
  };
};
