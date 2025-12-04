"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiService } from "../../lib/services/api";
import { User, UserRemoveRequest } from "../../lib/types/user";
import { Role } from "../../lib/types/role";
import { Users, Trash2, CheckCircle, XCircle, Activity, Edit } from "lucide-react";
import UserEditModal from "./UserEditModal";

const CurrentUsersTable: React.FC = () => {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [userToRemove, setUserToRemove] = useState<User | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await ApiService.getUsers();
      setUsers(data);
    } catch (err: any) {
      setMessage(err.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const data = await ApiService.getRoles();
      setRoles(data);
    } catch (err: any) {
      console.error("Failed to fetch roles:", err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const handleRemoveClick = (user: User) => {
    setUserToRemove(user);
    setIsDeleteModalOpen(true);
  };

  const handleRemove = async () => {
    if (!userToRemove) return;
    
    setLoading(true);
    setMessage("");
    try {
      const req: UserRemoveRequest = { user_id: userToRemove.id };
      await ApiService.removeUser(req);
      setMessage("User removed successfully!");
      setIsDeleteModalOpen(false);
      setUserToRemove(null);
      fetchUsers();
    } catch (err: any) {
      setMessage(err.message || "Remove failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setUserToRemove(null);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsEditModalOpen(true);
  };

  const handleUserUpdated = (updatedUser: User) => {
    setUsers(users.map(user => user.id === updatedUser.id ? updatedUser : user));
    setIsEditModalOpen(false);
    setEditingUser(null);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingUser(null);
  };

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      admin: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-300', label: 'Admin' },
      buyer: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-300', label: 'Buyer' },
      analyst: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300', label: 'Analyst' }
    };
    
    const config = roleConfig[role as keyof typeof roleConfig] || { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-800 dark:text-gray-300', label: role };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getStatusBadge = (isConfirmed: boolean) => {
    if (isConfirmed) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
          <CheckCircle className="w-3 h-3 mr-1" />
          Confirmed
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
          <XCircle className="w-3 h-3 mr-1" />
          Pending
        </span>
      );
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Current Users</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {users.length} user{users.length !== 1 ? 's' : ''} registered
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
        ) : users.length > 0 ? (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Username</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900 dark:text-white">{user.email}</div></td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-900 dark:text-white">{user.username}</div></td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(user.is_confirmed)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="inline-flex items-center px-3 py-1.5 border border-green-300 dark:border-green-700 text-xs font-medium rounded-md text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-green-400"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </button>
                        <button
                          onClick={() => router.push(`/buyer-activity/${user.id}`)}
                          className="inline-flex items-center px-3 py-1.5 border border-blue-300 dark:border-blue-700 text-xs font-medium rounded-md text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                        >
                          <Activity className="w-3 h-3 mr-1" />
                          View Activity
                        </button>
                        <button
                          onClick={() => handleRemoveClick(user)}
                          disabled={loading}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No users found</h3>
            <p className="text-gray-500 dark:text-gray-400">No users have been registered yet.</p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <UserEditModal
          user={editingUser}
          roles={roles}
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          onUserUpdated={handleUserUpdated}
        />
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && userToRemove && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black/70 flex items-center justify-center z-50" onClick={handleCloseDeleteModal}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Confirm Removal</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                Are you sure you want to remove <span className="font-medium text-gray-900 dark:text-white">{userToRemove.username}</span> ({userToRemove.email})? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleCloseDeleteModal}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRemove}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 dark:bg-red-700 border border-transparent rounded-md hover:bg-red-700 dark:hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Removing...' : 'Remove'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CurrentUsersTable;
