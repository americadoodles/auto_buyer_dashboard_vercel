'use client';

import React, { useState, useMemo } from 'react';
import { LeadManagement } from '../../../components/organisms/LeadManagement';
import { useLeads, useLeadStatuses, useLeadSources } from '../../../lib/hooks/useLeads';
import { exportApi } from '../../../lib/services/exportApi';
import { useAuth } from '../../../app/auth/useAuth';

export default function LeadsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === 'admin';
  
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(12);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined);
  const [sourceFilter, setSourceFilter] = useState<number | undefined>(undefined);
  const [assignedToFilter, setAssignedToFilter] = useState<string | undefined>(undefined);
  const [locationFilter, setLocationFilter] = useState<string | undefined>(undefined);

  // For non-admin users, automatically filter by their user ID
  // Ensure the filter is always set for non-admin users
  const effectiveAssignedToFilter = useMemo(() => {
    if (!isAdmin && user?.id) {
      return user.id;
    }
    return assignedToFilter;
  }, [isAdmin, user?.id, assignedToFilter]);

  // Only fetch leads when we have the necessary information
  // For non-admin users, wait until we have their user ID to ensure filter is applied
  const shouldFetchLeads = isAdmin || (user?.id !== undefined);

  const { leads, loading, error, refreshLeads } = useLeads(
    shouldFetchLeads ? {
      skip: (currentPage - 1) * pageSize,
      limit: pageSize,
      search: searchTerm || undefined,
      status_id: statusFilter,
      source_id: sourceFilter,
      assigned_to: effectiveAssignedToFilter // This will be user.id for non-admin users
    } : {
      skip: 0,
      limit: 0,
      assigned_to: undefined // This will prevent fetching until user is loaded
    }
  );

  const { statuses } = useLeadStatuses();
  const { sources } = useLeadSources();

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleLeadClick = (leadId: string) => {
    // Handle lead click
  };
 
  const handleExportLeads = async () => {
    try {
      const blob = await exportApi.exportLeads(
        statusFilter,
        sourceFilter,
        assignedToFilter,
        searchTerm || undefined
      );
      
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `leads_export_${timestamp}.csv`;
      
      exportApi.downloadBlob(blob, filename);
    } catch (error) {
      console.error('Export failed:', error);
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSearch = (search: string) => {
    setSearchTerm(search);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleStatusFilter = (statusId: number | undefined) => {
    setStatusFilter(statusId);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleSourceFilter = (sourceId: number | undefined) => {
    setSourceFilter(sourceId);
    setCurrentPage(1);
  };

  const handleAssignedToFilter = (assignedTo: string | undefined) => {
    setAssignedToFilter(assignedTo);
    setCurrentPage(1);
  };

  const handleLocationFilter = (location: string | undefined) => {
    setLocationFilter(location);
    setCurrentPage(1);
  };

  // Extract unique locations from leads
  const uniqueLocations = Array.from(
    new Set(
      leads
        .map(lead => lead.listing?.location)
        .filter((location): location is string => Boolean(location))
    )
  ).sort();

  // Extract unique assigned users from leads
  const assignedToUsers = Array.from(
    new Map(
      leads
        .map(lead => lead.assigned_to_user)
        .filter((user): user is NonNullable<typeof user> => 
          Boolean(user && user.id && user.username)
        )
        .map(user => [user.id, { id: user.id, username: user.username }])
    ).values()
  ).sort((a, b) => a.username.localeCompare(b.username));

  // Apply location filter client-side (since API doesn't support it yet)
  const filteredLeads = locationFilter
    ? leads.filter(lead => lead.listing?.location === locationFilter)
    : leads;

  // Transform leads data to match component expectations
  const transformedLeads = filteredLeads.map(lead => {
    const foundStatus = statuses.find(s => s.id === lead.status_id);
    const foundSource = sources.find(s => s.id === lead.source_id);
    return {
      ...lead,
      status: foundStatus ? {
        id: foundStatus.id,
        name: foundStatus.name,
        color: foundStatus.color_code
      } : {
        id: lead.status_id ?? 0,
        name: 'Unknown',
        color: 'gray'
      },
      source: foundSource ? {
        id: foundSource.id,
        name: foundSource.name
      } : undefined,
      assigned_to: lead.assigned_to_user ? {
        id: lead.assigned_to_user.id,
        username: lead.assigned_to_user.username
      } : {
        id: '',
        username: 'Unassigned'
      }
    };
  });

  // Show loading state
  if (loading && leads.length === 0) {
    return (
      <div className="p-6 bg-claude-cream dark:bg-coal-900 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="p-6 bg-claude-cream dark:bg-coal-900 min-h-screen">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400 dark:text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                Error loading leads
              </h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={refreshLeads}
                  className="bg-red-100 dark:bg-red-900/30 px-3 py-2 rounded-md text-sm font-medium text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-900/50"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
      <div className="p-6 h-full bg-claude-cream dark:bg-coal-900 min-h-screen">
        <LeadManagement 
          leads={transformedLeads as any}
          totalLeads={filteredLeads.length}
          currentPage={currentPage}
          totalPages={Math.ceil(filteredLeads.length / pageSize)}
          onPageChange={handlePageChange}
          onLeadClick={handleLeadClick}
          onExportLeads={handleExportLeads}
          onSearch={handleSearch}
          onStatusFilter={handleStatusFilter}
          onSourceFilter={handleSourceFilter}
          onAssignedToFilter={handleAssignedToFilter}
          onLocationFilter={handleLocationFilter}
          currentStatusFilter={statusFilter}
          currentSourceFilter={sourceFilter}
          currentAssignedToFilter={assignedToFilter}
          currentLocationFilter={locationFilter}
          statuses={statuses}
          sources={sources}
          assignedToUsers={assignedToUsers}
          locations={uniqueLocations}
          loading={loading}
          onLeadUpdated={refreshLeads}
          isAdmin={isAdmin}
        />
      </div>
  );
}
