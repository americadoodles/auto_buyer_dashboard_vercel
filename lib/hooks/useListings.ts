import { useState, useEffect, useMemo } from 'react';
import { Listing, SortConfig } from '../types/listing';
import { MOCK_DATA } from '../data/mockData';
import { ApiService } from '../services/api';

export const useListings = () => {
  const [data, setData] = useState<Listing[]>(MOCK_DATA);
  const [sort, setSort] = useState<SortConfig>({ key: 'score', dir: 'desc' });
  const [loading, setLoading] = useState<boolean>(false);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);

  const sortedRows = useMemo(() => {
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...data].sort((a, b) => {
      const av = a[sort.key] as any;
      const bv = b[sort.key] as any;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [data, sort]);

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
        }
      } catch {
        if (!mounted) return;
        setBackendOk(false);
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
      
      setData(d => d.map(x => byVin[x.vin] ? { ...x, ...byVin[x.vin] } : x));
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
    sort,
    setSort,
    loading,
    backendOk,
    rescoreVisible,
    seedBackend,
    loadFromBackend,
    notify
  };
};
