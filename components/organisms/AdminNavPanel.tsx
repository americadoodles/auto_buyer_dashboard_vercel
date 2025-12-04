"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Users, 
  UserPlus, 
  Shield, 
  ChevronLeft, 
  ChevronRight,
  Home,
  Settings,
  BarChart3,
  Car,
  List,
  Target,
  Phone,
  Handshake,
  CheckSquare
} from 'lucide-react';
import { useAuth } from '../../app/auth/useAuth';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

// Get navigation items based on user role
const getNavItems = (userRole?: string): NavItem[] => {
  const baseItems: NavItem[] = [
    {
      href: '/',
      label: 'Dashboard',
      icon: Home,
    },
    {
      href: '/listings',
      label: 'Vehicle Listings',
      icon: List,
    },
    {
      href: '/crm',
      label: 'CRM Dashboard',
      icon: BarChart3,
    },
    {
      href: '/crm/leads',
      label: 'Leads',
      icon: Target,
    },
    {
      href: '/crm/contacts',
      label: 'Contacts',
      icon: Phone,
    },
    {
      href: '/crm/deals',
      label: 'Deals',
      icon: Handshake,
    },
    {
      href: '/crm/tasks',
      label: 'Tasks',
      icon: CheckSquare,
    },
    {
      href: '/user-management/signup-requests',
      label: 'Signup Requests',
      icon: UserPlus,
    },
    {
      href: '/user-management',
      label: 'Current Users',
      icon: Users,
    },
    {
      href: '/user-management/roles',
      label: 'Role Management',
      icon: Shield,
    }
  ];

  if (userRole === 'admin') {
    return baseItems;
  }

      if (userRole === 'buyer') {
        // Return only listings, leads, contacts, deals, tasks
        return baseItems.filter(item =>
          [
            '/',
            '/listings',
            '/crm/leads',
            '/crm/contacts',
            '/crm/deals',
            '/crm/tasks'
          ].includes(item.href)
        );
      }

  // Default: return all for undefined role, or adjust as needed
  return baseItems;
};

export const AdminNavPanel = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const pathname = usePathname();
  const { user } = useAuth();
  const navItems = getNavItems(user?.role);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const isActiveRoute = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <nav 
      className={`h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300 ease-in-out ${
        isExpanded ? 'w-48' : 'w-14'
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          {isExpanded && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Car className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">Dashboard</span>
            </div>
          )}
          <button
            onClick={toggleExpanded}
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {isExpanded ? (
              <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            )}
          </button>
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 mt-4 flex flex-col">
        <ul className="space-y-1 px-2 flex-1">
          {navItems.map((item) => {
            const isActive = isActiveRoute(item.href);
            const Icon = item.icon;
            
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`group flex items-center px-2 py-1 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-700 dark:border-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  title={!isExpanded ? item.label : undefined}
                >
                  <Icon 
                    className={`w-5 h-5 flex-shrink-0 ${
                      isActive ? 'text-blue-700 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200'
                    }`}
                  />
                  {isExpanded && (
                    <div className="ml-3 min-w-0 flex-1">
                      <span className="text-sm font-medium truncate">
                        {item.label}
                      </span>
                      {/* {item.description && (
                        <p className="text-xs text-gray-500 truncate">
                          {item.description}
                        </p>
                      )} */}
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Footer */}
      {isExpanded && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
            <div className="w-8 h-8 bg-gray-600 dark:bg-gray-600 rounded-full flex items-center justify-center">
              <Settings className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user?.role === 'admin' ? 'Admin Panel' : user?.role === 'buyer' ? 'Buyer Dashboard' : 'Dashboard'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user?.role === 'admin' ? 'Full access control' : user?.role === 'buyer' ? 'Buyer access' : 'User access'}
              </p>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
