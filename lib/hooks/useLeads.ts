// Custom hook for Leads data
import { useState, useEffect } from 'react';
import { leadsApi } from '../services/leadsApi';
import type { Lead, LeadStatus, LeadSource, LeadSummary, LeadConversionMetrics } from '../types/lead';

interface UseLeadsParams {
  skip?: number;
  limit?: number;
  status_id?: number;
  source_id?: number;
  assigned_to?: string;
  search?: string;
}

export const useLeads = (params?: UseLeadsParams) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = async () => {
    // Don't fetch if params is undefined or limit is 0 (indicates we're waiting for user info)
    if (!params || params.limit === 0) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const data = await leadsApi.getLeads(params);
      setLeads(data);
    } catch (err) {
      console.error('Error fetching leads:', err);
      setError('Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [params?.skip, params?.limit, params?.status_id, params?.source_id, params?.assigned_to, params?.search]);

  const refreshLeads = () => {
    fetchLeads();
  };

  return {
    leads,
    loading,
    error,
    refreshLeads
  };
};

export const useLeadStatuses = () => {
  const [statuses, setStatuses] = useState<LeadStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatuses = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await leadsApi.getLeadStatuses();
      setStatuses(data);
    } catch (err) {
      console.error('Error fetching lead statuses:', err);
      setError('Failed to fetch lead statuses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatuses();
  }, []);

  return {
    statuses,
    loading,
    error,
    refreshStatuses: fetchStatuses
  };
};

export const useLeadSources = () => {
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSources = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await leadsApi.getLeadSources();
      setSources(data);
    } catch (err) {
      console.error('Error fetching lead sources:', err);
      setError('Failed to fetch lead sources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  return {
    sources,
    loading,
    error,
    refreshSources: fetchSources
  };
};

export const useLeadSummary = () => {
  const [summary, setSummary] = useState<LeadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await leadsApi.getLeadSummary();
      setSummary(data);
    } catch (err) {
      console.error('Error fetching lead summary:', err);
      setError('Failed to fetch lead summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  return {
    summary,
    loading,
    error,
    refreshSummary: fetchSummary
  };
};

export const useLeadMetrics = () => {
  const [metrics, setMetrics] = useState<LeadConversionMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await leadsApi.getLeadMetrics();
      setMetrics(data);
    } catch (err) {
      console.error('Error fetching lead metrics:', err);
      setError('Failed to fetch lead metrics');
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
