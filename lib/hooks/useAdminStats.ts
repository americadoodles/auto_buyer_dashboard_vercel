import { useState, useEffect } from 'react';

interface AdminStats {
  totalUsers: number;
  pendingRequests: number;
  activeRoles: number;
  totalListings: number;
  loading: boolean;
  error: string | null;
}

export const useAdminStats = () => {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    pendingRequests: 0,
    activeRoles: 0,
    totalListings: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setStats(prev => ({ ...prev, loading: true, error: null }));
        
        const baseUrl = (process.env.NEXT_PUBLIC_BACKEND_URL ?? '/api').replace(/\/+$/, '');
        
        // Fetch all stats in parallel
        const [usersResponse, signupRequestsResponse, rolesResponse, listingsResponse] = await Promise.all([
          fetch(`${baseUrl}/users/`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
          }),
          fetch(`${baseUrl}/users/signup-requests`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
          }),
          fetch(`${baseUrl}/roles/`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
          }),
          fetch(`${baseUrl}/listings/`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
          }),
        ]);

        const [users, signupRequests, roles, listings] = await Promise.all([
          usersResponse.ok ? usersResponse.json() : [],
          signupRequestsResponse.ok ? signupRequestsResponse.json() : [],
          rolesResponse.ok ? rolesResponse.json() : [],
          listingsResponse.ok ? listingsResponse.json() : [],
        ]);

        setStats({
          totalUsers: Array.isArray(users) ? users.length : 0,
          pendingRequests: Array.isArray(signupRequests) ? signupRequests.length : 0,
          activeRoles: Array.isArray(roles) ? roles.length : 0,
          totalListings: Array.isArray(listings) ? listings.length : 0,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error('Error fetching admin stats:', error);
        setStats(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to fetch statistics',
        }));
      }
    };

    fetchStats();
  }, []);

  return stats;
};
