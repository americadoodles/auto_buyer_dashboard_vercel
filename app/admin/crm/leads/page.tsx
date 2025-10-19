'use client';

import React from 'react';
import { LeadManagement } from '../../../../components/organisms/LeadManagement';
import { AdminLayout } from '../../../../components/templates/AdminLayout';

// Mock data for leads
const mockLeads = [
  {
    id: '1',
    first_name: 'John',
    last_name: 'Smith',
    email: 'john.smith@email.com',
    phone: '+1-555-0123',
    company: 'Smith Industries',
    lead_score: 85,
    status: {
      id: 1,
      name: 'New',
      color: 'blue'
    },
    assigned_to: {
      id: '1',
      username: 'sales_rep_1'
    },
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T10:30:00Z'
  },
  {
    id: '2',
    first_name: 'Sarah',
    last_name: 'Johnson',
    email: 'sarah.j@email.com',
    phone: '+1-555-0124',
    company: 'Johnson Corp',
    lead_score: 92,
    status: {
      id: 2,
      name: 'Qualified',
      color: 'green'
    },
    assigned_to: {
      id: '2',
      username: 'sales_rep_2'
    },
    created_at: '2024-01-14T14:20:00Z',
    updated_at: '2024-01-15T09:15:00Z'
  },
  {
    id: '3',
    first_name: 'Mike',
    last_name: 'Davis',
    email: 'mike.davis@email.com',
    phone: '+1-555-0125',
    company: 'Davis Enterprises',
    lead_score: 78,
    status: {
      id: 3,
      name: 'Contacted',
      color: 'yellow'
    },
    assigned_to: {
      id: '1',
      username: 'sales_rep_1'
    },
    created_at: '2024-01-13T16:45:00Z',
    updated_at: '2024-01-14T11:30:00Z'
  }
];

export default function LeadsPage() {
  const handlePageChange = (page: number) => {
    console.log('Page changed to:', page);
  };

  const handleLeadClick = (leadId: string) => {
    console.log('Lead clicked:', leadId);
  };

  const handleCreateLead = () => {
    console.log('Create lead clicked');
  };

  const handleExportLeads = () => {
    console.log('Export leads clicked');
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Lead Management</h1>
          <p className="text-gray-600 mt-1">Manage and track your sales leads</p>
        </div>
        <LeadManagement 
          leads={mockLeads}
          totalLeads={mockLeads.length}
          currentPage={1}
          totalPages={1}
          onPageChange={handlePageChange}
          onLeadClick={handleLeadClick}
          onCreateLead={handleCreateLead}
          onExportLeads={handleExportLeads}
        />
      </div>
    </AdminLayout>
  );
}
