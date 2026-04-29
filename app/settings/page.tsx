"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Database, Download, Upload, Loader2, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

import { useAuth } from "../auth/useAuth";
import { ApiService } from "../../lib/services/api";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "/api";

type ProgressEntry = {
  table: string;
  stage: "delete" | "insert" | "done" | "error";
  rows?: number;
  errors?: string[];
};

const SettingsPage: React.FC = () => {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [activeTab, setActiveTab] = useState<"database-backup">("database-backup");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreErrors, setRestoreErrors] = useState<string[]>([]);
  const [progressLog, setProgressLog] = useState<ProgressEntry[]>([]);
  const [currentTable, setCurrentTable] = useState<string>("");

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
      setMessage("Please select a .zip backup file first.");
      setMessageType("error");
      return;
    }

    setMessage("");
    setRestoreErrors([]);
    setProgressLog([]);
    setCurrentTable("");
    setRestoreLoading(true);

    try {
      const token = (typeof window !== "undefined" ? localStorage.getItem("auth.token") : null) ?? "";
      const formData = new FormData();
      formData.append("backup_file", restoreFile);

      const response = await fetch(`${BACKEND_URL}/settings/database/restore`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok || !response.body) {
        const text = await response.text().catch(() => "Unknown error");
        throw new Error(text || `HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse complete SSE messages (delimited by double newline)
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const eventMatch = part.match(/^event: (\w+)/m);
          const dataMatch = part.match(/^data: (.+)/m);
          if (!eventMatch || !dataMatch) continue;

          const eventType = eventMatch[1];
          let payload: any;
          try { payload = JSON.parse(dataMatch[1]); } catch { continue; }

          if (eventType === "progress") {
            setCurrentTable(`[${payload.stage === "delete" ? "Clearing" : "Inserting"} ${payload.current}/${payload.total}] ${payload.table}`);
          } else if (eventType === "table_done") {
            setProgressLog((prev) => [
              ...prev,
              {
                table: payload.table,
                stage: payload.errors?.length ? "error" : "done",
                rows: payload.rows,
                errors: payload.errors ?? [],
              },
            ]);
          } else if (eventType === "done") {
            const tableCount = Object.keys(payload.restored ?? {}).length;
            const errCount = (payload.errors ?? []).length;
            setMessage(`Database restore completed. ${tableCount} table(s) restored.${errCount ? ` ${errCount} warning(s).` : ""}`);
            setRestoreErrors(payload.errors ?? []);
            setMessageType(errCount ? "error" : "success");
            setCurrentTable("");
            setRestoreFile(null);
          } else if (eventType === "error") {
            throw new Error(payload.detail ?? "Restore failed");
          }
        }
      }
    } catch (err: any) {
      setMessage(err?.message || "Failed to restore backup.");
      setMessageType("error");
    } finally {
      setRestoreLoading(false);
      setCurrentTable("");
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
                <p>{message}</p>
                {restoreErrors.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer font-medium">Show {restoreErrors.length} warning(s)</summary>
                    <ul className="mt-1 space-y-0.5 max-h-48 overflow-y-auto">
                      {restoreErrors.map((e, i) => (
                        <li key={i} className="font-mono text-xs break-all">{e}</li>
                      ))}
                    </ul>
                  </details>
                )}
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
                  onChange={(e) => {
                    setRestoreFile(e.target.files?.[0] ?? null);
                    setProgressLog([]);
                    setMessage("");
                  }}
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

                {/* Live progress log */}
                {(restoreLoading || progressLog.length > 0) && (
                  <div className="mt-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 overflow-hidden">
                    {currentTable && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-mono">
                        <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                        <span className="truncate">{currentTable}</span>
                      </div>
                    )}
                    <ul className="max-h-56 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                      {progressLog.map((entry, i) => (
                        <li key={i} className="flex items-start gap-2 px-3 py-1.5 text-xs">
                          {entry.errors && entry.errors.length > 0
                            ? <XCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                            : <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                          }
                          <div className="min-w-0">
                            <span className="font-mono text-gray-700 dark:text-gray-300">{entry.table}</span>
                            <span className="text-gray-400 dark:text-gray-500 ml-2">{entry.rows} row(s)</span>
                            {entry.errors && entry.errors.length > 0 && (
                              <ul className="mt-0.5 space-y-0.5">
                                {entry.errors.slice(0, 3).map((e, j) => (
                                  <li key={j} className="text-red-500 dark:text-red-400 font-mono break-all">{e}</li>
                                ))}
                                {entry.errors.length > 3 && (
                                  <li className="text-gray-400">+{entry.errors.length - 3} more</li>
                                )}
                              </ul>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
