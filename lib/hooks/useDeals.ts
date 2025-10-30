// Custom hook for Deals data
import { useState, useEffect } from 'react';
import { dealsApi, Deal, DealStage, DealCategory, DealPipeline, SalesPerformanceMetrics } from '../services/dealsApi';

interface UseDealsParams {
  skip?: number;
  limit?: number;
  stage_id?: number;
  category_id?: number;
  assigned_to?: string;
  contact_id?: string;
  search?: string;
  is_won?: boolean;
  is_lost?: boolean;
}

export const useDeals = (params?: UseDealsParams) => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeals = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dealsApi.getDeals(params);
      setDeals(data);
    } catch (err) {
      console.error('Error fetching deals:', err);
      setError('Failed to fetch deals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, [params?.skip, params?.limit, params?.stage_id, params?.category_id, params?.assigned_to, params?.contact_id, params?.search, params?.is_won, params?.is_lost]);

  const refreshDeals = () => {
    fetchDeals();
  };

  return {
    deals,
    loading,
    error,
    refreshDeals
  };
};

export const useDealStages = () => {
  const [stages, setStages] = useState<DealStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStages = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dealsApi.getDealStages();
      setStages(data);
    } catch (err) {
      console.error('Error fetching deal stages:', err);
      setError('Failed to fetch deal stages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStages();
  }, []);

  return {
    stages,
    loading,
    error,
    refreshStages: fetchStages
  };
};

export const useDealCategories = () => {
  const [categories, setCategories] = useState<DealCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dealsApi.getDealCategories();
      setCategories(data);
    } catch (err) {
      console.error('Error fetching deal categories:', err);
      setError('Failed to fetch deal categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return {
    categories,
    loading,
    error,
    refreshCategories: fetchCategories
  };
};

export const useDealPipeline = () => {
  const [pipeline, setPipeline] = useState<DealPipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPipeline = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dealsApi.getDealPipeline();
      setPipeline(data);
    } catch (err) {
      console.error('Error fetching deal pipeline:', err);
      setError('Failed to fetch deal pipeline');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipeline();
  }, []);

  return {
    pipeline,
    loading,
    error,
    refreshPipeline: fetchPipeline
  };
};

export const useSalesMetrics = () => {
  const [metrics, setMetrics] = useState<SalesPerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dealsApi.getSalesMetrics();
      setMetrics(data);
    } catch (err) {
      console.error('Error fetching sales metrics:', err);
      setError('Failed to fetch sales metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return {
    metrics,
    loading,
    error,
    refreshMetrics: fetchMetrics
  };
};
