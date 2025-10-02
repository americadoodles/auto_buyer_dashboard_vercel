"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "./auth/useAuth";
import { useRouter } from "next/navigation";
import { useListings } from "../lib/hooks/useListings";
import { Header } from "../components/organisms/Header";
import { ListingsTable } from "../components/organisms/ListingsTable";
import { KpiGrid } from "../components/organisms/KpiGrid";
import { Listing } from "../lib/types/listing";
import { Button } from "../components/atoms/Button";
import { Input } from "../components/atoms/Input";
import { Search, Filter } from "lucide-react";

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

  // Filtering and search state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [makeFilter, setMakeFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

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

  // Paginate filtered listings
  const totalFilteredPages = Math.ceil(filteredListings.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedFilteredListings = filteredListings.slice(startIndex, startIndex + rowsPerPage);

  // Get unique makes for filter dropdown
  const uniqueMakes = Array.from(new Set(data.map(l => l.make))).sort();

  // Reset filters
  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("");
    setMakeFilter("");
  };

  // Show nothing while loading auth state
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth');
    }
  }, [authLoading, user, router]);

  // Admin users should go to admin dashboard
  useEffect(() => {
    if (user && user.role === 'admin') {
      router.replace('/admin');
    }
  }, [user, router]);

  // Show loading state
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

  // Admin users should go to admin dashboard (return null while redirecting)
  if (user.role === 'admin') {
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
          userRole={user.role}
          buyerId={user.id}
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

        {/* Search and Filter Controls */}
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Search Bar */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search by make, model, VIN, or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filter Controls */}
            <div className="flex items-center space-x-3">
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
              </Button>

              {(searchTerm || statusFilter || makeFilter) && (
                <Button
                  onClick={resetFilters}
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Status</option>
                    <option value="scored">Scored</option>
                    <option value="pending">Pending Score</option>
                    <option value="decided">Decided</option>
                    <option value="undecided">Undecided</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Make
                  </label>
                  <select
                    value={makeFilter}
                    onChange={(e) => setMakeFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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

        <div className="mt-6">
          <ListingsTable
            listings={paginatedFilteredListings}
            sort={sort}
            onSort={handleSort}
            onNotify={notify}
            currentPage={currentPage}
            totalPages={totalFilteredPages}
            rowsPerPage={rowsPerPage}
            totalRows={filteredListings.length}
            onPageChange={setCurrentPage}
            onRowsPerPageChange={setRowsPerPage}
          />
        </div>
        <div className="mt-8 flex justify-center space-x-4">
          <button 
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors" 
            onClick={() => router.push('/profile')}
          >
            My Profile
          </button>
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
