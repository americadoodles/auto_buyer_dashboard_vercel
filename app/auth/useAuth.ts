import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '../../lib/types/user';
import { ApiService } from '../../lib/services/api';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const checkTokenValidity = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth.token') : null;
    if (!token) return false;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp;
      if (!exp) return false;
      return Date.now() < exp * 1000;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check if token is valid first
        if (!checkTokenValidity()) {
          // Token is expired or invalid, clear everything
          localStorage.removeItem('user');
          localStorage.removeItem('auth.token');
          setUser(null);
          setLoading(false);
          return;
        }

        // Try to get user info from API to verify token
        const userData = await ApiService.me();
        setUser(userData);
      } catch (error) {
        // API call failed, likely due to expired token
        localStorage.removeItem('user');
        localStorage.removeItem('auth.token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = (user: User) => {
    setUser(user);
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(user));
    }
    router.replace('/');
  };

  const logout = () => {
    setUser(null);
    ApiService.logout();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user');
    }
    router.replace('/auth');
  };

  const validateToken = () => {
    return checkTokenValidity();
  };

  return { user, loading, login, logout, validateToken };
}
