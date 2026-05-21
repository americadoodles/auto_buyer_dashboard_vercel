"use client";

import React, { useEffect, useState } from "react";
import { ApiService } from "../../lib/services/api";
import { Role, RoleCreate, RoleEdit } from "../../lib/types/role";
import RoleForm from "./RoleForm";
import { Shield, Edit, Trash2, Plus, CheckCircle } from "lucide-react";

const RoleManagementTable: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<Role | null>(null);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const data = await ApiService.getRoles();
      setRoles(data);
    } catch (err: any) {
      setMessage(err.message || "Failed to fetch roles");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (role: RoleCreate) => {
    setLoading(true);
    setMessage("");
    try {
      await ApiService.createRole(role);
      setMessage("Role created successfully!");
      fetchRoles();
    } catch (err: any) {
      setMessage(err.message || "Create failed");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (role: RoleEdit | RoleCreate) => {
    setLoading(true);
    setMessage("");
    try {
      if ("id" in role) {
        await ApiService.updateRole(role as RoleEdit);
        setMessage("Role updated successfully!");
        setEditing(null);
        fetchRoles();
      } else {
        setMessage("Cannot edit: missing role id.");
      }
    } catch (err: any) {
      setMessage(err.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (roleId: number) => {
    setLoading(true);
    setMessage("");
    try {
      await ApiService.deleteRole(roleId);
      setMessage("Role deleted successfully!");
      fetchRoles();
    } catch (err: any) {
      setMessage(err.message || "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-claude-surface dark:bg-coal-850 rounded-lg shadow-sm border border-claude-border dark:border-coal-700 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-purple-600 dark:text-purple-300" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-claude-ink dark:text-coal-100">Role Management</h2>
            <p className="text-sm text-claude-muted dark:text-coal-200">
              Configure user roles and permissions for your application
            </p>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-sm text-green-800 dark:text-green-200">{message}</span>
            </div>
          </div>
        )}

        {/* Role Form */}
        <RoleForm 
          onSubmit={editing ? handleEdit : handleCreate} 
          initial={editing ?? undefined} 
          loading={loading} 
          submitLabel={editing ? "Update Role" : "Create Role"} 
        />
      </div>

      {/* Roles Table */}
      <div className="bg-claude-surface dark:bg-coal-850 rounded-lg shadow-sm border border-claude-border dark:border-coal-700">
        <div className="px-6 py-4 border-b border-claude-border dark:border-coal-700">
          <h3 className="text-lg font-medium text-claude-ink dark:text-coal-100">Existing Roles</h3>
        </div>
        
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
            </div>
          ) : roles.length > 0 ? (
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-claude-cream dark:bg-coal-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-claude-subtle dark:text-coal-300 uppercase tracking-wider">
                      Role Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-claude-subtle dark:text-coal-300 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-claude-subtle dark:text-coal-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-claude-surface dark:bg-coal-850 divide-y divide-gray-200 dark:divide-gray-700">
                  {roles.map((role) => (
                    <tr key={role.id} className="hover:bg-claude-cream dark:hover:bg-coal-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-claude-ink dark:text-coal-100">{role.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-claude-subtle dark:text-coal-300">
                          {role.description || "No description provided"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setEditing(role)}
                            disabled={loading}
                            className="inline-flex items-center px-3 py-1.5 border border-claude-divider dark:border-coal-600 text-xs font-medium rounded-md text-claude-text dark:text-coal-200 bg-claude-surface dark:bg-coal-700 hover:bg-claude-cream dark:hover:bg-coal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(role.id)}
                            disabled={loading}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-coal-100 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Delete
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
                <Shield className="w-8 h-8 text-claude-subtle dark:text-coal-500" />
              </div>
              <h3 className="text-lg font-medium text-claude-ink dark:text-coal-100 mb-2">No roles found</h3>
              <p className="text-claude-subtle dark:text-coal-300">Create your first role to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoleManagementTable;
