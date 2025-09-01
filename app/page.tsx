"use client";

import React, { useEffect } from "react";
import { useAuth } from "./auth/useAuth";
import { useRouter } from "next/navigation";
import { useListings } from "../lib/hooks/useListings";
import { PageTemplate } from "../components/templates/PageTemplate";
import { Header } from "../components/organisms/Header";
import { AdminNavPanel } from "../components/organisms/AdminNavPanel";
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

  const handleSort = (key: keyof Listing) => {
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
      <div className="max-w-md mx-auto p-4 border rounded shadow mt-8">
        <h2 className="text-xl font-bold mb-4">Account Pending Confirmation</h2>
        <p>Your account is awaiting admin approval. Please check back later.</p>
        <button className="mt-4 bg-gray-600 text-white px-4 py-2 rounded" onClick={logout}>Logout</button>
      </div>
    );
  }

  // Admin dashboard with navigation panel
  if (user.role === 'admin') {
    return (
      <div className="flex min-h-screen">
        <AdminNavPanel />
        <div className="flex-1">
          <PageTemplate>
            <Header
              onLoadFromBackend={loadFromBackend}
              onSeedBackend={seedBackend}
              onRescoreVisible={rescoreVisible}
              loading={listingsLoading}
            />
            <KpiGrid />
            {backendOk === false && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-900">
                Backend not reachable. Using in-memory demo data.
              </div>
            )}
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
            <button className="mt-8 bg-gray-600 text-white px-4 py-2 rounded" onClick={logout}>Logout</button>
          </PageTemplate>
        </div>
      </div>
    );
  }

  // Buyer, Analyst dashboards (default: show main dashboard)
  return (
    <PageTemplate>
      <Header
        onLoadFromBackend={loadFromBackend}
        onSeedBackend={seedBackend}
        onRescoreVisible={rescoreVisible}
        loading={listingsLoading}
      />
      <KpiGrid />
      {backendOk === false && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-900">
          Backend not reachable. Using in-memory demo data.
        </div>
      )}
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
      <button className="mt-8 bg-gray-600 text-white px-4 py-2 rounded" onClick={logout}>Logout</button>
    </PageTemplate>
  );
}
