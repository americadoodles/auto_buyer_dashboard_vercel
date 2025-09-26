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
  User
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

const navItems: NavItem[] = [
  {
    href: '/admin',
    label: 'Dashboard',
    icon: Home,
    description: 'Main dashboard view'
  },
  {
    href: '/admin/listings',
    label: 'Vehicle Listings',
    icon: List,
    description: 'View and manage vehicle listings'
  },
  {
    href: '/admin/user-management/signup-requests',
    label: 'Signup Requests',
    icon: UserPlus,
    description: 'Approve new user registrations'
  },
  {
    href: '/admin/user-management',
    label: 'Current Users',
    icon: Users,
    description: 'Manage existing users'
  },
  {
    href: '/admin/user-management/roles',
    label: 'Role Management',
    icon: Shield,
    description: 'Configure user roles and permissions'
  },
  {
    href: '/admin/profile',
    label: 'My Profile',
    icon: User,
    description: 'Manage your profile and settings'
  }
];

export const AdminNavPanel = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const pathname = usePathname();

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const isActiveRoute = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    if (href === '/admin/profile') {
      return pathname === '/admin/profile';
    }
    return pathname.startsWith(href);
  };

  return (
    <nav 
      className={`h-full bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out ${
        isExpanded ? 'w-64' : 'w-16'
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {isExpanded && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Car className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">Admin</span>
            </div>
          )}
          <button
            onClick={toggleExpanded}
            className="p-1 rounded-md hover:bg-gray-100 transition-colors"
            title={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {isExpanded ? (
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 py-4">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => {
            const isActive = isActiveRoute(item.href);
            const Icon = item.icon;
            
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`group flex items-center px-3 py-2 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  title={!isExpanded ? item.label : undefined}
                >
                  <Icon 
                    className={`w-5 h-5 flex-shrink-0 ${
                      isActive ? 'text-blue-700' : 'text-gray-500 group-hover:text-gray-700'
                    }`}
                  />
                  {isExpanded && (
                    <div className="ml-3 min-w-0 flex-1">
                      <span className="text-sm font-medium truncate">
                        {item.label}
                      </span>
                      {item.description && (
                        <p className="text-xs text-gray-500 truncate">
                          {item.description}
                        </p>
                      )}
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
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50">
            <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
              <Settings className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                Admin Panel
              </p>
              <p className="text-xs text-gray-500 truncate">
                Full access control
              </p>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
