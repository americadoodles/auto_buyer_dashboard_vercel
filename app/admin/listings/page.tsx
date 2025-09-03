"use client";

import React, { useEffect } from "react";
import { useListings } from "../../../lib/hooks/useListings";
import { Header } from "../../../components/organisms/Header";
import { ListingsTable } from "../../../components/organisms/ListingsTable";
import { KpiGrid } from "../../../components/organisms/KpiGrid";
import { Listing } from "../../../lib/types/listing";
import { AdminLayout } from "../../../components/templates/AdminLayout";
import { Car, TrendingUp, AlertTriangle } from "lucide-react";

export default function AdminListingsPage() {
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

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="border-b border-gray-200 pb-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center shadow-lg">
              <Car className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Vehicle Listings</h1>
              <p className="text-gray-600 mt-2">
                Manage and review all vehicle listings in the system
              </p>
            </div>
          </div>
        </div>

        {/* Action Header */}
        <Header
          onLoadFromBackend={loadFromBackend}
          onSeedBackend={seedBackend}
          onRescoreVisible={rescoreVisible}
          loading={listingsLoading}
        />

        {/* KPI Grid */}
        <div className="mt-6">
          <KpiGrid />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-blue-100">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Listings</p>
                <p className="text-2xl font-bold text-gray-900">{data.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-green-100">
                <Car className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Scored Listings</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.filter(l => l.score !== undefined).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-purple-100">
                <AlertTriangle className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Score</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.filter(l => l.score === undefined).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Backend Status */}
        {backendOk === false && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">
                  Backend not reachable. Using in-memory demo data.
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Some features may be limited. Please check your backend connection.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Listings Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Vehicle Listings</h2>
                <p className="text-sm text-gray-600">
                  {sortedRows.length} total listings • {paginatedRows.length} showing
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="text-sm text-gray-500">
                  Page {currentPage} of {totalPages}
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6">
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
        </div>
      </div>
    </AdminLayout>
  );
}
