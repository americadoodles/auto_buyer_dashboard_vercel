"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminLayout } from "../../../components/templates/AdminLayout";
import { ListingsTable } from "../../../components/organisms/ListingsTable";
import { BuyerPerformanceKpi } from "../../../components/organisms/BuyerPerformanceKpi";
import { DateRangePicker } from "../../../components/molecules/DateRangePicker";
import { Listing } from "../../../lib/types/listing";
import { SortConfig } from "../../../lib/types/listing";
import { Car, ArrowLeft, Calendar, TrendingUp, User } from "lucide-react";
import { Button } from "../../../components/atoms/Button";

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

  // Sort listings
  const sortedListings = [...listings].sort((a, b) => {
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

        {/* Listings Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Vehicle Listings</h2>
                <p className="text-sm text-gray-600">
                  {sortedListings.length} total listings • {paginatedListings.length} showing
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
              />
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
