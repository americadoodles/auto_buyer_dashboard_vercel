'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  getSMSHistory, 
  getCommunicationHistory, 
  SMSMessage, 
  SMSHistoryResponse,
  Communication,
  CommunicationHistoryResponse 
} from '../services/listingManagementApi';

interface UseSMSHistoryResult {
  messages: SMSMessage[];
  loading: boolean;
  error: string | null;
  total: number;
  refresh: () => void;
  sendingMessage: boolean;
  setSendingMessage: (sending: boolean) => void;
}

export const useSMSHistory = (contactId: string | null, limit: number = 50): UseSMSHistoryResult => {
  const [messages, setMessages] = useState<SMSMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [sendingMessage, setSendingMessage] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initial fetch when contactId changes
  useEffect(() => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (!contactId) {
      setMessages([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response: SMSHistoryResponse = await getSMSHistory(contactId, limit);
        if (!abortController.signal.aborted) {
          setMessages([...response.messages].reverse());
          setTotal(response.total);
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          console.error('Error fetching SMS history:', err);
          setError(err instanceof Error ? err.message : 'Failed to fetch SMS history');
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      abortController.abort();
    };
  }, [contactId, limit]);

  // Polling for new messages every 10 seconds
  useEffect(() => {
    if (!contactId) return;

    const fetchData = async () => {
      try {
        const response: SMSHistoryResponse = await getSMSHistory(contactId, limit);
        setMessages([...response.messages].reverse());
        setTotal(response.total);
      } catch (err) {
        // Silent fail for polling
        console.error('Error polling SMS history:', err);
      }
    };

    pollIntervalRef.current = setInterval(fetchData, 10000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [contactId, limit]);

  const refresh = useCallback(async () => {
    if (!contactId) return;
    
    setLoading(true);
    try {
      const response: SMSHistoryResponse = await getSMSHistory(contactId, limit);
      setMessages([...response.messages].reverse());
      setTotal(response.total);
    } catch (err) {
      console.error('Error refreshing SMS history:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh SMS history');
    } finally {
      setLoading(false);
    }
  }, [contactId, limit]);

  return {
    messages,
    loading,
    error,
    total,
    refresh,
    sendingMessage,
    setSendingMessage,
  };
};

// New hook for all communications (SMS + Calls)
interface UseCommunicationHistoryResult {
  communications: Communication[];
  loading: boolean;
  error: string | null;
  total: number;
  refresh: () => void;
  sendingMessage: boolean;
  setSendingMessage: (sending: boolean) => void;
}

export const useCommunicationHistory = (
  contactId: string | null, 
  limit: number = 50
): UseCommunicationHistoryResult => {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [sendingMessage, setSendingMessage] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initial fetch when contactId changes
  useEffect(() => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (!contactId) {
      setCommunications([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response: CommunicationHistoryResponse = await getCommunicationHistory(contactId, limit);
        if (!abortController.signal.aborted) {
          setCommunications([...response.communications].reverse());
          setTotal(response.total);
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          console.error('Error fetching communication history:', err);
          setError(err instanceof Error ? err.message : 'Failed to fetch communication history');
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      abortController.abort();
    };
  }, [contactId, limit]);

  // Polling for new communications every 10 seconds
  useEffect(() => {
    if (!contactId) return;

    const fetchData = async () => {
      try {
        const response: CommunicationHistoryResponse = await getCommunicationHistory(contactId, limit);
        setCommunications([...response.communications].reverse());
        setTotal(response.total);
      } catch (err) {
        // Silent fail for polling
        console.error('Error polling communication history:', err);
      }
    };

    pollIntervalRef.current = setInterval(fetchData, 10000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [contactId, limit]);

  const refresh = useCallback(async () => {
    if (!contactId) return;
    
    setLoading(true);
    try {
      const response: CommunicationHistoryResponse = await getCommunicationHistory(contactId, limit);
      setCommunications([...response.communications].reverse());
      setTotal(response.total);
    } catch (err) {
      console.error('Error refreshing communication history:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh communication history');
    } finally {
      setLoading(false);
    }
  }, [contactId, limit]);

  return {
    communications,
    loading,
    error,
    total,
    refresh,
    sendingMessage,
    setSendingMessage,
  };
};
