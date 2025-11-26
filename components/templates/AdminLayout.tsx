"use client";

import React from 'react';
import { AdminNavPanel } from '../organisms/AdminNavPanel';
import { useAuth } from '../../app/auth/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LogOut } from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.replace('/');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminNavPanel />
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        {children}
      </div>
    </div>
  );
};
