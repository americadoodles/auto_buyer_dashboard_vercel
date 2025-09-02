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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Pending Signup Requests</h2>
            <p className="text-sm text-gray-600">
              {requests.length} request{requests.length !== 1 ? 's' : ''} awaiting review
            </p>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className="px-6 py-3 bg-green-50 border-b border-green-200">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-800">{message}</span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : requests.length > 0 ? (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requests.map((req) => (
                  <tr key={req.id || req.email} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{req.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {req.role_id ? getRoleName(req.role_id) : 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleConfirm(req.id || '', true)}
                          disabled={loading}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleConfirm(req.id || '', false)}
                          disabled={loading}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          Decline
                        </button>
                        <button
                          onClick={() => handleRemove(req.id || '')}
                          disabled={loading}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No pending requests</h3>
            <p className="text-gray-500">All signup requests have been processed.</p>
          </div>
        )}
      </div>
    </div>
  );
};
