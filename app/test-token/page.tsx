'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../auth/useAuth';
import { createTestTokenWithExpiration, isTokenExpired } from '../../lib/utils/tokenTest';
import { useToast } from '../../hooks/useToast';

export default function TestTokenPage() {
  const { user, logout, validateToken } = useAuth();
  const { showSuccess, showError } = useToast();
  const [testToken, setTestToken] = useState<string>('');
  const [tokenStatus, setTokenStatus] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (testToken) {
      const interval = setInterval(() => {
        const expired = isTokenExpired(testToken);
        setTokenStatus(expired ? 'EXPIRED' : 'VALID');
        
        if (!expired) {
          try {
            const payload = JSON.parse(atob(testToken.split('.')[1]));
            const exp = payload.exp;
            const remaining = Math.max(0, exp * 1000 - Date.now());
            setTimeLeft(Math.floor(remaining / 1000));
          } catch {
            setTimeLeft(0);
          }
        } else {
          setTimeLeft(0);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [testToken]);

  const createShortLivedToken = () => {
    const token = createTestTokenWithExpiration(0.1); // 6 seconds
    setTestToken(token);
    localStorage.setItem('auth.token', token);
  };

  const createNormalToken = () => {
    const token = createTestTokenWithExpiration(60); // 60 minutes
    setTestToken(token);
    localStorage.setItem('auth.token', token);
  };

  const clearToken = () => {
    setTestToken('');
    localStorage.removeItem('auth.token');
    setTokenStatus('');
    setTimeLeft(0);
  };

  const testApiCall = async () => {
    try {
      const response = await fetch('/api/users/me', {
        headers: {
          'Authorization': `Bearer ${testToken}`
        }
      });
      
      if (response.ok) {
        showSuccess('API Test Successful', 'API call successful!');
      } else {
        showError('API Test Failed', `API call failed: ${response.status}`);
      }
    } catch (error) {
      showError('API Test Error', `API call error: ${error}`);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please log in to test token expiration</h1>
          <a href="/auth" className="text-blue-600 hover:text-blue-800">Go to Login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Token Expiration Test</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current User</h2>
          <p className="text-gray-600">Logged in as: {user.email}</p>
          <p className="text-gray-600">Role: {user.role || 'N/A'}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Token Test Controls</h2>
          <div className="space-y-4">
            <div className="flex space-x-4">
              <button
                onClick={createShortLivedToken}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Create 6-Second Token
              </button>
              <button
                onClick={createNormalToken}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Create 60-Minute Token
              </button>
              <button
                onClick={clearToken}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Clear Token
              </button>
            </div>
            
            {testToken && (
              <div className="mt-4 p-4 bg-gray-100 rounded">
                <p className="text-sm text-gray-600 mb-2">Token Status: 
                  <span className={`ml-2 px-2 py-1 rounded text-xs font-semibold ${
                    tokenStatus === 'VALID' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                  }`}>
                    {tokenStatus}
                  </span>
                </p>
                {timeLeft > 0 && (
                  <p className="text-sm text-gray-600">Time remaining: {timeLeft} seconds</p>
                )}
                <button
                  onClick={testApiCall}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Test API Call
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">How to Test</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-600">
            <li>Click "Create 6-Second Token" to create a token that expires in 6 seconds</li>
            <li>Watch the countdown timer - when it reaches 0, the token will be marked as EXPIRED</li>
            <li>Try making an API call with an expired token - you should be automatically logged out</li>
            <li>Use "Create 60-Minute Token" for normal testing</li>
            <li>Use "Clear Token" to remove the test token</li>
          </ol>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Auto-Logout Features</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li>Token expiration is checked before every API request</li>
            <li>If a token is expired, the user is automatically logged out</li>
            <li>Expired tokens trigger a redirect to the login page</li>
            <li>All authentication state is cleared when logout occurs</li>
          </ul>
        </div>

        <div className="mt-6">
          <button
            onClick={logout}
            className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
