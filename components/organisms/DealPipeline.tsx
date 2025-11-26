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
import { Deal } from '../../lib/types/deal';

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
  stages,
  onSearch,
  onStageFilter,
  onCategoryFilter,
  loading
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

  const dealsToDisplay = deals;
  
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
  const closedWonDeals = dealsToDisplay.filter(deal => deal.is_won);
  const closedLostDeals = dealsToDisplay.filter(deal => deal.deal_stage?.name?.toLowerCase() === 'closed lost');

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  const handleStageFilterChange = (value: string) => {
    setStageFilter(value);
    if (onStageFilter) {
      const stageId = value === 'all' ? undefined : dealStages.find(s => s.name.toLowerCase() === value.toLowerCase())?.id;
      onStageFilter(stageId);
    }
  };

  const handleCategoryFilterChange = (value: string) => {
    setCategoryFilter(value);
    if (onCategoryFilter) {
      const categoryId = value === 'all' ? undefined : parseInt(value, 10);
      onCategoryFilter(categoryId);
    }
  };

  const handleAssignedToFilterChange = (value: string) => {
    setAssignedFilter(value);
    // You might want to add onAssignedToFilter prop if needed
  };

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
  }, [dealsToDisplay, searchTerm, stageFilter, categoryFilter, assignedFilter]);

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
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center mb-2 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Deal Pipeline</h1>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={onExportDeals}>
            <Icon name="download" className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Deal Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2 flex-shrink-0">
        <Card className="px-4 py-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Icon name="briefcase" className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <p className="text-sm font-medium text-gray-500 whitespace-nowrap">Total Deals</p>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{totalDeals}</p>
          </div>
        </Card>
        <Card className="px-4 py-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Icon name="check-circle" className="w-4 h-4 text-green-600" />
                </div>
              </div>
              <p className="text-sm font-medium text-gray-500 whitespace-nowrap">Won</p>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{closedWonDeals.length}</p>
          </div>
        </Card>
        <Card className="px-4 py-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <Icon name="x-circle" className="w-4 h-4 text-red-600" />
                </div>
              </div>
              <p className="text-sm font-medium text-gray-500 whitespace-nowrap">Lost</p>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{closedLostDeals.length}</p>
          </div>
        </Card>
        <Card className="px-4 py-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <Icon name="dollar-sign" className="w-4 h-4 text-purple-600" />
                </div>
              </div>
              <p className="text-sm font-medium text-gray-500 whitespace-nowrap">Pipeline Value</p>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{formatCurrency(totalPipelineValue)}</p>
          </div>
        </Card>
      </div>

      {/* Filters and Kanban Layout */}
      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
        {/* Filters - Left Side */}
        <Card className="p-4 lg:w-72 flex-shrink-0">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <Input
                type="text"
                placeholder="Search deals..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stage
              </label>
              <select
                value={stageFilter}
                onChange={(e) => handleStageFilterChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={stagesLoading}
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
                onChange={(e) => handleCategoryFilterChange(e.target.value)}
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
                onChange={(e) => handleAssignedToFilterChange(e.target.value)}
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

        {/* Kanban Board - Right Side */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0">
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
                  <div className="mb-2">
                    <h4 
                      onClick={(e) => {
                        e.stopPropagation();
                        onItemClick(deal);
                      }}
                      className="text-lg font-semibold text-gray-900 mb-1 line-clamp-2 cursor-pointer hover:text-blue-600 hover:underline transition-colors"
                    >
                      {deal.name}
                    </h4>
                  </div>

                  {/* Deal Value */}
                  <div className="mb-2">
                    <div className="text-lg font-bold text-gray-900">
                      {formatCurrency(deal.deal_value)}
                    </div>
                  </div>

                  {/* Contact and Owner */}
                  {(deal.contact || deal.assigned_to) && (
                    <div className="mb-2 flex gap-2">
                      {deal.contact && (
                        <div className="flex-1 flex items-center space-x-2 text-xs text-gray-700 bg-blue-100 rounded-lg px-2 py-1">
                          <div className="w-5 h-5 rounded-full bg-blue-300 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-medium text-gray-700">
                              {(deal.contact.first_name?.[0]?.toUpperCase() || '')}{(deal.contact.last_name?.[0]?.toUpperCase() || '')}
                            </span>
                          </div>
                          <span className="truncate text-gray-600">
                            {deal.contact.first_name?.charAt(0).toUpperCase() + deal.contact.first_name?.slice(1)} {deal.contact.last_name?.charAt(0).toUpperCase() + deal.contact.last_name?.slice(1)}
                          </span>
                        </div>
                      )}
                      {deal.assigned_to && (
                        <div className="flex-1 flex items-center space-x-1 text-xs text-gray-700 bg-yellow-200 rounded-lg px-2 py-1">
                          <Icon name="user" className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">
                            Owner: {typeof deal.assigned_to === 'object' && 
                            deal.assigned_to !== null && 
                            'username' in deal.assigned_to 
                              ? String(deal.assigned_to.username) 
                              : 'Unassigned'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  {/* Probability */}
                  <div className="mb-2">
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
                  <div className="mb-2">
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <Icon name="calendar" className="w-3 h-3" />
                      <span>{formatDate(deal.expected_close_date)}</span>
                    </div>
                  </div>

                  
                </>
              )}
            emptyStateText="No deals in this stage"
          />
          </div>
        </div>
      </div>
    </div>
  );
};
