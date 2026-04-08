"use client"

import React, { useState } from 'react';
import { AuthFields } from '../molecules/AuthFields';
import { ApiService } from '../../lib/services/api';
import { UserPlus, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import CheckIcon from 'assets/svg/check';
import CarIcon from 'assets/svg/car';
import DefenceIcon from 'assets/svg/defence';

export const SignupForm: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSignup = async (email: string, password: string, confirmPassword?: string, username?: string) => {
    setLoading(true);
    setMessage('');
    setError('');
    
    if (confirmPassword !== undefined && password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    
    try {
      if (!username) throw new Error('Username is required');
      // No need to fetch roles; backend will default to buyer role when role_id is missing
      await ApiService.signup({ email, username, password });
      setMessage('Signup request submitted successfully! Awaiting admin confirmation.');
    } catch (err: any) {
      setError(err.message || 'Signup failed');
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
          <h1 className="text-3xl font-bold text-brand-primary mb-2">Join Auto Buyer</h1>
          <p className="text-brand-primary">Create your account to start buying vehicles</p>
        </div>

        {/* Signup Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="flex items-center space-x-2 mb-6">
            <UserPlus className="w-5 h-5 text-brand-primary" />
            <h2 className="text-xl font-semibold text-brand-primary">Buyer Signup</h2>
          </div>
          
          <AuthFields onSubmit={handleSignup} loading={loading} submitLabel="Create Account" showConfirmPassword showUsername />
          
          {/* Messages */}
          {message && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
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
              <div className="flex items-center space-x-3 text-sm text-brand-primary">
                <DefenceIcon className="w-4 h-4" />
                <span>Secure account creation</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-brand-primary">
                <CarIcon className="w-4 h-4" />
                <span>Access to vehicle listings</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-brand-primary">
                <CheckIcon className="w-4 h-4" />
                <span>Market analysis tools</span>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0"></div>
              <div className="text-sm text-brand-primary">
                <p className="font-medium mb-1">Account Approval Required</p>
                <p className="text-brand-primary dark:text-green-400">Your account will be reviewed by an administrator. You'll receive an email confirmation once approved.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-brand-primary dark:text-green-400">
            Already have an account?{' '}
            <a href="/auth" className="text-brand-primary dark:text-green-400 hover:text-brand-primary/80 dark:hover:text-green-300 font-medium">
              Sign in here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};
