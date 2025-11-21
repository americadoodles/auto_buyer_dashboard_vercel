'use client';

import React, { useState, useMemo } from 'react';
import { Card } from '../molecules/Card';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Icon } from '../atoms/Icon';
import { Pagination } from '../molecules/Pagination';
import { KanbanBoard } from './KanbanBoard';
import { useDealStages, useDealCategories } from '../../lib/hooks/useDeals';

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
  
  // Fetch deal stages and categories from database
  const { stages: dbStages, loading: stagesLoading } = useDealStages();
  const { categories, loading: categoriesLoading } = useDealCategories();

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

  // Helper function to convert hex color to Tailwind classes
  const getTailwindColors = (hexColor: string) => {
    // Map common hex colors to Tailwind classes
    const colorMap: Record<string, { bg: string; border: string }> = {
      '#3B82F6': { bg: 'bg-blue-50', border: 'border-blue-200' }, // blue
      '#10B981': { bg: 'bg-green-50', border: 'border-green-200' }, // green
      '#F59E0B': { bg: 'bg-yellow-50', border: 'border-yellow-200' }, // yellow/amber
      '#8B5CF6': { bg: 'bg-purple-50', border: 'border-purple-200' }, // purple
      '#059669': { bg: 'bg-emerald-50', border: 'border-emerald-200' }, // emerald
      '#EF4444': { bg: 'bg-red-50', border: 'border-red-200' }, // red
      '#F97316': { bg: 'bg-orange-50', border: 'border-orange-200' }, // orange
      '#06B6D4': { bg: 'bg-cyan-50', border: 'border-cyan-200' }, // cyan
      '#6366F1': { bg: 'bg-indigo-50', border: 'border-indigo-200' }, // indigo
      '#EC4899': { bg: 'bg-pink-50', border: 'border-pink-200' }, // pink
    };
    
    // Check if we have a direct mapping
    if (colorMap[hexColor]) {
      return colorMap[hexColor];
    }
    
    // Default to gray if no match
    return { bg: 'bg-gray-50', border: 'border-gray-200' };
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

  const dealsToDisplay = deals
  // Define the Kanban stages from database (moved before dealsByStage to avoid dependency issues)
  const kanbanStages = useMemo(() => {
    // Use database stages from useDealStages hook
    // Map database stages to kanban format, sorted by sort_order
    return dbStages
      .filter(stage => stage.is_active !== false) // Only include active stages
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)) // Sort by sort_order
      .map(stage => {
        const color = stage.color_code || '#6B7280'; // Default gray if no color
        const tailwindColors = getTailwindColors(color);
        return {
          name: stage.name,
          color: color,
          bgColor: tailwindColors.bg,
          borderColor: tailwindColors.border
        };
      });
  }, [dbStages]);

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
        const dealCategoryId = deal.deal_category?.id?.toString() || '';
        if (dealCategoryId !== categoryFilter) return false;
      }

      // Assigned filter
      if (assignedFilter !== 'all') {
        if (assignedFilter === 'me') {
          // You might want to check against current user
          return true; // Placeholder
        }
        const assignedUsername = typeof deal.assigned_to === 'object' && deal.assigned_to !== null && 'username' in deal.assigned_to
          ? deal.assigned_to.username.toLowerCase()
          : '';
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
      // Match exact stage name (including "Closed Won" and "Closed Lost")
      const matchedStage = kanbanStages.find(s => 
        s.name.toLowerCase() === stageName.toLowerCase()
      );
      if (matchedStage) {
        grouped[matchedStage.name].push(deal);
      } else {
      }
    });

    return grouped;
  }, [filteredDeals, kanbanStages]);

  // Calculate stage totals
  const getStageStats = (stageName: string) => {
    const stageDeals = dealsByStage[stageName] || [];
    const count = stageDeals.length;
    const value = stageDeals.reduce((sum, deal) => sum + Number(deal.deal_value), 0);
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
          {/* <Button onClick={onCreateDeal}>
            <Icon name="plus" className="w-4 h-4 mr-2" />
            New Deal
          </Button> */}
        </div>
      </div>

      {/* Pipeline Overview */}
      {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
      </div> */}

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
              disabled={categoriesLoading}
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id.toString()}>
                  {category.name}
                </option>
              ))}
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
        items={filteredDeals}
        stages={kanbanStages}
        itemsByStage={dealsByStage}
        getStageStats={getStageStats}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
        getStageColor={getStageColor}
        onItemClick={onDealClick}
        onItemUpdated={onDealUpdated}
        stagesFromDb={stages}
        itemType="deal"
        onCreateItem={(stageName, stageId) => {
          // Handled by KanbanBoard's create button
        }}
        renderCard={(deal, stage, onItemClick) => (
          <>
            {/* Deal Header */}
            <div className="mb-3">
              <h4 
                onClick={(e) => {
                  e.stopPropagation();
                  onItemClick(deal);
                }}
                className="text-lg font-semibold text-gray-900 mb-1 line-clamp-2 cursor-pointer hover:text-blue-600 hover:underline transition-colors"
              >
                {deal.name}
              </h4>
              {deal.description && (
                <p className="text-xs text-gray-500 line-clamp-2">
                  {deal.description}
                </p>
              )}
            </div>

            {/* Deal Value */}
            <div className="mb-3">
              <div className="text-lg font-bold text-gray-900">
                {formatCurrency(deal.deal_value)}
              </div>
            </div>

            {/* Contact */}
            {deal.contact && (
              <div className="mb-3 flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full bg-blue-300 flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-700">
                    {(deal.contact.first_name?.[0]?.toUpperCase() || '')}{(deal.contact.last_name?.[0]?.toUpperCase() || '')}
                  </span>
                </div>
                <span className="text-xs text-gray-600">
                  {deal.contact.first_name?.charAt(0).toUpperCase() + deal.contact.first_name?.slice(1)} {deal.contact.last_name?.charAt(0).toUpperCase() + deal.contact.last_name?.slice(1)}
                </span>
              </div>
            )}

            {/* Probability */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">Probability</span>
                <span className="text-xs font-medium text-gray-700">{deal.probability}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full"
                  style={{ 
                    width: `${deal.probability}%`,
                    backgroundColor: stage.color
                  }}
                ></div>
              </div>
            </div>

            {/* Expected Close Date */}
            <div className="mb-3">
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <Icon name="calendar" className="w-3 h-3" />
                <span>{formatDate(deal.expected_close_date)}</span>
              </div>
            </div>

            {/* Assigned To */}
            {deal.assigned_to && (
              <div className="mb-3">
                <div className="flex items-center space-x-1 text-xs text-gray-700 bg-yellow-200 rounded-lg px-2 py-1">
                  <Icon name="user" className="w-3 h-3" />
                  <span>
                    {'Owner: '}
                    {typeof deal.assigned_to === 'object' && 
                     deal.assigned_to !== null && 
                     'username' in deal.assigned_to 
                      ? String(deal.assigned_to.username) 
                      : 'Unassigned'}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
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
