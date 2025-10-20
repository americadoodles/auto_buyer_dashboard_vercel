import { useState, useEffect } from 'react';

interface UserActivityStats {
  user_id: string;
  username: string;
  email: string;
  role: string;
  is_confirmed: boolean;
  last_login: string | null;
  total_listings: number;
  today_listings: number;
  last_activity: string | null;
}

interface UserActivityResponse {
  users: UserActivityStats[];
  total_users: number;
  active_today: number;
  total_listings_today: number;
}

export const useUserActivity = () => {
  const [data, setData] = useState<UserActivityResponse>({
    users: [],
    total_users: 0,
    active_today: 0,
    total_listings_today: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserActivity = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const baseUrl = (process.env.NEXT_PUBLIC_BACKEND_URL ?? '/api').replace(/\/+$/, '');
        
        const response = await fetch(`${baseUrl}/user_activity/`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth.token')}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch user activity: ${response.statusText}`);
        }

        const result = await response.json();
        setData(result);
      } catch (err: any) {
        console.error('Error fetching user activity:', err);
        setError(err.message || 'Failed to fetch user activity data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserActivity();
  }, []);

  return { data, loading, error };
};
