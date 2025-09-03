"use client"

import React, { useState } from 'react';
import { AuthFields } from '../molecules/AuthFields';
import { ApiService } from '../../lib/services/api';
import { UserPlus, Shield, Car, TrendingUp, CheckCircle } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Car className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Join Auto Buyer</h1>
          <p className="text-gray-600">Create your account to start buying vehicles</p>
        </div>

        {/* Signup Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="flex items-center space-x-2 mb-6">
            <UserPlus className="w-5 h-5 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">Buyer Signup</h2>
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
              <div className="flex items-center space-x-3 text-sm text-gray-600">
                <Shield className="w-4 h-4 text-green-500" />
                <span>Secure account creation</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-gray-600">
                <Car className="w-4 h-4 text-blue-500" />
                <span>Access to vehicle listings</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-gray-600">
                <TrendingUp className="w-4 h-4 text-purple-500" />
                <span>Market analysis tools</span>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Account Approval Required</p>
                <p className="text-blue-700">Your account will be reviewed by an administrator. You'll receive an email confirmation once approved.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            Already have an account?{' '}
            <a href="/auth" className="text-green-600 hover:text-green-700 font-medium">
              Sign in here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};
