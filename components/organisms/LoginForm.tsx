"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../app/auth/useAuth';
import { AuthFields } from '../molecules/AuthFields';
import { ApiService } from '../../lib/services/api';


export const LoginForm: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();
  const { login } = useAuth();

  const handleLogin = async (email: string, password: string) => {
    setLoading(true);
    setMessage('');
    try {
      const user = await ApiService.login({ email, password });
      setMessage('Login successful!');
      login(user); // Persist user info and update global state
      if (user.role === 'admin') {
        router.replace('/'); // Admin dashboard
      } else if (user.role === 'buyer') {
        router.replace('/buyer'); // Buyer page (implement this route)
      } else if (user.role === 'analyst') {
        router.replace('/analyst'); // Analyst page (implement this route)
      } else {
        router.replace('/');
      }
    } catch (err: any) {
      setMessage(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 border rounded shadow">
      <h2 className="text-xl font-bold mb-4">Login</h2>
      <AuthFields onSubmit={handleLogin} loading={loading} submitLabel="Login" />
      {message && <div className="mt-2 text-center text-sm text-green-700">{message}</div>}
    </div>
  );
};
