"use client";

import React, { useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { ApiService } from '../../lib/services/api';

export default function TestAuthPage() {
  const { user, loading, login, logout } = useAuth();
  const [testEmail, setTestEmail] = useState('test@example.com');
  const [testPassword, setTestPassword] = useState('password');
  const [testResult, setTestResult] = useState<string>('');
  const [isTesting, setIsTesting] = useState(false);

  const testLogin = async () => {
    setIsTesting(true);
    setTestResult('Testing login...');
    
    try {
      console.log('Testing login with:', testEmail);
      const user = await ApiService.login({ email: testEmail, password: testPassword });
      setTestResult(`Login successful! User: ${JSON.stringify(user, null, 2)}`);
      login(user);
    } catch (error: any) {
      setTestResult(`Login failed: ${error.message}`);
      console.error('Login test error:', error);
    } finally {
      setIsTesting(false);
    }
  };

  const testMe = async () => {
    setIsTesting(true);
    setTestResult('Testing /me endpoint...');
    
    try {
      const user = await ApiService.me();
      setTestResult(`/me successful! User: ${JSON.stringify(user, null, 2)}`);
    } catch (error: any) {
      setTestResult(`/me failed: ${error.message}`);
      console.error('/me test error:', error);
    } finally {
      setIsTesting(false);
    }
  };

  const clearStorage = () => {
    localStorage.removeItem('auth.token');
    localStorage.removeItem('user');
    setTestResult('Storage cleared');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Authentication Test Page</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Current Auth State */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Current Auth State</h2>
            <div className="space-y-2">
              <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
              <p><strong>User:</strong> {user ? JSON.stringify(user, null, 2) : 'None'}</p>
              <p><strong>Token:</strong> {typeof window !== 'undefined' ? localStorage.getItem('auth.token')?.substring(0, 20) + '...' : 'N/A'}</p>
            </div>
          </div>

          {/* Test Controls */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Test Email:</label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Test Password:</label>
                <input
                  type="password"
                  value={testPassword}
                  onChange={(e) => setTestPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={testLogin}
                  disabled={isTesting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Test Login
                </button>
                
                <button
                  onClick={testMe}
                  disabled={isTesting}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  Test /me
                </button>
                
                <button
                  onClick={clearStorage}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Clear Storage
                </button>
                
                <button
                  onClick={logout}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Test Results */}
        <div className="mt-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-sm">
            {testResult || 'No tests run yet'}
          </pre>
        </div>

        {/* Back to Auth */}
        <div className="mt-8 text-center">
          <a
            href="/auth"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Login Page
          </a>
        </div>
      </div>
    </div>
  );
}
