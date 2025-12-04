"use client";

import React, { useEffect, useState } from "react";
import { ApiService } from "../../lib/services/api";
import { UserSignupRequest, UserConfirmRequest, UserRemoveRequest } from "../../lib/types/user";

const SignupRequestsTable: React.FC = () => {
  const [requests, setRequests] = useState<UserSignupRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await ApiService.getSignupRequests();
      setRequests(data);
    } catch (err: any) {
      setMessage(err.message || "Failed to fetch requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleConfirm = async (user_id: string, confirm: boolean) => {
    setLoading(true);
    setMessage("");
    try {
      const req: UserConfirmRequest = { user_id, confirm };
      await ApiService.confirmSignup(req);
      setMessage(confirm ? "User confirmed." : "User declined.");
      fetchRequests();
    } catch (err: any) {
      setMessage(err.message || "Action failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (user_id: string) => {
    setLoading(true);
    setMessage("");
    try {
      const req: UserRemoveRequest = { user_id };
      await ApiService.removeUser(req);
      setMessage("User removed.");
      fetchRequests();
    } catch (err: any) {
      setMessage(err.message || "Remove failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 border border-gray-200 dark:border-gray-700 rounded shadow bg-white dark:bg-gray-800">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Signup Requests</h2>
      {loading && <div className="text-gray-600 dark:text-gray-300">Loading...</div>}
      {message && <div className="mb-2 text-green-700 dark:text-green-400">{message}</div>}
      <table className="w-full mb-4 border border-gray-200 dark:border-gray-700">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-700">
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600">Email</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600">Username</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600">Role</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600">Actions</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((req) => (
            <tr key={req.id || req.email} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{req.email}</td>
              <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{req.username}</td>
              <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{req.role_name}</td>
              <td className="px-4 py-2">
                <button className="bg-green-600 dark:bg-green-700 hover:bg-green-700 dark:hover:bg-green-600 text-white px-2 py-1 rounded mr-2 disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => handleConfirm(req.id || '', true)} disabled={loading}>Confirm</button>
                <button className="bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-600 text-white px-2 py-1 rounded mr-2 disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => handleConfirm(req.id || '', false)} disabled={loading}>Decline</button>
                <button className="bg-gray-600 dark:bg-gray-700 hover:bg-gray-700 dark:hover:bg-gray-600 text-white px-2 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => handleRemove(req.id || '')} disabled={loading}>Remove</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {requests.length === 0 && !loading && <div className="text-gray-600 dark:text-gray-400">No signup requests found.</div>}
    </div>
  );
};

export default SignupRequestsTable;
