// Custom hook for Contacts data
import { useState, useEffect } from 'react';
import { getContacts } from '../services/listingManagementApi';
import type { Contact } from '../types/listing';

interface UseContactsParams {
  skip?: number;
  limit?: number;
  contact_type_id?: number;
  assigned_to?: string;
  search?: string;
  is_active?: boolean;
}

export const useContacts = (params?: UseContactsParams) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContacts = async () => {
    // Don't fetch if params is undefined or limit is 0 (indicates we're waiting for user info)
    if (!params || params.limit === 0) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const data = await getContacts(params);
      setContacts(data);
    } catch (err) {
      console.error('Error fetching contacts:', err);
      setError('Failed to fetch contacts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [params?.skip, params?.limit, params?.contact_type_id, params?.assigned_to, params?.search, params?.is_active]);

  const refreshContacts = () => {
    fetchContacts();
  };

  return {
    contacts,
    loading,
    error,
    refreshContacts
  };
};

