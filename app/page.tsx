"use client";

import React, { useEffect } from "react";
import { useAuth } from "./auth/useAuth";
import { useRouter } from "next/navigation";
import { useListings } from "../lib/hooks/useListings";
import { Header } from "../components/organisms/Header";
import { ListingsTable } from "../components/organisms/ListingsTable";
import { KpiGrid } from "../components/organisms/KpiGrid";
import { Listing } from "../lib/types/listing";

export const preferredRegion = ["iad1"];

export default function Page() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const {
    data,
    sortedRows,
    paginatedRows,
    sort,
    setSort,
    loading: listingsLoading,
    backendOk,
    currentPage,
    setCurrentPage,
    rowsPerPage,
    setRowsPerPage,
    totalPages,
    rescoreVisible,
    seedBackend,
    loadFromBackend,
    notify,
  } = useListings();

  const handleSort = (key: keyof Listing | 'decision_status' | 'decision_reasons') => {
    setSort((prev) => ({
      key,
      dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc",
    }));
  };

  // Show nothing while loading auth state
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth');
    }
  }, [authLoading, user, router]);
  
  if (authLoading || !user) return null;

  // Role-based access: Only allow access for confirmed users
  if (user.role === 'buyer' && !user.is_confirmed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto p-6 bg-white border rounded-lg shadow-sm">
          <h2 className="text-xl font-bold mb-4 text-gray-900">Account Pending Confirmation</h2>
          <p className="text-gray-600 mb-6">Your account is awaiting admin approval. Please check back later.</p>
          <button 
            className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors" 
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  // Admin users should go to admin dashboard
  if (user.role === 'admin') {
    router.replace('/admin');
    return null;
  }

  // Buyer, Analyst dashboards (default: show main dashboard)
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <Header
          onLoadFromBackend={loadFromBackend}
          onSeedBackend={seedBackend}
          onRescoreVisible={rescoreVisible}
          loading={listingsLoading}
        />
        <div className="mt-6">
          <KpiGrid />
        </div>
        {backendOk === false && (
          <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">
                  Backend not reachable. Using in-memory demo data.
                </p>
              </div>
            </div>
          </div>
        )}
        <div className="mt-6">
          <ListingsTable
            listings={paginatedRows}
            sort={sort}
            onSort={handleSort}
            onNotify={notify}
            currentPage={currentPage}
            totalPages={totalPages}
            rowsPerPage={rowsPerPage}
            totalRows={sortedRows.length}
            onPageChange={setCurrentPage}
            onRowsPerPageChange={setRowsPerPage}
          />
        </div>
        <div className="mt-8 flex justify-center">
          <button 
            className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors" 
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
