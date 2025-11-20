'use client';

import React, { useState, useMemo } from 'react';
import { Card } from '../molecules/Card';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Icon } from '../atoms/Icon';
import { Pagination } from '../molecules/Pagination';
import { KanbanBoard } from './KanbanBoard';

interface Deal {
  id: string;
  name: string;
  description: string;
  contact?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  deal_value: number;
  probability: number;
  expected_close_date: string;
  deal_stage?: {
    id: number;
    name: string;
    color: string;
  };
  deal_category?: {
    id: number;
    name: string;
  };
  assigned_to?: {
    id: string;
    username: string;
  };
  is_won: boolean;
  is_lost: boolean;
  created_at: string;
  updated_at: string;
}

interface DealStage {
  id: number;
  name: string;
  count: number;
  value: number;
  color: string;
}

interface DealPipelineProps {
  deals: Deal[];
  dealStages: DealStage[];
  totalDeals: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onDealClick: (dealId: string) => void;
  onCreateDeal: () => void;
  onExportDeals: () => void;
  onSearch?: (search: string) => void;
  onStageFilter?: (stageId: number | undefined) => void;
  onCategoryFilter?: (categoryId: number | undefined) => void;
  stages?: Array<{ id: number; name: string; color_code?: string }>;
  loading?: boolean;
  onDealUpdated?: () => void;
}

export const DealPipeline: React.FC<DealPipelineProps> = ({
  deals,
  dealStages,
  totalDeals,
  currentPage,
  totalPages,
  onPageChange,
  onDealClick,
  onCreateDeal,
  onExportDeals,
  onDealUpdated,
  stages
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [assignedFilter, setAssignedFilter] = useState('all');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getStageColor = (stageName: string) => {
    switch (stageName.toLowerCase()) {
      case 'prospecting': return 'blue';
      case 'qualification': return 'green';
      case 'proposal': return 'yellow';
      case 'negotiation': return 'purple';
      case 'closed won': return 'green';
      case 'closed lost': return 'red';
      default: return 'gray';
    }
  };

  // Sample deals for demonstration (use when no real deals exist)
  const sampleDeals: Deal[] = [
    {
      id: 'sample-1',
      name: '2023 Toyota Camry Purchase',
      description: 'Customer interested in purchasing a 2023 Toyota Camry. Budget: $25,000-$30,000',
      contact: { id: 'c1', first_name: 'John', last_name: 'Smith' },
      deal_value: 28000,
      probability: 15,
      expected_close_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      deal_stage: { id: 1, name: 'Prospecting', color: '#3B82F6' },
      deal_category: { id: 1, name: 'Used Vehicle Sale' },
      assigned_to: { id: 'u1', username: 'sales_rep_1' },
      is_won: false,
      is_lost: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'sample-2',
      name: 'Honda Accord Trade-In Deal',
      description: 'Customer wants to trade in 2019 Honda Accord for a new vehicle',
      contact: { id: 'c2', first_name: 'Sarah', last_name: 'Johnson' },
      deal_value: 35000,
      probability: 30,
      expected_close_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
      deal_stage: { id: 1, name: 'Prospecting', color: '#3B82F6' },
      deal_category: { id: 3, name: 'Trade-In' },
      assigned_to: { id: 'u2', username: 'sales_rep_2' },
      is_won: false,
      is_lost: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'sample-3',
      name: 'BMW 3 Series Financing',
      description: 'High-value customer interested in BMW 3 Series with financing options',
      contact: { id: 'c3', first_name: 'Michael', last_name: 'Davis' },
      deal_value: 45000,
      probability: 40,
      expected_close_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      deal_stage: { id: 2, name: 'Qualification', color: '#10B981' },
      deal_category: { id: 4, name: 'Financing' },
      assigned_to: { id: 'u1', username: 'sales_rep_1' },
      is_won: false,
      is_lost: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'sample-4',
      name: 'Ford F-150 Commercial Sale',
      description: 'Business customer needs fleet of 5 Ford F-150 trucks',
      contact: { id: 'c4', first_name: 'Robert', last_name: 'Wilson' },
      deal_value: 175000,
      probability: 55,
      expected_close_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      deal_stage: { id: 3, name: 'Proposal', color: '#F59E0B' },
      deal_category: { id: 1, name: 'New Vehicle Sale' },
      assigned_to: { id: 'u2', username: 'sales_rep_2' },
      is_won: false,
      is_lost: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'sample-5',
      name: 'Tesla Model 3 Purchase',
      description: 'Customer ready to purchase Tesla Model 3, negotiating final price',
      contact: { id: 'c5', first_name: 'Emily', last_name: 'Brown' },
      deal_value: 42000,
      probability: 80,
      expected_close_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      deal_stage: { id: 4, name: 'Negotiation', color: '#8B5CF6' },
      deal_category: { id: 1, name: 'New Vehicle Sale' },
      assigned_to: { id: 'u1', username: 'sales_rep_1' },
      is_won: false,
      is_lost: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'sample-6',
      name: 'Mercedes-Benz C-Class Sale',
      description: 'Successfully closed deal for Mercedes-Benz C-Class',
      contact: { id: 'c6', first_name: 'David', last_name: 'Martinez' },
      deal_value: 52000,
      probability: 100,
      expected_close_date: new Date().toISOString(),
      deal_stage: { id: 5, name: 'Closed Won', color: '#059669' },
      deal_category: { id: 1, name: 'New Vehicle Sale' },
      assigned_to: { id: 'u2', username: 'sales_rep_2' },
      is_won: true,
      is_lost: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'sample-7',
      name: 'Audi A4 Lease Agreement',
      description: 'Customer exploring lease options for Audi A4',
      contact: { id: 'c7', first_name: 'Lisa', last_name: 'Anderson' },
      deal_value: 38000,
      probability: 25,
      expected_close_date: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString(),
      deal_stage: { id: 2, name: 'Qualification', color: '#10B981' },
      deal_category: { id: 4, name: 'Financing' },
      assigned_to: { id: 'u1', username: 'sales_rep_1' },
      is_won: false,
      is_lost: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'sample-8',
      name: 'Chevrolet Silverado Proposal',
      description: 'Proposal sent for 2024 Chevrolet Silverado 1500',
      contact: { id: 'c8', first_name: 'James', last_name: 'Taylor' },
      deal_value: 48000,
      probability: 60,
      expected_close_date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
      deal_stage: { id: 3, name: 'Proposal', color: '#F59E0B' },
      deal_category: { id: 1, name: 'New Vehicle Sale' },
      assigned_to: { id: 'u2', username: 'sales_rep_2' },
      is_won: false,
      is_lost: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  // Use sample deals if no real deals exist, otherwise use real deals
  const dealsToDisplay = deals.length > 0 ? deals : sampleDeals;

  // Define the Kanban stages in order (moved before dealsByStage to avoid dependency issues)
  const kanbanStages = useMemo(() => [
    { name: 'Prospecting', color: '#3B82F6', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
    { name: 'Qualification', color: '#10B981', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
    { name: 'Proposal', color: '#F59E0B', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' },
    { name: 'Negotiation', color: '#8B5CF6', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
    { name: 'Closed', color: '#059669', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' }
  ], []);

  const totalPipelineValue = dealStages.reduce((sum, stage) => sum + stage.value, 0);
  const wonDealsValue = dealsToDisplay.filter(deal => deal.is_won).reduce((sum, deal) => sum + deal.deal_value, 0);

  // Filter deals based on search and filters
  const filteredDeals = useMemo(() => {
    return dealsToDisplay.filter(deal => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          deal.name.toLowerCase().includes(searchLower) ||
          deal.description?.toLowerCase().includes(searchLower) ||
          deal.contact?.first_name.toLowerCase().includes(searchLower) ||
          deal.contact?.last_name.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Stage filter
      if (stageFilter !== 'all') {
        const dealStageName = deal.deal_stage?.name.toLowerCase() || '';
        if (dealStageName !== stageFilter.toLowerCase()) return false;
      }

      // Category filter
      if (categoryFilter !== 'all') {
        const dealCategoryName = deal.deal_category?.name.toLowerCase().replace(/\s+/g, '_') || '';
        if (dealCategoryName !== categoryFilter) return false;
      }

      // Assigned filter
      if (assignedFilter !== 'all') {
        if (assignedFilter === 'me') {
          // You might want to check against current user
          return true; // Placeholder
        }
        const assignedUsername = deal.assigned_to?.username.toLowerCase() || '';
        if (assignedUsername !== assignedFilter.toLowerCase()) return false;
      }

      return true;
    });
  }, [deals, searchTerm, stageFilter, categoryFilter, assignedFilter]);

  // Group deals by stage
  const dealsByStage = useMemo(() => {
    const grouped: Record<string, Deal[]> = {};
    kanbanStages.forEach(stage => {
      grouped[stage.name] = [];
    });

    filteredDeals.forEach(deal => {
      const stageName = deal.deal_stage?.name || '';
      // Handle "Closed Won" and "Closed Lost" as "Closed"
      if (stageName.toLowerCase().includes('closed')) {
        grouped['Closed'].push(deal);
      } else {
        // Match exact stage name
        const matchedStage = kanbanStages.find(s => 
          s.name.toLowerCase() === stageName.toLowerCase()
        );
        if (matchedStage) {
          grouped[matchedStage.name].push(deal);
        } else {
          // Default to Prospecting if no match
          grouped['Prospecting'].push(deal);
        }
      }
    });

    return grouped;
  }, [filteredDeals, kanbanStages]);

  // Calculate stage totals
  const getStageStats = (stageName: string) => {
    const stageDeals = dealsByStage[stageName] || [];
    const count = stageDeals.length;
    const value = stageDeals.reduce((sum, deal) => sum + deal.deal_value, 0);
    return { count, value };
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Deal Pipeline</h1>
          <p className="text-gray-600 mt-1">
            Manage your sales opportunities ({totalDeals} total)
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={onExportDeals}>
            <Icon name="download" className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={onCreateDeal}>
            <Icon name="plus" className="w-4 h-4 mr-2" />
            New Deal
          </Button>
        </div>
      </div>

      {/* Pipeline Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Stages */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Pipeline Stages</h2>
          <div className="space-y-4">
            {dealStages.map((stage) => (
              <div key={stage.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: stage.color }}></div>
                  <span className="text-sm font-medium text-gray-900">{stage.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">{stage.count} deals</div>
                  <div className="text-xs text-gray-500">{formatCurrency(stage.value)}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-900">Total Pipeline</span>
              <span className="text-sm font-semibold text-gray-900">{formatCurrency(totalPipelineValue)}</span>
            </div>
          </div>
        </Card>

        {/* Revenue Summary */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Revenue Summary</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Won Deals</span>
              <span className="text-sm font-medium text-green-600">{formatCurrency(wonDealsValue)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Pipeline Value</span>
              <span className="text-sm font-medium text-blue-600">{formatCurrency(totalPipelineValue)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Win Rate</span>
              <span className="text-sm font-medium text-gray-900">
                {totalDeals > 0 ? Math.round((deals.filter(deal => deal.is_won).length / totalDeals) * 100) : 0}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Avg Deal Size</span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(totalPipelineValue / Math.max(totalDeals, 1))}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <Input
              type="text"
              placeholder="Search deals..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stage
            </label>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Stages</option>
              {dealStages.map((stage) => (
                <option key={stage.id} value={stage.name.toLowerCase()}>
                  {stage.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              <option value="new_vehicle">New Vehicle Sale</option>
              <option value="used_vehicle">Used Vehicle Sale</option>
              <option value="trade_in">Trade-In</option>
              <option value="financing">Financing</option>
              <option value="service">Service</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assigned To
            </label>
            <select
              value={assignedFilter}
              onChange={(e) => setAssignedFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Users</option>
              <option value="me">Me</option>
              <option value="john">John Doe</option>
              <option value="jane">Jane Smith</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Kanban Board */}
      <KanbanBoard
        deals={filteredDeals}
        stages={kanbanStages}
        dealsByStage={dealsByStage}
        getStageStats={getStageStats}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
        getStageColor={getStageColor}
        onDealClick={onDealClick}
        onDealUpdated={onDealUpdated}
        stagesFromDb={stages}
      />

      {/* Pagination */}
      <div className="mt-6">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
};
