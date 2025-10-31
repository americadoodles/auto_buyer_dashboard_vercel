'use client';

import React, { useState } from 'react';
import { LeadManagement } from '../../../../components/organisms/LeadManagement';
import { AdminLayout } from '../../../../components/templates/AdminLayout';
import { useLeads, useLeadStatuses } from '../../../../lib/hooks/useLeads';
import { LeadCreateModal } from '../../../../components/organisms/LeadCreateModal';

export default function LeadsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { leads, loading, error, refreshLeads } = useLeads({
    skip: (currentPage - 1) * pageSize,
    limit: pageSize,
    search: searchTerm || undefined,
    status_id: statusFilter
  });

  const { statuses } = useLeadStatuses();

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleLeadClick = (leadId: string) => {
    console.log('Lead clicked:', leadId);
  };

  const handleCreateLead = async () => {
    setIsCreateOpen(true);
  };

  const handleExportLeads = () => {
    console.log('Export leads clicked');
  };

  const handleSearch = (search: string) => {
    setSearchTerm(search);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleStatusFilter = (statusId: number | undefined) => {
    setStatusFilter(statusId);
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Transform leads data to match component expectations
  const transformedLeads = leads.map(lead => {
    const foundStatus = statuses.find(s => s.id === lead.lead_status_id);
    return {
      ...lead,
      status: foundStatus ? {
        id: foundStatus.id,
        name: foundStatus.name,
        color: foundStatus.color_code
      } : {
        id: lead.lead_status_id ?? 0,
        name: 'Unknown',
        color: 'gray'
      },
      assigned_to: lead.assigned_to ? {
        id: lead.assigned_to,
        username: lead.assigned_to // This would need to be fetched from user data
      } : {
        id: '',
        username: 'Unassigned'
      }
    };
  });

  // Show loading state
  if (loading && leads.length === 0) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Show error state
  if (error) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Error loading leads
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={refreshLeads}
                    className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Lead Management</h1>
          <p className="text-gray-600 mt-1">Manage and track your sales leads</p>
        </div>
        <LeadManagement 
          leads={transformedLeads}
          totalLeads={leads.length}
          currentPage={currentPage}
          totalPages={Math.ceil(leads.length / pageSize)}
          onPageChange={handlePageChange}
          onLeadClick={handleLeadClick}
          onCreateLead={handleCreateLead}
          onExportLeads={handleExportLeads}
          onSearch={handleSearch}
          onStatusFilter={handleStatusFilter}
          statuses={statuses}
          loading={loading}
        />
        <LeadCreateModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onCreated={async () => {
            await refreshLeads();
          }}
        />
        <LeadCreateModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onCreated={async () => {
            await refreshLeads();
          }}
        />
      </div>
    </AdminLayout>
  );
}
