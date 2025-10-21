'use client';

import React from 'react';
import { DealPipeline } from '../../../../components/organisms/DealPipeline';
import { AdminLayout } from '../../../../components/templates/AdminLayout';

// Mock data for deals
const mockDeals = [
  {
    id: '1',
    name: '2023 Honda Civic Sale',
    description: 'Sale of 2023 Honda Civic to John Smith',
    contact: {
      id: '1',
      first_name: 'John',
      last_name: 'Smith'
    },
    deal_value: 25000,
    probability: 75,
    expected_close_date: '2024-02-15',
    deal_stage: {
      id: 1,
      name: 'Proposal',
      color: 'blue'
    },
    deal_category: {
      id: 1,
      name: 'Vehicle Sale'
    },
    assigned_to: {
      id: '1',
      username: 'sales_rep_1'
    },
    is_won: false,
    is_lost: false,
    created_at: '2024-01-10T09:00:00Z',
    updated_at: '2024-01-15T10:30:00Z'
  },
  {
    id: '2',
    name: '2022 Toyota Camry Sale',
    description: 'Sale of 2022 Toyota Camry to Sarah Johnson',
    contact: {
      id: '2',
      first_name: 'Sarah',
      last_name: 'Johnson'
    },
    deal_value: 28000,
    probability: 90,
    expected_close_date: '2024-01-25',
    deal_stage: {
      id: 2,
      name: 'Negotiation',
      color: 'yellow'
    },
    deal_category: {
      id: 1,
      name: 'Vehicle Sale'
    },
    assigned_to: {
      id: '2',
      username: 'sales_rep_2'
    },
    is_won: false,
    is_lost: false,
    created_at: '2024-01-08T11:15:00Z',
    updated_at: '2024-01-14T14:20:00Z'
  },
  {
    id: '3',
    name: '2023 BMW 3 Series Sale',
    description: 'Sale of 2023 BMW 3 Series to Mike Davis',
    contact: {
      id: '3',
      first_name: 'Mike',
      last_name: 'Davis'
    },
    deal_value: 45000,
    probability: 100,
    expected_close_date: '2024-01-20',
    deal_stage: {
      id: 3,
      name: 'Closed Won',
      color: 'green'
    },
    deal_category: {
      id: 1,
      name: 'Vehicle Sale'
    },
    assigned_to: {
      id: '1',
      username: 'sales_rep_1'
    },
    is_won: true,
    is_lost: false,
    created_at: '2024-01-05T16:45:00Z',
    updated_at: '2024-01-20T09:15:00Z'
  }
];

// Mock data for deal stages
const mockDealStages = [
  {
    id: 1,
    name: 'Proposal',
    count: 1,
    value: 25000,
    color: 'blue'
  },
  {
    id: 2,
    name: 'Negotiation',
    count: 1,
    value: 28000,
    color: 'yellow'
  },
  {
    id: 3,
    name: 'Closed Won',
    count: 1,
    value: 45000,
    color: 'green'
  }
];

export default function DealsPage() {
  const handlePageChange = (page: number) => {
    console.log('Page changed to:', page);
  };

  const handleDealClick = (dealId: string) => {
    console.log('Deal clicked:', dealId);
  };

  const handleCreateDeal = () => {
    console.log('Create deal clicked');
  };

  const handleExportDeals = () => {
    console.log('Export deals clicked');
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Deal Pipeline</h1>
          <p className="text-gray-600 mt-1">Track and manage your sales opportunities</p>
        </div>
        <DealPipeline 
          deals={mockDeals}
          dealStages={mockDealStages}
          totalDeals={mockDeals.length}
          currentPage={1}
          totalPages={1}
          onPageChange={handlePageChange}
          onDealClick={handleDealClick}
          onCreateDeal={handleCreateDeal}
          onExportDeals={handleExportDeals}
        />
      </div>
    </AdminLayout>
  );
}
