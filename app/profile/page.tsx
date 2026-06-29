"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ApiService } from "../../lib/services/api";
import { User, UserUpdateRequest, UserUpdatePasswordRequest } from "../../lib/types/user";
import { User as UserIcon, Save, Eye, EyeOff, ArrowLeft } from "lucide-react";

const ProfilePage: React.FC = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [activeTab, setActiveTab] = useState<"profile" | "password">("profile");
  const [showPassword, setShowPassword] = useState(false);

  const [profileData, setProfileData] = useState<UserUpdateRequest>({
    email: "",
    username: "",
  });

  const [passwordData, setPasswordData] = useState<UserUpdatePasswordRequest>({
    current_password: "",
    new_password: "",
  });

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    setLoading(true);
    try {
      const userData = await ApiService.me();
      setUser(userData);
      setProfileData({
        email: userData.email,
        username: userData.username,
      });
    } catch (err: any) {
      setMessage(err.message || "Failed to fetch profile");
      if (err.status === 401) {
        router.push("/auth");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setMessageType("success");

    try {
      const updatedUser = await ApiService.updateMyProfile(profileData);
      setUser(updatedUser);
      setMessage("Profile updated successfully!");
      setMessageType("success");
    } catch (err: any) {
      setMessage(err.message || "Failed to update profile");
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setMessageType("success");

    try {
      await ApiService.updateMyPassword(passwordData);
      setMessage("Password updated successfully!");
      setMessageType("success");
      setPasswordData({
        current_password: "",
        new_password: "",
      });
    } catch (err: any) {
      setMessage(err.message || "Failed to update password");
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-claude-cream flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-claude-cream flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-claude-ink mb-2">Profile not found</h2>
          <p className="text-claude-muted mb-4">Unable to load your profile information.</p>
          <button
            onClick={() => router.push("/auth")}
            className="text-blue-600 hover:text-blue-800"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-claude-cream">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center text-sm text-claude-subtle hover:text-claude-text mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <UserIcon className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-claude-ink">{user.username}</h1>
              <p className="text-claude-muted">{user.email}</p>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                user.role === 'admin' 
                  ? 'bg-red-100 text-red-800' 
                  : user.role === 'buyer'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-green-100 text-green-800'
              }`}>
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-claude-surface rounded-lg shadow-sm border border-claude-border">
          <div className="border-b border-claude-border">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab("profile")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "profile"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-claude-subtle hover:text-claude-text hover:border-claude-divider"
                }`}
              >
                Profile Information
              </button>
              <button
                onClick={() => setActiveTab("password")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "password"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-claude-subtle hover:text-claude-text hover:border-claude-divider"
                }`}
              >
                Change Password
              </button>
            </nav>
          </div>

          {/* Message */}
          {message && (
            <div className={`px-6 py-3 border-b ${
              messageType === "error" 
                ? "bg-red-50 border-red-200" 
                : "bg-green-50 border-green-200"
            }`}>
              <div className="flex items-center space-x-2">
                <span className={`text-sm ${
                  messageType === "error" 
                    ? "text-red-800" 
                    : "text-green-800"
                }`}>{message}</span>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="p-6">
            {activeTab === "profile" ? (
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-claude-text mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={profileData.email}
                      onChange={handleProfileChange}
                      className="w-full px-3 py-2 border border-claude-divider rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-claude-text mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      name="username"
                      value={profileData.username}
                      onChange={handleProfileChange}
                      className="w-full px-3 py-2 border border-claude-divider rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div className="bg-claude-cream p-4 rounded-md">
                  <h3 className="text-sm font-medium text-claude-text mb-2">Account Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-claude-subtle">Role:</span>
                      <span className="ml-2 font-medium text-claude-ink">
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </div>
                    <div>
                      <span className="text-claude-subtle">Status:</span>
                      <span className={`ml-2 font-medium ${
                        user.is_confirmed ? 'text-green-600' : 'text-yellow-600'
                      }`}>
                        {user.is_confirmed ? 'Confirmed' : 'Pending Confirmation'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-black bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handlePasswordSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-claude-text mb-2">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="current_password"
                        value={passwordData.current_password}
                        onChange={handlePasswordChange}
                        className="w-full px-3 py-2 pr-10 border border-claude-divider rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-claude-subtle" />
                        ) : (
                          <Eye className="h-4 w-4 text-claude-subtle" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-claude-text mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="new_password"
                        value={passwordData.new_password}
                        onChange={handlePasswordChange}
                        className="w-full px-3 py-2 pr-10 border border-claude-divider rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-claude-subtle" />
                        ) : (
                          <Eye className="h-4 w-4 text-claude-subtle" />
                        )}
                      </button>
                    </div>
                    <p className="mt-1 text-sm text-claude-subtle">
                      Password must be at least 6 characters long.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-coal-100 bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    {saving ? "Saving..." : "Update Password"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
