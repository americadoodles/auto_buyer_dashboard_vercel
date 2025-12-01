"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserActivity } from '../../lib/hooks/useUserActivity';
import { 
  Users, 
  Activity, 
  Car, 
  Clock, 
  TrendingUp, 
  UserCheck,
  Calendar,
  AlertCircle,
  ArrowUpDown
} from 'lucide-react';
import { TableHeader } from '../molecules/TableHeader';
import { TableRow } from '../molecules/TableRow';

interface UserActivityCardProps {
  className?: string;
}

const UserActivityCard: React.FC<UserActivityCardProps> = ({ className = "" }) => {
  const { data, loading, error } = useUserActivity();
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const router = useRouter();

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  const getActivityStatus = (lastActivity: string | null, todayListings: number) => {
    if (todayListings > 0) return { status: 'active', color: 'text-green-600', bg: 'bg-green-100' };
    if (lastActivity) {
      const lastActivityDate = new Date(lastActivity);
      const now = new Date();
      const diffInDays = Math.floor((now.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffInDays <= 7) return { status: 'recent', color: 'text-yellow-600', bg: 'bg-yellow-100' };
      if (diffInDays <= 30) return { status: 'inactive', color: 'text-orange-600', bg: 'bg-orange-100' };
    }
    return { status: 'dormant', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      admin: { bg: 'bg-red-100', text: 'text-red-800', label: 'Admin' },
      buyer: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Buyer' },
      analyst: { bg: 'bg-green-100', text: 'text-green-800', label: 'Analyst' }
    };
    
    const config = roleConfig[role as keyof typeof roleConfig] || { bg: 'bg-gray-100', text: 'text-gray-800', label: role };
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const getSortedUsers = () => {
    if (!sortConfig) return data.users;
    
    return [...data.users].sort((a, b) => {
      let aValue: any = a[sortConfig.key as keyof typeof a];
      let bValue: any = b[sortConfig.key as keyof typeof b];
      
      // Handle date sorting
      if (sortConfig.key === 'last_login' || sortConfig.key === 'last_activity') {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      }
      
      // Handle string sorting
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const tableColumns = [
    { key: 'user', label: 'User', sortable: true },
    { key: 'role', label: 'Role', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'total_listings', label: 'Total Listings', sortable: true },
    { key: 'today_listings', label: 'Today Listings', sortable: true },
    { key: 'last_login', label: 'Last Login', sortable: true },
    { key: 'last_activity', label: 'Last Activity', sortable: true },
    { key: 'activity_status', label: 'Activity Status', sortable: true }
  ];

  const handleUserClick = (userId: string) => {
    router.push(`/buyer-activity/${userId}`);
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center space-x-3 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm font-medium">Error loading user activity: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">User Activity Overview</h2>
              <p className="text-sm text-gray-600">
                {data.total_users} users • {data.active_today} active today • {data.total_listings_today} listings today
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <Users className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">{data.total_users}</p>
              <p className="text-xs text-gray-500">Total Users</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
            <UserCheck className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">{data.active_today}</p>
              <p className="text-xs text-gray-500">Active Today</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
            <Car className="w-5 h-5 text-purple-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">{data.total_listings_today}</p>
              <p className="text-xs text-gray-500">Listings Today</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg">
            <TrendingUp className="w-5 h-5 text-orange-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                {data.total_users > 0 ? Math.round((data.active_today / data.total_users) * 100) : 0}%
              </p>
              <p className="text-xs text-gray-500">Activity Rate</p>
            </div>
          </div>
        </div>
      </div>

      {/* User Activity Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <TableHeader 
            columns={tableColumns} 
            onColumnSort={handleSort}
          />
          <tbody className="bg-white divide-y divide-gray-200">
            {getSortedUsers().map((user) => {
              const activityStatus = getActivityStatus(user.last_activity, user.today_listings);
              
              return (
                <TableRow 
                  key={user.user_id}
                  onClick={() => handleUserClick(user.user_id)}
                  className="cursor-pointer hover:bg-gray-50 transition-colors duration-200"
                >
                  {/* User */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {user.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.username}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  
                  {/* Role */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRoleBadge(user.role)}
                  </td>
                  
                  {/* Status */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {user.is_confirmed ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Confirmed
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Pending
                        </span>
                      )}
                    </div>
                  </td>
                  
                  {/* Total Listings */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.total_listings}
                  </td>
                  
                  {/* Today Listings */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.today_listings}
                  </td>
                  
                  {/* Last Login */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(user.last_login)}
                  </td>
                  
                  {/* Last Activity */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(user.last_activity)}
                  </td>
                  
                  {/* Activity Status */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${activityStatus.bg}`}></div>
                      <span className={`text-sm font-medium ${activityStatus.color}`}>
                        {activityStatus.status === 'active' ? 'Active' :
                         activityStatus.status === 'recent' ? 'Recent' :
                         activityStatus.status === 'inactive' ? 'Inactive' : 'Dormant'}
                      </span>
                    </div>
                  </td>
                </TableRow>
              );
            })}
          </tbody>
        </table>
        
        {data.users.length === 0 && (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-500">No user activity data available.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserActivityCard;
