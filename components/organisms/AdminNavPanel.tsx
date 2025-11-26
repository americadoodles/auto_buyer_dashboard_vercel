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
  User,
  Target,
  Phone,
  Handshake,
  CheckSquare,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../app/auth/useAuth';

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
  },
  {
    href: '/admin/listings',
    label: 'Vehicle Listings',
    icon: List,
  },
  {
    href: '/admin/crm',
    label: 'CRM Dashboard',
    icon: BarChart3,
  },
  {
    href: '/admin/crm/leads',
    label: 'Leads',
    icon: Target,
  },
  {
    href: '/admin/crm/contacts',
    label: 'Contacts',
    icon: Phone,
  },
  {
    href: '/admin/crm/deals',
    label: 'Deals',
    icon: Handshake,
  },
  {
    href: '/admin/crm/tasks',
    label: 'Tasks',
    icon: CheckSquare,
  },
  {
    href: '/admin/user-management/signup-requests',
    label: 'Signup Requests',
    icon: UserPlus,
  },
  {
    href: '/admin/user-management',
    label: 'Current Users',
    icon: Users,
  },
  {
    href: '/admin/user-management/roles',
    label: 'Role Management',
    icon: Shield,
  },
  {
    href: '/admin/profile',
    label: 'My Profile',
    icon: User,
  }
];

export const AdminNavPanel = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const pathname = usePathname();
  const { logout } = useAuth();

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const handleLogout = () => {
    logout();
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
        isExpanded ? 'w-48' : 'w-14'
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
                      ? 'bg-blue-50 text-blue-700 border-blue-700'
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

        {/* Logout Button */}
        <div className="p-2 border-t border-gray-200">
          <div>
            <button
              onClick={handleLogout}
              className="group flex items-center px-2 py-1 rounded-lg transition-all duration-200 text-red-600 hover:bg-red-50 hover:text-red-700 w-full"
              title={!isExpanded ? 'Logout' : undefined}
            >
              <LogOut 
                className="w-5 h-5 flex-shrink-0 text-red-600 group-hover:text-red-700"
              />
              {isExpanded && (
                <span className="ml-3 text-sm font-medium">
                  Logout
                </span>
              )}
            </button>
          </div>
        </div>
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
