"use client";

import React from 'react';
import { useUserActivity } from '../../lib/hooks/useUserActivity';
import { 
  Users, 
  Activity, 
  Car, 
  Clock, 
  TrendingUp, 
  UserCheck,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface UserActivityCardProps {
  className?: string;
}

const UserActivityCard: React.FC<UserActivityCardProps> = ({ className = "" }) => {
  const { data, loading, error } = useUserActivity();

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

      {/* User List */}
      <div className="p-6">
        <div className="space-y-4">
          {data.users.map((user) => {
            const activityStatus = getActivityStatus(user.last_activity, user.today_listings);
            
            return (
              <div key={user.user_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">
                        {user.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900 truncate">{user.username}</p>
                      {getRoleBadge(user.role)}
                      {!user.is_confirmed && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Pending
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-900">{user.total_listings}</p>
                    <p className="text-xs text-gray-500">Total</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-900">{user.today_listings}</p>
                    <p className="text-xs text-gray-500">Today</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Last Login</p>
                    <p className="text-sm text-gray-900">{formatDate(user.last_login)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Last Activity</p>
                    <p className="text-sm text-gray-900">{formatDate(user.last_activity)}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${activityStatus.bg}`}></div>
                    <span className={`text-xs font-medium ${activityStatus.color}`}>
                      {activityStatus.status === 'active' ? 'Active' :
                       activityStatus.status === 'recent' ? 'Recent' :
                       activityStatus.status === 'inactive' ? 'Inactive' : 'Dormant'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
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
