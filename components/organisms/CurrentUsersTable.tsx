"use client";

import React, { useEffect, useState } from "react";
import { ApiService } from "../../lib/services/api";
import { User, UserRemoveRequest } from "../../lib/types/user";

const CurrentUsersTable: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

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

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRemove = async (user_id: string) => {
    setLoading(true);
    setMessage("");
    try {
      const req: UserRemoveRequest = { user_id };
      await ApiService.removeUser(req);
      setMessage("User removed.");
      fetchUsers();
    } catch (err: any) {
      setMessage(err.message || "Remove failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 border rounded shadow">
      <h2 className="text-xl font-bold mb-4">Current Users</h2>
      {loading && <div>Loading...</div>}
      {message && <div className="mb-2 text-green-700">{message}</div>}
      <table className="w-full mb-4 border">
        <thead>
          <tr>
            <th>Email</th>
            <th>Role</th>
            <th>Confirmed</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.email}</td>
              <td>{user.role_id === 1 ? "Admin" : user.role_id === 2 ? "Buyer" : user.role_id === 3 ? "Analyst" : user.role_id}</td>
              <td>{user.is_confirmed ? "Yes" : "No"}</td>
              <td>
                <button className="bg-gray-600 text-white px-2 py-1 rounded" onClick={() => handleRemove(user.id)} disabled={loading}>Remove</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {users.length === 0 && !loading && <div>No users found.</div>}
    </div>
  );
};

export default CurrentUsersTable;
