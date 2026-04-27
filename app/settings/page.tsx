"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Database, Download, Upload, Loader2, AlertTriangle } from "lucide-react";

import { useAuth } from "../auth/useAuth";
import { ApiService } from "../../lib/services/api";

const SettingsPage: React.FC = () => {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [activeTab, setActiveTab] = useState<"database-backup">("database-backup");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);

  const isAdmin = user?.role?.toLowerCase() === "admin";

  const handleBackup = async () => {
    setMessage("");
    setBackupLoading(true);

    try {
      const blob = await ApiService.downloadDatabaseBackup();
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const fileName = `database_backup_${timestamp}.zip`;

      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);

      setMessage("Database backup download started.");
      setMessageType("success");
    } catch (err: any) {
      setMessage(err?.message || "Failed to create backup.");
      setMessageType("error");
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreFile) {
      setMessage("Please select a .sql backup file first.");
      setMessageType("error");
      return;
    }

    setMessage("");
    setRestoreLoading(true);

    try {
      const result = await ApiService.restoreDatabaseBackup(restoreFile);
      const tableCount = Object.keys(result.restored ?? {}).length;
      const errCount = (result.errors ?? []).length;
      const summary = `${tableCount} table(s) restored.${errCount ? ` ${errCount} warning(s).` : ""}`;
      setMessage(`${result.message || "Database restored successfully."} ${summary}`);
      setMessageType(errCount ? "error" : "success");
      setRestoreFile(null);
    } catch (err: any) {
      setMessage(err?.message || "Failed to restore backup.");
      setMessageType("error");
    } finally {
      setRestoreLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    router.push("/auth");
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-500 mt-0.5" />
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Access Restricted</h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                Only admin users can access database backup and restore settings.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-5">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Manage system-level configuration and maintenance actions.</p>
          </div>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <aside className="lg:col-span-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 h-fit">
            <button
              onClick={() => setActiveTab("database-backup")}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${
                activeTab === "database-backup"
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
              }`}
            >
              <Database className="w-4 h-4" />
              <span className="font-medium">Database Backup</span>
            </button>
          </aside>

          <section className="lg:col-span-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-6">
            {message && (
              <div
                className={`rounded-lg border p-3 text-sm ${
                  messageType === "error"
                    ? "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300"
                    : "bg-green-50 border-green-200 text-green-700 dark:bg-green-950/30 dark:border-green-800 dark:text-green-300"
                }`}
              >
                {message}
              </div>
            )}

            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Backup Database</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Download a full SQL backup of the current database.
              </p>
              <button
                onClick={handleBackup}
                disabled={backupLoading}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white"
              >
                {backupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {backupLoading ? "Creating Backup..." : "Backup Database"}
              </button>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Restore Database</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Upload a SQL backup file and restore it to the current database.
              </p>

              <div className="mt-4 space-y-3">
                <input
                  type="file"
                  accept=".zip"
                  onChange={(e) => setRestoreFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-gray-700 dark:text-gray-200 file:mr-4 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-100 dark:file:bg-gray-700 file:text-gray-700 dark:file:text-gray-100 hover:file:bg-gray-200 dark:hover:file:bg-gray-600"
                />

                <button
                  onClick={handleRestore}
                  disabled={restoreLoading || !restoreFile}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-amber-600 hover:bg-amber-700 disabled:opacity-60 disabled:cursor-not-allowed text-white"
                >
                  {restoreLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {restoreLoading ? "Restoring..." : "Restore Database"}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
