'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DealPipeline } from '../../../components/organisms/DealPipeline';
import { useDeals, useDealStages, useDealPipeline } from '../../../lib/hooks/useDeals';

export default function DealsPage() {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<number | undefined>(undefined);
  const [categoryFilter, setCategoryFilter] = useState<number | undefined>(undefined);

  const { deals, loading, error, refreshDeals } = useDeals({
    skip: (currentPage - 1) * pageSize,
    limit: pageSize,
    search: searchTerm || undefined,
    stage_id: stageFilter,
    category_id: categoryFilter
  });
  const { stages } = useDealStages();
  const { pipeline } = useDealPipeline();

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleDealClick = (dealId: string) => {
    router.push(`/crm/deals/${dealId}`);
  };

  const handleCreateDeal = async () => {
    try {
      // Here you would call the API to create a new deal
      console.log('Create deal clicked');
      // Refresh the deals list
      refreshDeals();
    } catch (error) {
      console.error('Error creating deal:', error);
    }
  };

  const handleExportDeals = () => {
    console.log('Export deals clicked');
  };

  const handleSearch = (search: string) => {
    setSearchTerm(search);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleStageFilter = (stageId: number | undefined) => {
    setStageFilter(stageId);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleCategoryFilter = (categoryId: number | undefined) => {
    setCategoryFilter(categoryId);
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Transform deals data to match component expectations
  const transformedDeals = deals.map(deal => {
    const foundStage = deal.deal_stage_id ? stages.find(s => s.id === deal.deal_stage_id) : undefined;
    
    return {
      ...deal,
      name: deal.title, // Map title to name for component compatibility
      description: deal.description || '', // Ensure description is always a string
      deal_value: deal.deal_value || 0, // Ensure deal_value is always a number
      probability: deal.probability || 0, // Ensure probability is always a number
      expected_close_date: deal.expected_close_date || new Date().toISOString(), // Ensure date is always a string
      is_won: deal.is_won || false, // Ensure is_won is always a boolean
      is_lost: deal.is_lost || false, // Ensure is_lost is always a boolean
      contact: deal.contact_id ? {
        id: deal.contact_id,
        first_name: deal.contact?.first_name || '',
        last_name: deal.contact?.last_name || ''
      } : undefined,
      deal_stage: foundStage ? {
        id: foundStage.id,
        name: foundStage.name || 'Unknown',
        color: foundStage.color_code || 'gray'
      } : undefined,
      deal_category: deal.deal_category_id ? {
        id: deal.deal_category_id,
        name: deal.deal_category?.name || ''
      } : undefined,
      assigned_to: deal.assigned_to ? (
        typeof deal.assigned_to === 'object' && 
        deal.assigned_to !== null && 
        'username' in deal.assigned_to &&
        'id' in deal.assigned_to
          ? {
              id: String((deal.assigned_to as { id: string | number; username: string }).id || ''),
              username: String((deal.assigned_to as { id: string | number; username: string }).username || '')
            }
          : {
              id: String(deal.assigned_to || ''),
              username: '' // UUID only, no username available
            }
      ) : undefined
    };
  });

  // Transform pipeline data to match component expectations
  const transformedPipeline = pipeline.map(stage => ({
    id: stage.stage_id,
    name: stage.stage_name,
    count: stage.deal_count,
    value: stage.total_value,
    color: stage.color_code
  }));

  // Show loading state
  if (loading && deals.length === 0) {
    return (
      <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400 dark:text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                Error loading deals
              </h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={refreshDeals}
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
      <div className="p-6 h-full overflow-hidden flex flex-col bg-gray-50 dark:bg-gray-900 min-h-screen">
        {/* <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Deal Pipeline</h1>
          <p className="text-gray-600 mt-1">Track and manage your sales opportunities</p>
        </div> */}
        <DealPipeline 
          deals={transformedDeals}
          dealStages={transformedPipeline}
          totalDeals={deals.length}
          currentPage={currentPage}
          totalPages={Math.ceil(deals.length / pageSize)}
          onPageChange={handlePageChange}
          onDealClick={handleDealClick}
          onCreateDeal={handleCreateDeal}
          onExportDeals={handleExportDeals}
          onSearch={handleSearch}
          onStageFilter={handleStageFilter}
          onCategoryFilter={handleCategoryFilter}
          stages={stages}
          loading={loading}
          onDealUpdated={refreshDeals}
        />
      </div>
  );
}
