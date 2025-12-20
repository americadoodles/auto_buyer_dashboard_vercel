"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useListings } from "../../lib/hooks/useListings";
import { useAuth } from "../auth/useAuth";
import { ListingsTable } from "../../components/organisms/ListingsTable";
import { ListingsCardGrid } from "../../components/organisms/ListingsCardGrid";
import { KpiGrid } from "../../components/organisms/KpiGrid";
import { ExportButton } from "../../components/molecules/ExportButton";
import { DateRangePicker } from "../../components/molecules/DateRangePicker";
import { ViewToggle, ViewMode } from "../../components/molecules/ViewToggle";
import { Listing } from "../../lib/types/listing";
import { Car, TrendingUp, AlertTriangle, Filter, Search, RefreshCw } from "lucide-react";
import { Input } from "../../components/atoms/Input";
import { Button } from "../../components/atoms/Button";
import { Pagination } from "../../components/molecules/Pagination";

export default function ListingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [selectedListings, setSelectedListings] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [viewModeInitialized, setViewModeInitialized] = useState(false);
  const [likedListings, setLikedListings] = useState<Set<string>>(new Set());
  const [urlInitialized, setUrlInitialized] = useState(false);
  const isUpdatingFromURL = useRef(false);
  const prevFilters = useRef({ searchTerm: "", statusFilter: "", makeFilter: "" });
  const currentPageRef = useRef(currentPage);
  const userRole = user?.role || "buyer"; // Default to buyer if no user or role
  const updatePaginationURL = useCallback((page: number, perPage: number, skipCheck = false) => {
    if (isUpdatingFromURL.current && !skipCheck) {
      return; // Don't update URL if we're currently updating from URL
    }
    
    const currentPageParam = searchParams.get('page');
    const currentPerPageParam = searchParams.get('perPage');
    
    const urlPage = currentPageParam ? parseInt(currentPageParam, 10) : 1;
    const urlPerPage = currentPerPageParam ? parseInt(currentPerPageParam, 10) : 10;
    
    // Only update if values actually changed
    if (urlPage === page && urlPerPage === perPage) {
      return;
    }
    
    const params = new URLSearchParams(searchParams.toString());
    
    if (page > 1) {
      params.set('page', String(page));
    } else {
      params.delete('page');
    }
    
    if (perPage !== 10) {
      params.set('perPage', String(perPage));
    } else {
      params.delete('perPage');
    }

    const newUrl = params.toString() ? `/listings?${params.toString()}` : '/listings';
    router.replace(newUrl, { scroll: false });
  }, [searchParams, router]);

  // Track previous URL params to detect changes
  const prevUrlParams = useRef<string>('');
  
  // Initialize pagination from URL params on mount and when URL changes
  useEffect(() => {
    if (authLoading) return;

    const urlPage = searchParams.get('page');
    const urlPerPage = searchParams.get('perPage');
    const currentUrlParams = `${urlPage || ''}_${urlPerPage || ''}`;
    
    // Only update if URL params have actually changed (not just state)
    if (currentUrlParams !== prevUrlParams.current || !urlInitialized) {
      prevUrlParams.current = currentUrlParams;
      isUpdatingFromURL.current = true;
      
      const urlPageNum = urlPage ? parseInt(urlPage, 10) : null;
      const urlPerPageNum = urlPerPage ? parseInt(urlPerPage, 10) : null;
      
      // Always update from URL if it has a value, regardless of current state
      // This ensures we restore the correct page when navigating back
      if (urlPageNum !== null && urlPageNum > 0) {
        setCurrentPage(urlPageNum);
      }
      
      if (urlPerPageNum !== null && urlPerPageNum > 0) {
        setRowsPerPage(urlPerPageNum);
      }
      
      if (!urlInitialized) {
        setUrlInitialized(true);
      }
      
      // Reset flag after a short delay to allow state updates to complete
      setTimeout(() => {
        isUpdatingFromURL.current = false;
      }, 100);
    }
  }, [searchParams, authLoading]); // Only depend on searchParams and authLoading to avoid loops

  // Sync pagination changes to URL (but not during initialization or when updating from URL)
  useEffect(() => {
    if (!urlInitialized || isUpdatingFromURL.current) return;
    
    // Check if URL already matches to prevent unnecessary updates
    const urlPage = searchParams.get('page');
    const urlPerPage = searchParams.get('perPage');
    const urlPageNum = urlPage ? parseInt(urlPage, 10) : 1;
    const urlPerPageNum = urlPerPage ? parseInt(urlPerPage, 10) : 10;
    
    if (urlPageNum === currentPage && urlPerPageNum === rowsPerPage) {
      return; // URL already matches, no update needed
    }
    
    updatePaginationURL(currentPage, rowsPerPage);
  }, [currentPage, rowsPerPage, updatePaginationURL, urlInitialized, searchParams]);

  // Update currentPageRef whenever currentPage changes
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  // Initialize view mode from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return; // SSR check
    
    try {
      const savedViewMode = localStorage.getItem('listingsViewMode') as ViewMode | null;
      if (savedViewMode === 'table' || savedViewMode === 'cards') {
        setViewMode(savedViewMode);
      }
    } catch (error) {
      console.error('Failed to load view mode from localStorage:', error);
    } finally {
      setViewModeInitialized(true);
    }
  }, []); // Only run on mount

  // Save view mode to localStorage whenever it changes
  useEffect(() => {
    if (!viewModeInitialized || typeof window === 'undefined') return; // Don't save until initialized and client-side
    
    try {
      localStorage.setItem('listingsViewMode', viewMode);
    } catch (error) {
      console.error('Failed to save view mode to localStorage:', error);
    }
  }, [viewMode, viewModeInitialized]);

  // Reset to page 1 when search/filters change (but not when page changes)
  useEffect(() => {
    if (!urlInitialized || isUpdatingFromURL.current) return;
    
    // Check if filters actually changed
    const filtersChanged = 
      prevFilters.current.searchTerm !== searchTerm ||
      prevFilters.current.statusFilter !== statusFilter ||
      prevFilters.current.makeFilter !== makeFilter;
    
    // Only reset to page 1 if filters actually changed and we're on a page > 1
    if (filtersChanged && currentPageRef.current > 1) {
      setCurrentPage(1);
      updatePaginationURL(1, rowsPerPage, true);
    }
    
    // Update previous filter values
    prevFilters.current = { searchTerm, statusFilter, makeFilter };
  }, [searchTerm, statusFilter, makeFilter, urlInitialized, rowsPerPage, updatePaginationURL]);

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
      listing.lpn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  // Pagination for filtered listings
  const paginatedFilteredListings = filteredListings.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );
  const filteredTotalPages = Math.ceil(filteredListings.length / rowsPerPage);

  // Like handler
  const handleLike = (listingId: string) => {
    setLikedListings(prev => {
      const newSet = new Set(prev);
      if (newSet.has(listingId)) {
        newSet.delete(listingId);
      } else {
        newSet.add(listingId);
      }
      return newSet;
    });
  };

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
                  placeholder="Search by make, model, VIN, LPN, or location..."
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

        {/* Listings View */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Vehicle Listings</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {filteredListings.length} filtered listings • {paginatedFilteredListings.length} showing
                  {selectedListings.size > 0 && (
                    <span className="ml-2 text-blue-600 dark:text-blue-400 font-medium">
                      • {selectedListings.size} selected
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Page {currentPage} of {filteredTotalPages}
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            {viewMode === 'table' ? (
              <ListingsTable
                listings={paginatedFilteredListings}
                sort={sort}
                onSort={handleSort}
                onNotify={notify}
                onNotifySlack={notifySlack}
                onTriggerWorkflow={triggerWorkflow}
                currentPage={currentPage}
                totalPages={filteredTotalPages}
                rowsPerPage={rowsPerPage}
                totalRows={filteredListings.length}
                onPageChange={(page) => {
                  setCurrentPage(page);
                  updatePaginationURL(page, rowsPerPage);
                }}
                onRowsPerPageChange={(perPage) => {
                  setRowsPerPage(perPage);
                  updatePaginationURL(currentPage, perPage);
                }}
                selectedListings={selectedListings}
                onSelectListing={handleSelectListing}
                onSelectAll={handleSelectAll}
                isAllSelected={isAllSelected}
                isIndeterminate={isIndeterminate}
                onListingUpdated={updateListingInState}
              />
            ) : (
              <>
                <ListingsCardGrid
                  listings={paginatedFilteredListings}
                  selectedListings={selectedListings}
                  onSelectListing={handleSelectListing}
                  onNotify={notify}
                  onNotifySlack={notifySlack}
                  onTriggerWorkflow={triggerWorkflow}
                  onLike={handleLike}
                  likedListings={likedListings}
                />
                <div className="mt-6">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={filteredTotalPages}
                    rowsPerPage={rowsPerPage}
                    totalRows={filteredListings.length}
                    onPageChange={(page) => {
                      setCurrentPage(page);
                      updatePaginationURL(page, rowsPerPage);
                    }}
                    onRowsPerPageChange={(perPage) => {
                      setRowsPerPage(perPage);
                      updatePaginationURL(currentPage, perPage);
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
  );
}

