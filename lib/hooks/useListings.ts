import { useState, useEffect, useMemo } from 'react';
import { Listing, SortConfig } from '../types/listing';
import { MOCK_DATA } from '../data/mockData';
import { ApiService } from '../services/api';

export const useListings = () => {
  const [data, setData] = useState<Listing[]>([]);
  const [sort, setSort] = useState<SortConfig>({ key: 'score', dir: 'desc' });
  const [loading, setLoading] = useState<boolean>(false);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);

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

  useEffect(() => {
    let mounted = true;
    
    const checkBackend = async () => {
      try {
        const isHealthy = await ApiService.checkHealth();
        if (!mounted) return;
        
        setBackendOk(isHealthy);
        
        if (isHealthy) {
          const listings = await ApiService.getListings();
          if (mounted && Array.isArray(listings) && listings.length > 0) {
            setData(listings);
          }
        } else {
          // Only show mock data when backend is unavailable
          setData(MOCK_DATA);
        }
      } catch {
        if (!mounted) return;
        setBackendOk(false);
        // Only show mock data when backend is unavailable
        setData(MOCK_DATA);
      }
    };

    checkBackend();
    
    return () => { mounted = false; };
  }, []);

  const rescoreVisible = async () => {
    try {
      setLoading(true);
      const scores = await ApiService.scoreListings(sortedRows);
      
      const byVin: Record<string, { score: number; buyMax: number; reasonCodes: string[] }> = {};
      for (const s of scores) {
        byVin[s.vin] = { score: s.score, buyMax: s.buyMax, reasonCodes: s.reasonCodes };
      }
      
      setData(d => d.map(x => x.vin && byVin[x.vin] ? { ...x, ...byVin[x.vin] } : x));
      alert(`Re-scored ${scores.length} listings.`);
    } catch (e: any) {
      alert('Failed to score: ' + e.message);
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
      alert(`Seeded ${seeded.length} listings to backend.`);
    } catch (e: any) {
      alert('Failed to seed backend: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadFromBackend = async () => {
    try {
      setLoading(true);
      const listings = await ApiService.getListings();
      setData(Array.isArray(listings) && listings.length ? listings : data);
      setBackendOk(true);
    } catch (e: any) {
      alert('Failed to load from backend: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const notify = async (vin: string) => {
    try {
      setLoading(true);
      // Find the listing to get the vehicle_key
      const listing = data.find(l => l.vin === vin);
      if (!listing) {
        alert('Listing not found');
        return;
      }
      
      const res = await ApiService.notifyListing(listing.vehicle_key, vin);
      alert(`Notified for VIN ${vin}: ${res?.[0]?.channel ?? 'ok'}`);
    } catch (e: any) {
      alert('Failed to notify: ' + e.message);
    } finally {
      setLoading(false);
    }
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
    notify
  };
};
