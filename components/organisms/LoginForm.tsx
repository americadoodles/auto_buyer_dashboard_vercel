"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../app/auth/useAuth';
import { AuthFields } from '../molecules/AuthFields';
import { ApiService } from '../../lib/services/api';
import { LogIn, Shield, Car, TrendingUp } from 'lucide-react';

export const LoginForm: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { login } = useAuth();

  const handleLogin = async (email: string, password: string) => {
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const user = await ApiService.login({ email, password });
      setMessage('Login successful! Redirecting...');
      login(user); // Persist user info and update global state
      
      // Route based on role
      if (user.role === 'admin') {
        router.replace('/admin'); // Admin dashboard
      } else if (user.role === 'buyer') {
        router.replace('/'); // Buyer dashboard (same as main for now)
      } else if (user.role === 'analyst') {
        router.replace('/'); // Analyst dashboard (same as main for now)
      } else {
        router.replace('/'); // Default to main dashboard
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Car className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to your Auto Buyer account</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="flex items-center space-x-2 mb-6">
            <LogIn className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Sign In</h2>
          </div>
          
          <AuthFields onSubmit={handleLogin} loading={loading} submitLabel="Sign In" />
          
          {/* Messages */}
          {message && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-800">{message}</span>
              </div>
            </div>
          )}
          
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-sm text-red-800">{error}</span>
              </div>
            </div>
          )}

          {/* Features */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center space-x-3 text-sm text-gray-600">
                <Shield className="w-4 h-4 text-green-500" />
                <span>Secure authentication</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-gray-600">
                <Car className="w-4 h-4 text-blue-500" />
                <span>Access to vehicle listings</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-gray-600">
                <TrendingUp className="w-4 h-4 text-purple-500" />
                <span>Real-time market insights</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            Don't have an account?{' '}
            <a href="/auth/signup" className="text-blue-600 hover:text-blue-700 font-medium">
              Sign up here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};
