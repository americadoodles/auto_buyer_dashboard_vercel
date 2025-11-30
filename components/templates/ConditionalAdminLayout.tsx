"use client";

import { usePathname } from 'next/navigation';
import { AdminLayout } from './AdminLayout';

interface ConditionalAdminLayoutProps {
  children: React.ReactNode;
}

export const ConditionalAdminLayout: React.FC<ConditionalAdminLayoutProps> = ({ children }) => {
  const pathname = usePathname();
  
  // Don't apply AdminLayout to auth routes
  const isAuthRoute = pathname?.startsWith('/auth') || pathname === '/test-auth' || pathname === '/test-token';
  
  if (isAuthRoute) {
    return <>{children}</>;
  }
  
  return <AdminLayout>{children}</AdminLayout>;
};

