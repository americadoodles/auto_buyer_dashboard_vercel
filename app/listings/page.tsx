"use client";

import React, { useEffect, useState } from "react";
import { useListings } from "../../lib/hooks/useListings";
import { useAuth } from "../auth/useAuth";
import { ListingsTable } from "../../components/organisms/ListingsTable";
import { KpiGrid } from "../../components/organisms/KpiGrid";
import { ExportButton } from "../../components/molecules/ExportButton";
import { DateRangePicker } from "../../components/molecules/DateRangePicker";
import { Listing } from "../../lib/types/listing";
import { Car, TrendingUp, AlertTriangle, Filter, Search, RefreshCw } from "lucide-react";
import { Input } from "../../components/atoms/Input";
import { Button } from "../../components/atoms/Button";

export default function ListingsPage() {
  const { user, loading: authLoading } = useAuth();
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
    loadWithDateRange,
    refreshToday,
    startDate,
    endDate,
    notify,
    notifySlack,
    triggerWorkflow,
    updateListingInState,
  } = useListings();
  // Filtering and search state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [makeFilter, setMakeFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  
  // Selection state
  const [selectedListings, setSelectedListings] = useState<Set<string>>(new Set());

  // Get user role from authentication context
  const userRole = user?.role || "buyer"; // Default to buyer if no user or role

  const handleSort = (key: keyof Listing | 'decision_status' | 'decision_reasons') => {
    setSort((prev) => ({
      key,
      dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc",
    }));
  };

  // Filter listings based on search and filter criteria
  const filteredListings = sortedRows.filter((listing) => {
    const matchesSearch = searchTerm === "" || 
      listing.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
      listing.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      listing.vin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      listing.location?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "" || 
      (statusFilter === "scored" && listing.score !== undefined) ||
      (statusFilter === "pending" && listing.score === undefined) ||
      (statusFilter === "decided" && listing.decision?.status) ||
      (statusFilter === "undecided" && !listing.decision?.status);
    
    const matchesMake = makeFilter === "" || 
      listing.make.toLowerCase() === makeFilter.toLowerCase();
    
    return matchesSearch && matchesStatus && matchesMake;
  });

  // Get unique makes for filter dropdown
  const uniqueMakes = Array.from(new Set(data.map(l => l.make))).sort();

  // Reset filters
  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("");
    setMakeFilter("");
  };

  // Selection handlers
  const handleSelectListing = (listingId: string, selected: boolean) => {
    setSelectedListings(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(listingId);
      } else {
        newSet.delete(listingId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      const allIds = new Set(filteredListings.map(listing => listing.id));
      setSelectedListings(allIds);
    } else {
      setSelectedListings(new Set());
    }
  };

  // Calculate selection state for header checkbox
  const isAllSelected = filteredListings.length > 0 && filteredListings.every(listing => selectedListings.has(listing.id));
  const isIndeterminate = selectedListings.size > 0 && selectedListings.size < filteredListings.length;

  // Show loading state while authentication is being determined
  if (authLoading) {
    return (
      <div className="p-6 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
      <div className="p-6 space-y-6 h-full overflow-y-auto bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center shadow-lg">
              <Car className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Vehicle Listings</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Manage and review all vehicle listings in the system
              </p>
            </div>
          </div>
        </div>
        {/* KPI Grid */}
        <div className="mt-6">
          <KpiGrid />
        </div>

        {/* Backend Status */}
        {backendOk === false && (
          <div className="rounded-xl border border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20 p-4 text-amber-900 dark:text-amber-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-400 dark:text-amber-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">
                  Backend not reachable. Using in-memory demo data.
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  Some features may be limited. Please check your backend connection.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Search, Filters, and Date Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          {/* Top Row: Search + Actions */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* Search Bar */}
            <div className="w-full md:max-w-xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search by make, model, VIN, or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="w-full md:w-auto flex flex-wrap items-center gap-2">
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
              </Button>
            
              <ExportButton
                exportType="listings"
                userRole={userRole}
                variant="success"
                size="sm"
                selectedListings={selectedListings}
              />

              <Button
                variant="primary"
                size="sm"
                onClick={rescoreVisible}
                disabled={listingsLoading}
                className="flex items-center space-x-2"
              >
                <RefreshCw className={`w-4 h-4 ${listingsLoading ? 'animate-spin' : ''}`} />
                <span>Re-score Visible</span>
              </Button>

              {selectedListings.size > 0 && (
                <Button
                  onClick={() => setSelectedListings(new Set())}
                  variant="outline"
                  size="sm"
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  Clear Selection ({selectedListings.size})
                </Button>
              )}

              {(searchTerm || statusFilter || makeFilter) && (
                <Button
                  onClick={resetFilters}
                  variant="outline"
                  size="sm"
                  className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {/* Bottom Row: Date Range Picker */}
          <div className="mt-6">
            <div className="w-full">
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onDateChange={(start, end) => loadWithDateRange(start, end)}
                onRefreshToday={refreshToday}
              />
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  >
                    <option value="">All Status</option>
                    <option value="scored">Scored</option>
                    <option value="pending">Pending Score</option>
                    <option value="decided">Decided</option>
                    <option value="undecided">Undecided</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Make
                  </label>
                  <select
                    value={makeFilter}
                    onChange={(e) => setMakeFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  >
                    <option value="">All Makes</option>
                    {uniqueMakes.map((make) => (
                      <option key={make} value={make}>
                        {make}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Listings Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Vehicle Listings</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {filteredListings.length} filtered listings • {paginatedRows.length} showing
                  {selectedListings.size > 0 && (
                    <span className="ml-2 text-blue-600 dark:text-blue-400 font-medium">
                      • {selectedListings.size} selected
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Page {currentPage} of {totalPages}
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <ListingsTable
              listings={filteredListings.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)}
              sort={sort}
              onSort={handleSort}
              onNotify={notify}
              onNotifySlack={notifySlack}
              onTriggerWorkflow={triggerWorkflow}
              currentPage={currentPage}
              totalPages={Math.ceil(filteredListings.length / rowsPerPage)}
              rowsPerPage={rowsPerPage}
              totalRows={filteredListings.length}
              onPageChange={setCurrentPage}
              onRowsPerPageChange={setRowsPerPage}
              selectedListings={selectedListings}
              onSelectListing={handleSelectListing}
              onSelectAll={handleSelectAll}
              isAllSelected={isAllSelected}
              isIndeterminate={isIndeterminate}
              onListingUpdated={updateListingInState}
            />
          </div>
        </div>
      </div>
  );
}

