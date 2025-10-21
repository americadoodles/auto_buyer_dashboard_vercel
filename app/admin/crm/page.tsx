'use client';

import React from 'react';
import { CRMDashboard } from '../../../components/organisms/CRMDashboard';
import { AdminLayout } from '../../../components/templates/AdminLayout';

// Mock data for now - this will be replaced with real API calls
const mockStats = {
  total_leads: 156,
  qualified_leads: 89,
  total_contacts: 234,
  active_deals: 45,
  won_deals: 23,
  lost_deals: 12,
  total_revenue: 125000,
  pending_tasks: 18,
  overdue_tasks: 3
};

const mockRecentActivities = [
  {
    id: '1',
    type: 'lead' as const,
    description: 'New lead created for 2023 Honda Civic',
    timestamp: '2024-01-15T10:30:00Z',
    user: 'John Doe'
  },
  {
    id: '2',
    type: 'deal' as const,
    description: 'Deal closed for 2022 Toyota Camry',
    timestamp: '2024-01-15T09:15:00Z',
    user: 'Jane Smith'
  },
  {
    id: '3',
    type: 'task' as const,
    description: 'Follow-up call scheduled',
    timestamp: '2024-01-15T08:45:00Z',
    user: 'Mike Johnson'
  }
];

const mockHighScoringVehicles = [
  {
    id: '1',
    make: 'Honda',
    model: 'Civic',
    year: 2023,
    trim: 'EX',
    score: 95,
    price: 25000,
    miles: 15000,
    location: 'Los Angeles, CA'
  },
  {
    id: '2',
    make: 'Toyota',
    model: 'Camry',
    year: 2022,
    trim: 'LE',
    score: 92,
    price: 28000,
    miles: 22000,
    location: 'San Francisco, CA'
  },
  {
    id: '3',
    make: 'BMW',
    model: '3 Series',
    year: 2023,
    trim: '330i',
    score: 88,
    price: 45000,
    miles: 8000,
    location: 'New York, NY'
  }
];

export default function CRMPage() {
  return (
    <AdminLayout>
      <div className="p-6">
        <CRMDashboard
          stats={mockStats}
          recentActivities={mockRecentActivities}
          highScoringVehicles={mockHighScoringVehicles}
          leadConversionRate={57.1}
        />
      </div>
    </AdminLayout>
  );
}
