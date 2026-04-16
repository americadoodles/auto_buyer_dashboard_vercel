"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../app/auth/useAuth';
import { AuthFields } from '../molecules/AuthFields';
import { ApiService, ApiError } from '../../lib/services/api';
import { LogIn } from 'lucide-react';
import CheckIcon from 'assets/svg/check';
import CarIcon from 'assets/svg/car';
import DefenceIcon from 'assets/svg/defence';
import Image from 'next/image';

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
      console.log('Attempting login for:', email);
      const user = await ApiService.login({ email, password });
      console.log('Login successful, user:', user);
      
      setMessage('Login successful! Redirecting...');
      login(user); // Persist user info and update global state
      
      // Small delay to show success message
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Route all users to main dashboard
      router.replace('/');
    } catch (err: any) {
      console.error('Login error:', err);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(err.message || 'Login failed. Please check your credentials and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[url('/assets/images/background.png')] bg-cover bg-center dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="flex flex-col items-center justify-center text-center mb-8">
          <Image src="/assets/images/logo.svg" alt="Logo" width={60} height={80} />
          <h1 className="text-3xl font-heading font-bold text-brand-primary dark:text-white mb-2">Welcome Back</h1>
          <p className="text-brand-primary font-heading dark:text-gray-400">Sign in to your Auto Buyer account</p>
        </div>

        {/* Login Form */}
        <div className="bg-primary-light dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8">
          <div className="flex items-center space-x-2 mb-6">
            <LogIn className="w-5 h-5 text-brand-primary dark:text-green-400" />
            <h2 className="text-xl font-heading font-semibold text-brand-primary dark:text-white">Sign In</h2>
          </div>
          
          <AuthFields onSubmit={handleLogin} loading={loading} submitLabel="Sign In" />
          
          {/* Messages */}
          {message && (
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-800 dark:text-green-200">{message}</span>
              </div>
            </div>
          )}
          
          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-sm text-red-800 dark:text-red-200">{error}</span>
              </div>
            </div>
          )}

          {/* Features */}
          <div className="mt-6 pt-6 border-t font-heading border-gray-100 dark:border-gray-700">
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center space-x-3 text-sm text-brand-primary dark:text-gray-400">
                <DefenceIcon />
                <span>Secure authentication</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-brand-primary dark:text-gray-400">
                <CarIcon />
                <span>Access to vehicle listings</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-brand-primary dark:text-gray-400">
                <CheckIcon />
                <span>Real-time market insights</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-brand-primary dark:text-green-400">
            Don't have an account?{' '}
            <a href="/auth/signup" className="text-brand-primary dark:text-green-400 hover:text-brand-primary/80 dark:hover:text-green-300 font-medium">
              Sign up here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};
