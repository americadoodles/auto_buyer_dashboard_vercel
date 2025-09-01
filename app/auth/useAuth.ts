import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '../../lib/types/user';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Replace with real auth logic (e.g., check cookie, localStorage, API)
    const stored = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (stored) {
      setUser(JSON.parse(stored));
    }
    setLoading(false);
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
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user');
    }
    router.replace('/auth');
  };

  return { user, loading, login, logout };
}
