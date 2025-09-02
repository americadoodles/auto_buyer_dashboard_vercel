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
    <div className="max-w-2xl mx-auto p-4 border rounded shadow">
      <h2 className="text-xl font-bold mb-4">Signup Requests</h2>
      {loading && <div>Loading...</div>}
      {message && <div className="mb-2 text-green-700">{message}</div>}
      <table className="w-full mb-4 border">
        <thead>
          <tr>
            <th>Email</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((req) => (
            <tr key={req.id || req.email}>
              <td>{req.email}</td>
              <td>{req.role_id === 1 ? "Admin" : req.role_id === 2 ? "Buyer" : req.role_id === 3 ? "Analyst" : req.role_id}</td>
              <td>
                <button className="bg-green-600 text-white px-2 py-1 rounded mr-2" onClick={() => handleConfirm(req.id || '', true)} disabled={loading}>Confirm</button>
                <button className="bg-red-600 text-white px-2 py-1 rounded mr-2" onClick={() => handleConfirm(req.id || '', false)} disabled={loading}>Decline</button>
                <button className="bg-gray-600 text-white px-2 py-1 rounded" onClick={() => handleRemove(req.id || '')} disabled={loading}>Remove</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {requests.length === 0 && !loading && <div>No signup requests found.</div>}
    </div>
  );
};

export default SignupRequestsTable;
