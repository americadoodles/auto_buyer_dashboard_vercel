'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '../molecules/Card';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Icon } from '../atoms/Icon';
import { Pagination } from '../molecules/Pagination';
import { KanbanBoard } from './KanbanBoard';
import { useDealStages, useDealCategories } from '../../lib/hooks/useDeals';
import { Deal } from '../../lib/types/deal';
import { useAuth } from '../../app/auth/useAuth';
import { ApiService } from '../../lib/services/api';
import { User } from '../../lib/types/user';

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
  viewAllDeals?: boolean;
  onViewAllToggle?: (value: boolean) => void;
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
  viewAllDeals = false,
  onViewAllToggle,
  loading
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [assignedFilter, setAssignedFilter] = useState('all');
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  
  // Get current user for role-based filtering
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === 'admin';
  
  // Fetch deal stages and categories from database
  const { stages: dbStages, loading: stagesLoading } = useDealStages();
  const { categories, loading: categoriesLoading } = useDealCategories();
  
  // Fetch users for the assigned to filter
  useEffect(() => {
    const fetchUsers = async () => {
      if (isAdmin) {
        // Only admins can fetch all users
        setUsersLoading(true);
        try {
          const usersData = await ApiService.getUsers().catch(() => []);
          setUsers(usersData);
        } catch (error) {
          console.error('Error fetching users:', error);
          setUsers([]);
        } finally {
          setUsersLoading(false);
        }
      } else {
        // For buyers, just show themselves
        if (user) {
          setUsers([user]);
        }
      }
    };
    
    fetchUsers();
  }, [isAdmin, user]);

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
    // Map common hex colors to Tailwind classes with dark mode variants
    const colorMap: Record<string, { bg: string; border: string }> = {
      '#3B82F6': { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' }, // blue
      '#10B981': { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800' }, // green
      '#F59E0B': { bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800' }, // yellow/amber
      '#8B5CF6': { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800' }, // purple
      '#059669': { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800' }, // emerald
      '#EF4444': { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800' }, // red
      '#F97316': { bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800' }, // orange
      '#06B6D4': { bg: 'bg-cyan-50 dark:bg-cyan-900/20', border: 'border-cyan-200 dark:border-cyan-800' }, // cyan
      '#6366F1': { bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-200 dark:border-indigo-800' }, // indigo
      '#EC4899': { bg: 'bg-pink-50 dark:bg-pink-900/20', border: 'border-pink-200 dark:border-pink-800' }, // pink
    };
    
    // Check if we have a direct mapping
    if (colorMap[hexColor]) {
      return colorMap[hexColor];
    }
    
    // Default to gray if no match
    return { bg: 'bg-claude-cream dark:bg-coal-900/20', border: 'border-claude-border dark:border-coal-700' };
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

  // Filter deals based on user role
  // Admin: show all deals
  // Buyer: show only deals where buyer is assigned_to
  const dealsToDisplay = useMemo(() => {
    if (isAdmin) {
      return deals;
    }
    
    // For buyers, filter deals where they are assigned_to
    const buyerId = user?.id;
    if (!buyerId) return [];
    
    return deals.filter(deal => {
      const assignedToId = typeof deal.assigned_to === 'object' && deal.assigned_to !== null && 'id' in deal.assigned_to
        ? deal.assigned_to.id
        : null;
      return assignedToId === buyerId;
    });
  }, [deals, isAdmin, user?.id]);
  
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

  // Calculate total pipeline value from actual deals (excluding won/lost deals)
  const totalPipelineValue = dealsToDisplay
    .filter(deal => !deal.is_won && !deal.is_lost)
    .reduce((sum, deal) => sum + Number(deal.deal_value || 0), 0);
  const wonDealsValue = dealsToDisplay.filter(deal => deal.is_won).reduce((sum, deal) => sum + Number(deal.deal_value || 0), 0);
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

      // Assigned filter (filter by assigned_to user ID)
      if (assignedFilter !== 'all') {
        const assignedToId = typeof deal.assigned_to === 'object' && deal.assigned_to !== null && 'id' in deal.assigned_to
          ? deal.assigned_to.id
          : null;
        if (assignedToId !== assignedFilter) return false;
      }

      return true;
    });
  }, [dealsToDisplay, searchTerm, stageFilter, categoryFilter, assignedFilter, user?.id]);

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
          <h1 className="text-3xl font-bold text-claude-ink dark:text-coal-100">Deal Pipeline</h1>
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
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <Icon name="briefcase" className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <p className="text-sm font-medium text-claude-subtle dark:text-coal-400 whitespace-nowrap">Total Deals</p>
            </div>
              <p className="text-2xl font-semibold text-claude-ink dark:text-coal-100">{dealsToDisplay.length}</p>
          </div>
        </Card>
        <Card className="px-4 py-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <Icon name="check-circle" className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <p className="text-sm font-medium text-claude-subtle dark:text-coal-400 whitespace-nowrap">Won</p>
            </div>
            <p className="text-2xl font-semibold text-claude-ink dark:text-coal-100">{closedWonDeals.length}</p>
          </div>
        </Card>
        <Card className="px-4 py-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <Icon name="x-circle" className="w-4 h-4 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <p className="text-sm font-medium text-claude-subtle dark:text-coal-400 whitespace-nowrap">Lost</p>
            </div>
            <p className="text-2xl font-semibold text-claude-ink dark:text-coal-100">{closedLostDeals.length}</p>
          </div>
        </Card>
        <Card className="px-4 py-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                  <Icon name="dollar-sign" className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <p className="text-sm font-medium text-claude-subtle dark:text-coal-400 whitespace-nowrap">Pipeline Value</p>
            </div>
            <p className="text-2xl font-semibold text-claude-ink dark:text-coal-100">{formatCurrency(totalPipelineValue)}</p>
          </div>
        </Card>
      </div>

      {/* Filters and Kanban Layout */}
      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
        {/* Filters - Left Side */}
        <Card className="p-4 lg:w-72 flex-shrink-0">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-claude-text dark:text-coal-300 mb-2">
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
              <label className="block text-sm font-medium text-claude-text dark:text-coal-300 mb-2">
                Stage
              </label>
              <select
                value={stageFilter}
                onChange={(e) => handleStageFilterChange(e.target.value)}
                className="w-full px-3 py-2 border border-claude-divider dark:border-coal-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-claude-surface dark:bg-coal-700 text-claude-ink dark:text-coal-100"
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
              <label className="block text-sm font-medium text-claude-text dark:text-coal-300 mb-2">
                Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => handleCategoryFilterChange(e.target.value)}
                className="w-full px-3 py-2 border border-claude-divider dark:border-coal-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-claude-surface dark:bg-coal-700 text-claude-ink dark:text-coal-100"
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
            {isAdmin && (
              <div>
                <label className="block text-sm font-medium text-claude-text dark:text-coal-300 mb-2">
                  Assigned To
                </label>
                <select
                  value={assignedFilter}
                  onChange={(e) => handleAssignedToFilterChange(e.target.value)}
                  className="w-full px-3 py-2 border border-claude-divider dark:border-coal-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-claude-surface dark:bg-coal-700 text-claude-ink dark:text-coal-100"
                  disabled={loading || usersLoading}
                >
                  <option value="all">All Users</option>
                  {user && (
                    <option key={user.id} value={user.id}>Me ({user.username})</option>
                  )}
                  {users
                    .filter(userOption => userOption.id !== user?.id) // Don't show current user twice
                    .map((userOption) => (
                      <option key={userOption.id} value={userOption.id}>
                        {userOption.username}
                      </option>
                    ))}
                </select>
              </div>
            )}
            <div className="flex items-center pt-2">
              <input
                id="view-all-deals-checkbox"
                type="checkbox"
                checked={viewAllDeals}
                onChange={(e) => onViewAllToggle?.(e.target.checked)}
                className="h-4 w-4 rounded border-claude-divider dark:border-coal-600 text-blue-600 focus:ring-blue-500 dark:bg-coal-700"
              />
              <label htmlFor="view-all-deals-checkbox" className="ml-2 text-sm text-claude-text dark:text-coal-300">
                View All Deals
              </label>
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
                  <div className="">
                    <h4 
                      onClick={(e) => {
                        e.stopPropagation();
                        onItemClick(deal);
                      }}
                      className="text-lg font-semibold text-claude-ink dark:text-coal-100 line-clamp-2 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors"
                    >
                      {deal.name}
                    </h4>
                  </div>

                  {/* Deal Value */}
                  <div className="">
                    <div className="text-lg font-bold text-claude-ink dark:text-coal-100">
                      {formatCurrency(deal.deal_value)}
                    </div>
                  </div>

                  {/* Contact and Owner */}
                  {(deal.contact || deal.assigned_to) && (
                    <div className="flex gap-2">
                      {deal.contact && (
                        <div className="flex-1 flex items-center space-x-2 text-xs text-claude-text dark:text-coal-300 bg-blue-100 dark:bg-blue-900/30 rounded-lg px-2 py-1">
                          <div className="w-5 h-5 rounded-full bg-blue-300 dark:bg-blue-700 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-medium text-claude-text dark:text-coal-300">
                              {(deal.contact.first_name?.[0]?.toUpperCase() || '')}{(deal.contact.last_name?.[0]?.toUpperCase() || '')}
                            </span>
                          </div>
                          <span className="truncate text-claude-muted dark:text-coal-300">
                            {deal.contact.first_name?.charAt(0).toUpperCase() + deal.contact.first_name?.slice(1)} {deal.contact.last_name?.charAt(0).toUpperCase() + deal.contact.last_name?.slice(1)}
                          </span>
                        </div>
                      )}
                      {deal.assigned_to && (
                        <div className="flex-1 flex items-center space-x-1 text-xs text-claude-text dark:text-coal-300 bg-yellow-200 dark:bg-yellow-900/30 rounded-lg px-2 py-1">
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
                  <div className="">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-claude-subtle dark:text-coal-400">Probability</span>
                      <span className="text-xs font-medium text-claude-text dark:text-coal-300">{deal.probability}%</span>
                    </div>
                    <div className="w-full bg-claude-sand dark:bg-coal-700 rounded-full h-1.5">
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
                  <div className="">
                    <div className="flex items-center space-x-1 text-xs text-claude-subtle dark:text-coal-400">
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
