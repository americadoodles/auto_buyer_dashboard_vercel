"use client";

import React from 'react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Car, 
  TrendingUp, 
  Activity,
  BarChart3,
  Settings,
  List
} from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { AdminLayout } from '../../components/templates/AdminLayout';
import { useListings } from '../../lib/hooks/useListings';

interface StatCard {
  title: string;
  value: string | number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const { data: listings, backendOk } = useListings();

  // Dynamic stats based on real data
  const statCards: StatCard[] = [
    {
      title: 'Total Users',
      value: '24', // This would come from user management API
      description: 'Active registered users',
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      title: 'Pending Requests',
      value: '3', // This would come from signup requests API
      description: 'Awaiting approval',
      icon: UserPlus,
      color: 'bg-yellow-500'
    },
    {
      title: 'Active Roles',
      value: '4', // This would come from roles API
      description: 'User role types',
      icon: Shield,
      color: 'bg-green-500'
    },
    {
      title: 'Total Listings',
      value: listings?.length || 0,
      description: 'Vehicle listings',
      icon: Car,
      color: 'bg-purple-500'
    }
  ];

  const quickActions = [
    {
      title: 'Vehicle Listings',
      description: 'View and manage all vehicle listings',
      href: '/admin/listings',
      icon: List,
      color: 'bg-green-100 text-green-700'
    },
    {
      title: 'Review Signup Requests',
      description: 'Approve or decline new user registrations',
      href: '/admin/user-management/signup-requests',
      icon: UserPlus,
      color: 'bg-blue-100 text-blue-700'
    },
    {
      title: 'Manage Users',
      description: 'View and manage existing users',
      href: '/admin/user-management',
      icon: Users,
      color: 'bg-green-100 text-green-700'
    },
    {
      title: 'Configure Roles',
      description: 'Set up user roles and permissions',
      href: '/admin/user-management/roles',
      icon: Shield,
      color: 'bg-purple-100 text-purple-700'
    }
  ];

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="border-b border-gray-200 pb-6">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Welcome back, {user?.email}. Manage your application from here.
          </p>
        </div>

        {/* Backend Status */}
        {backendOk === false && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">
                  Backend not reachable. Some features may be limited.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className={`p-3 rounded-lg ${card.color}`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">{card.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2">{card.description}</p>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <a
                  key={index}
                  href={action.href}
                  className="group p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${action.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                        {action.title}
                      </h3>
                      <p className="text-sm text-gray-500">{action.description}</p>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">New user registration from john@example.com</p>
                <p className="text-xs text-gray-500">2 minutes ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">User role updated for analyst@company.com</p>
                <p className="text-xs text-gray-500">15 minutes ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">New vehicle listing added</p>
                <p className="text-xs text-gray-500">1 hour ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
