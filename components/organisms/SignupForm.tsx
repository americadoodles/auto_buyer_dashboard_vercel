"use client"

import React, { useState } from 'react';
import { AuthFields } from '../molecules/AuthFields';
import { ApiService } from '../../lib/services/api';


export const SignupForm: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSignup = async (email: string, password: string, confirmPassword?: string) => {
    setLoading(true);
    setMessage('');
    if (confirmPassword !== undefined && password !== confirmPassword) {
      setMessage('Passwords do not match');
      setLoading(false);
      return;
    }
    try {
      // Fetch buyer role_id from backend
      const roles = await ApiService.getRoles();
      const buyerRole = roles.find(r => r.name === 'buyer');
      if (!buyerRole) throw new Error('Buyer role not found');
      await ApiService.signup({ email, password, role_id: buyerRole.id });
      setMessage('Signup request submitted! Await admin confirmation.');
    } catch (err: any) {
      setMessage(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 border rounded shadow">
      <h2 className="text-xl font-bold mb-4">Buyer Signup</h2>
      <AuthFields onSubmit={handleSignup} loading={loading} submitLabel="Sign Up" showConfirmPassword />
      {message && <div className="mt-2 text-center text-sm text-green-700">{message}</div>}
    </div>
  );
};
