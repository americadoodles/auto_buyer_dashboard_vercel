"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminLayout } from "../../../components/templates/AdminLayout";
import { ListingsTable } from "../../../components/organisms/ListingsTable";
import { BuyerPerformanceKpi } from "../../../components/organisms/BuyerPerformanceKpi";
import { DateRangePicker } from "../../../components/molecules/DateRangePicker";
import { ExportButton } from "../../../components/molecules/ExportButton";
import { Listing } from "../../../lib/types/listing";
import { SortConfig } from "../../../lib/types/listing";
import { Car, ArrowLeft, Calendar, TrendingUp, User, Search, Filter } from "lucide-react";
import { Button } from "../../../components/atoms/Button";
import { Input } from "../../../components/atoms/Input";

interface BuyerStats {
  total_listings: number;
  scored_listings: number;
  avg_score: number;
  avg_price: number;
  first_listing: string | null;
  last_listing: string | null;
  unique_sources: number;
  scoring_rate: number;
}

export default function BuyerActivityPage() {
  const params = useParams();
  const router = useRouter();
  const buyerId = params.buyerId as string;
  
  const [listings, setListings] = useState<Listing[]>([]);
  const [buyerStats, setBuyerStats] = useState<BuyerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortConfig>({ key: 'created_at', dir: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [makeFilter, setMakeFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [userRole, setUserRole] = useState("admin"); // This should come from auth context
  
  // Selection state
  const [selectedListings, setSelectedListings] = useState<Set<string>>(new Set());

  // Fetch buyer listings and stats
  const fetchBuyerData = async () => {
    setLoading(true);
    try {
      const baseUrl = (process.env.NEXT_PUBLIC_BACKEND_URL ?? '/api').replace(/\/+$/, '');
      
      // Build query parameters
      const queryParams = new URLSearchParams();
      if (dateRange.start) {
        queryParams.append('start_date', dateRange.start.toISOString());
      }
      if (dateRange.end) {
        queryParams.append('end_date', dateRange.end.toISOString());
      }
      
      // Fetch listings
      const listingsResponse = await fetch(
        `${baseUrl}/listings/buyer/${buyerId}?${queryParams.toString()}`
      );
      const listingsData = await listingsResponse.json();
      setListings(listingsData || []);
      
      // Fetch stats
      const statsResponse = await fetch(
        `${baseUrl}/listings/buyer/${buyerId}/stats?${queryParams.toString()}`
      );
      const statsData = await statsResponse.json();
      setBuyerStats(statsData || null);
    } catch (error) {
      console.error('Error fetching buyer data:', error);
      setListings([]);
      setBuyerStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (buyerId) {
      fetchBuyerData();
    }
  }, [buyerId, dateRange]);

  // Filter listings based on search and filter criteria
  const filteredListings = listings.filter((listing) => {
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

  // Sort listings
  const sortedListings = [...filteredListings].sort((a, b) => {
    let aVal: any;
    let bVal: any;
    
    // Handle nested decision fields
    if (sort.key === 'decision_status') {
      aVal = a.decision?.status;
      bVal = b.decision?.status;
    } else if (sort.key === 'decision_reasons') {
      aVal = a.decision?.reasons?.join(', ') || '';
      bVal = b.decision?.reasons?.join(', ') || '';
    } else {
      aVal = a[sort.key as keyof Listing];
      bVal = b[sort.key as keyof Listing];
    }
    
    if (aVal === undefined || aVal === null) return 1;
    if (bVal === undefined || bVal === null) return -1;
    
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sort.dir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sort.dir === 'asc' ? aVal - bVal : bVal - aVal;
    }
    
    return 0;
  });

  // Paginate listings
  const totalPages = Math.ceil(sortedListings.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedListings = sortedListings.slice(startIndex, startIndex + rowsPerPage);

  const handleSort = (key: keyof Listing | 'decision_status' | 'decision_reasons') => {
    setSort((prev) => ({
      key,
      dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc",
    }));
  };

  const handleNotify = async (vin: string) => {
    try {
      const baseUrl = (process.env.NEXT_PUBLIC_BACKEND_URL ?? '/api').replace(/\/+$/, '');
      await fetch(`${baseUrl}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ vin }])
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  const handleDateRangeChange = (start: Date | null, end: Date | null) => {
    setDateRange({ start, end });
    setCurrentPage(1); // Reset to first page when date range changes
  };

  const clearDateFilter = () => {
    setDateRange({ start: null, end: null });
    setCurrentPage(1);
  };

  // Get unique makes for filter dropdown
  const uniqueMakes = Array.from(new Set(listings.map(l => l.make))).sort();

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
      const allIds = new Set(sortedListings.map(listing => listing.id));
      setSelectedListings(allIds);
    } else {
      setSelectedListings(new Set());
    }
  };

  // Calculate selection state for header checkbox
  const isAllSelected = sortedListings.length > 0 && sortedListings.every(listing => selectedListings.has(listing.id));
  const isIndeterminate = selectedListings.size > 0 && selectedListings.size < sortedListings.length;

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="border-b border-gray-200 pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.back()}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                <User className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Buyer Activity</h1>
                <p className="text-gray-600 mt-2">
                  Vehicle listings and performance for buyer ID: {buyerId}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Time Range Filter</h2>
            </div>
            {(dateRange.start || dateRange.end) && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearDateFilter}
              >
                Clear Filter
              </Button>
            )}
          </div>
          <DateRangePicker
            startDate={dateRange.start}
            endDate={dateRange.end}
            onDateChange={handleDateRangeChange}
          />
        </div>

        {/* Performance KPIs */}
        {buyerStats && (
          <BuyerPerformanceKpi stats={buyerStats} />
        )}

        {/* Search and Filter Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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

              <ExportButton
                exportType="listings"
                userRole={userRole}
                variant="success"
                size="sm"
                selectedListings={selectedListings}
              />

              {selectedListings.size > 0 && (
                <Button
                  onClick={() => setSelectedListings(new Set())}
                  variant="outline"
                  size="sm"
                  className="text-blue-600 hover:text-blue-700"
                >
                  Clear Selection ({selectedListings.size})
                </Button>
              )}

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

        {/* Listings Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Vehicle Listings</h2>
                <p className="text-sm text-gray-600">
                  {sortedListings.length} filtered listings • {paginatedListings.length} showing
                  {selectedListings.size > 0 && (
                    <span className="ml-2 text-blue-600 font-medium">
                      • {selectedListings.size} selected
                    </span>
                  )}
                  {(dateRange.start || dateRange.end) && (
                    <span className="ml-2 text-blue-600">
                      (filtered by date range)
                    </span>
                  )}
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
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading buyer data...</span>
              </div>
            ) : (
              <ListingsTable
                listings={paginatedListings}
                sort={sort}
                onSort={handleSort}
                onNotify={handleNotify}
                currentPage={currentPage}
                totalPages={totalPages}
                rowsPerPage={rowsPerPage}
                totalRows={sortedListings.length}
                onPageChange={setCurrentPage}
                onRowsPerPageChange={setRowsPerPage}
                selectedListings={selectedListings}
                onSelectListing={handleSelectListing}
                onSelectAll={handleSelectAll}
                isAllSelected={isAllSelected}
                isIndeterminate={isIndeterminate}
              />
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
