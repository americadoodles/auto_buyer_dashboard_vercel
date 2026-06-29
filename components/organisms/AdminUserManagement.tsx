"use client"

import React, { useEffect, useState } from 'react';
import { ApiService } from '../../lib/services/api';
import { UserSignupRequest, UserConfirmRequest, UserRemoveRequest } from '../../lib/types/user';
import { Role } from '../../lib/types/role';
import { CheckCircle, XCircle, Trash2, UserPlus, AlertCircle } from 'lucide-react';

export const AdminUserManagement: React.FC = () => {
  const [requests, setRequests] = useState<UserSignupRequest[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await ApiService.getSignupRequests();
      setRequests(data);
    } catch (err: any) {
      setMessage(err.message || 'Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const rolesData = await ApiService.getRoles();
      setRoles(rolesData);
    } catch (err: any) {
      console.error('Failed to fetch roles:', err);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchRoles();
  }, []);

  const getRoleName = (roleId: number) => {
    const role = roles.find(r => r.id === roleId);
    return role ? role.name : `Role ${roleId}`;
  };

  const handleConfirm = async (user_id: string, confirm: boolean) => {
    setLoading(true);
    setMessage('');
    try {
      const req: UserConfirmRequest = { user_id, confirm };
      await ApiService.confirmSignup(req);
      setMessage(confirm ? 'User confirmed successfully!' : 'User declined successfully!');
      fetchRequests();
    } catch (err: any) {
      setMessage(err.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (user_id: string) => {
    setLoading(true);
    setMessage('');
    try {
      const req: UserRemoveRequest = { user_id };
      await ApiService.removeUser(req);
      setMessage('User removed successfully!');
      fetchRequests();
    } catch (err: any) {
      setMessage(err.message || 'Remove failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-claude-surface dark:bg-coal-850 rounded-lg shadow-sm border border-claude-border dark:border-coal-700">
      {/* Header */}
      <div className="px-6 py-4 border-b border-claude-border dark:border-coal-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-claude-ink dark:text-coal-100">Pending Signup Requests</h2>
            <p className="text-sm text-claude-muted dark:text-coal-300">
              {requests.length} request{requests.length !== 1 ? 's' : ''} awaiting review
            </p>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className="px-6 py-3 bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-sm text-green-800 dark:text-green-300">{message}</span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          </div>
        ) : requests.length > 0 ? (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-claude-cream dark:bg-coal-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-claude-subtle dark:text-coal-300 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-claude-subtle dark:text-coal-300 uppercase tracking-wider">Username</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-claude-subtle dark:text-coal-300 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-claude-subtle dark:text-coal-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-claude-surface dark:bg-coal-850 divide-y divide-gray-200 dark:divide-gray-700">
                {requests.map((req) => (
                  <tr key={req.id || req.email} className="hover:bg-claude-cream dark:hover:bg-coal-700/50">
                    <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-claude-ink dark:text-coal-100">{req.email}</div></td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-claude-ink dark:text-coal-100">{req.username}</div></td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                        {req.role_id ? getRoleName(req.role_id) : 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleConfirm(req.id || '', true)}
                          disabled={loading}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-coal-100 bg-green-600 dark:bg-green-700 hover:bg-green-700 dark:hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleConfirm(req.id || '', false)}
                          disabled={loading}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-coal-100 bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          Decline
                        </button>
                        <button
                          onClick={() => handleRemove(req.id || '')}
                          disabled={loading}
                          className="inline-flex items-center px-3 py-1.5 border border-claude-divider dark:border-coal-600 text-xs font-medium rounded-md text-claude-text dark:text-coal-300 bg-claude-surface dark:bg-coal-700 hover:bg-claude-cream dark:hover:bg-coal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-claude-sand dark:bg-coal-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-claude-subtle dark:text-coal-500" />
            </div>
            <h3 className="text-lg font-medium text-claude-ink dark:text-coal-100 mb-2">No pending requests</h3>
            <p className="text-claude-subtle dark:text-coal-400">All signup requests have been processed.</p>
          </div>
        )}
      </div>
    </div>
  );
};
