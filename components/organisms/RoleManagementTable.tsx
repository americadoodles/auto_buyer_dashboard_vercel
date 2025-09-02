"use client";

import React, { useEffect, useState } from "react";
import { ApiService } from "../../lib/services/api";
import { Role, RoleCreate, RoleEdit } from "../../lib/types/role";
import RoleForm from "./RoleForm";


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
      setMessage("Role created.");
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
        setMessage("Role updated.");
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
      setMessage("Role deleted.");
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
    <div className="max-w-2xl mx-auto p-4 border rounded shadow">
      <h2 className="text-xl font-bold mb-4">Role Management</h2>
      {loading && <div>Loading...</div>}
      {message && <div className="mb-2 text-green-700">{message}</div>}
      <RoleForm onSubmit={editing ? handleEdit : handleCreate} initial={editing ?? undefined} loading={loading} submitLabel={editing ? "Update Role" : "Create Role"} />
      <table className="w-full mb-4 border">
        <thead>
          <tr>
            <th>Role</th>
            <th>Description</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {roles.map((role) => (
            <tr key={role.id}>
              <td>{role.name}</td>
              <td>{role.description}</td>
              <td>
                <button className="bg-blue-600 text-white px-2 py-1 rounded mr-2" onClick={() => setEditing(role)} disabled={loading}>Edit</button>
                <button className="bg-red-600 text-white px-2 py-1 rounded" onClick={() => handleDelete(role.id)} disabled={loading}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {roles.length === 0 && !loading && <div>No roles found.</div>}
    </div>
  );
};

export default RoleManagementTable;
