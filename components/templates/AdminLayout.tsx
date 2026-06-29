"use client";

import React from 'react';
import { AdminNavPanel } from '../organisms/AdminNavPanel';
import { Header } from '../organisms/Header';
import { useAuth } from '../../app/auth/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { TwilioProvider } from '../../lib/contexts/TwilioContext';
import { IncomingCallNotification } from '../organisms/IncomingCallNotification';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <TwilioProvider>
      <div className="flex h-screen bg-claude-cream dark:bg-coal-900 overflow-hidden">
        <AdminNavPanel />
        <div className="flex-1 overflow-hidden min-w-0 h-full flex flex-col">
          <Header />
          <div className="flex-1 overflow-y-auto bg-claude-cream dark:bg-coal-900">
            {children}
          </div>
        </div>
      </div>
      {/* Global incoming call notification overlay */}
      <IncomingCallNotification />
    </TwilioProvider>
  );
};
