'use client';

import React, { useState, useMemo } from 'react';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { dealsApi } from '../../lib/services/dealsApi';
import { DealCreateModal } from './DealCreateModal';
import { DealDetailModal } from './DealDetailModal';

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

interface KanbanStage {
  name: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

interface KanbanBoardProps {
  deals: Deal[];
  stages: KanbanStage[];
  dealsByStage: Record<string, Deal[]>;
  getStageStats: (stageName: string) => { count: number; value: number };
  formatCurrency: (amount: number) => string;
  formatDate: (dateString: string) => string;
  getStageColor: (stageName: string) => string;
  onDealClick: (dealId: string) => void;
  onDealUpdated?: () => void;
  stagesFromDb?: Array<{ id: number; name: string; color_code?: string }>;
  onCreateDeal?: (stageName: string, stageId?: number) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  deals,
  stages,
  dealsByStage,
  getStageStats,
  formatCurrency,
  formatDate,
  getStageColor,
  onDealClick,
  onDealUpdated,
  stagesFromDb,
  onCreateDeal
}) => {
  const [draggedDeal, setDraggedDeal] = useState<Deal | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createModalStageId, setCreateModalStageId] = useState<number | undefined>(undefined);
  const [createModalStageName, setCreateModalStageName] = useState<string>('');
  const [hoveredStage, setHoveredStage] = useState<string | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  // Map stage name to stage ID
  const getStageIdByName = (stageName: string): number | undefined => {
    // First try to find in the stagesFromDb prop
    if (stagesFromDb && stagesFromDb.length > 0) {
      const stage = stagesFromDb.find(s => 
        s.name.toLowerCase() === stageName.toLowerCase() ||
        (stageName.toLowerCase().includes('closed') && s.name.toLowerCase().includes('closed'))
      );
      if (stage) return stage.id;
    }
    return undefined;
  };

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, deal: Deal) => {
    setDraggedDeal(deal);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', deal.id);
    // Add visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  // Handle drag end
  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedDeal(null);
    setDragOverStage(null);
    // Reset visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, stageName: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStage(stageName);
  };

  // Handle drag leave
  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if we're leaving the drop zone, not entering a child
    const target = e.currentTarget as HTMLElement;
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!target.contains(relatedTarget)) {
      setDragOverStage(null);
    }
  };

  // Handle drop
  const handleDrop = async (e: React.DragEvent, targetStageName: string) => {
    e.preventDefault();
    setDragOverStage(null);

    if (!draggedDeal) return;

    // Don't update if dropped on the same stage
    const currentStageName = draggedDeal.deal_stage?.name || '';
    if (currentStageName.toLowerCase() === targetStageName.toLowerCase() ||
        (currentStageName.toLowerCase().includes('closed') && targetStageName.toLowerCase() === 'closed')) {
      setDraggedDeal(null);
      return;
    }

    // Get the stage ID
    const stageId = getStageIdByName(targetStageName);
    if (!stageId) {
      console.error(`Could not find stage ID for stage: ${targetStageName}`);
      setDraggedDeal(null);
      return;
    }

    try {
      // Update the deal's stage
      await dealsApi.updateDeal(draggedDeal.id, {
        deal_stage_id: stageId
      });

      // Call the callback to refresh deals
      if (onDealUpdated) {
        onDealUpdated();
      }
    } catch (error) {
      console.error('Error updating deal stage:', error);
      alert('Failed to update deal stage. Please try again.');
    } finally {
      setDraggedDeal(null);
    }
  };

  return (
    <div className="w-full">
      <div className="overflow-x-auto pb-4" style={{ scrollbarWidth: 'thin' }}>
        <div className="flex gap-4 min-w-max">
          {stages.map((stage) => {
          const stageDeals = dealsByStage[stage.name] || [];
          const stats = getStageStats(stage.name);
          const isDragOver = dragOverStage === stage.name;
          return (
            <div
              key={stage.name}
              className={`flex-shrink-0 w-[300px]  h-[800px] ${stage.bgColor} rounded-lg border-2 ${isDragOver ? 'border-blue-500 border-dashed' : stage.borderColor} flex flex-col transition-all relative`}
              onDragOver={(e) => handleDragOver(e, stage.name)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.name)}
              onMouseEnter={() => setHoveredStage(stage.name)}
              onMouseLeave={() => setHoveredStage(null)}
              onFocus={() => setHoveredStage(stage.name)}
              onBlur={(e) => {
                // Only clear hover if focus is moving outside the stage column
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setHoveredStage(null);
                }
              }}
            >
              {/* Column Header */}
              <div className={`p-4 border-b-2 ${stage.borderColor} ${stage.bgColor}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: stage.color }}
                    ></div>
                    <h3 className="font-semibold text-gray-900 truncate">{stage.name}</h3>
                  </div>
                  <Badge color={getStageColor(stage.name)}>
                    {stats.count}
                  </Badge>
                </div>
                <div className="text-xs text-gray-600 font-medium">
                  {formatCurrency(stats.value)}
                </div>
              </div>

              {/* Deal Cards */}
              <div className="flex-1 p-3 space-y-3 overflow-y-auto min-h-0">
                {stageDeals.length === 0 ? (
                  <div className={`text-center py-8 text-gray-400 text-sm ${isDragOver ? 'border-2 border-dashed border-blue-400 rounded-lg' : ''}`}>
                    {isDragOver ? 'Drop deal here' : 'No deals in this stage'}
                  </div>
                ) : (
                  stageDeals.map((deal) => (
                    <div
                      key={deal.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, deal)}
                      onDragEnd={handleDragEnd}
                      className={`bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all cursor-move ${
                        draggedDeal?.id === deal.id ? 'opacity-50' : ''
                      }`}
                    >
                      {/* Deal Header */}
                      <div className="mb-3">
                        <h4 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDeal(deal);
                            setDetailModalOpen(true);
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

                      {/* Actions */}
                      {/* <div className="flex items-center justify-end space-x-1 pt-2 border-t border-gray-100">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDeal(deal);
                            setDetailModalOpen(true);
                          }}
                          className="h-7 w-7 p-0"
                          title="View Deal"
                        >
                          <Icon name="eye" className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle edit
                          }}
                          className="h-7 w-7 p-0"
                          title="Edit Deal"
                        >
                          <Icon name="edit" className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle call
                          }}
                          className="h-7 w-7 p-0"
                          title="Call Contact"
                        >
                          <Icon name="phone" className="w-3 h-3" />
                        </Button>
                      </div> */}
                    </div>
                  ))
                )}
              </div>

              {/* Create Deal Button - Always takes space at bottom, visible on hover */}
              <div 
                className={`p-3 border-t-2 border-gray-200 flex-shrink-0 transition-opacity ${
                  hoveredStage === stage.name ? 'opacity-100' : 'opacity-0'
                }`}
                onDragOver={(e) => handleDragOver(e, stage.name)}
                onDrop={(e) => handleDrop(e, stage.name)}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    const stageId = getStageIdByName(stage.name);
                    setCreateModalStageId(stageId);
                    setCreateModalStageName(stage.name);
                    setCreateModalOpen(true);
                  }}
                  className={`w-full justify-center ${hoveredStage === stage.name ? 'pointer-events-auto' : 'pointer-events-none'}`}
                >
                  <div className="flex items-center justify-center">
                  <Icon name="plus" className="w-4 h-4 mr-2" />
                  <span className="text-sm font-medium">
                    Create Deal
                  </span>
                  </div>
                </Button>
              </div>
            </div>
          );
        })}
        </div>
      </div>

      {/* Create Deal Modal */}
      <DealCreateModal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setCreateModalStageId(undefined);
          setCreateModalStageName('');
        }}
        onCreated={() => {
          if (onDealUpdated) {
            onDealUpdated();
          }
          setCreateModalOpen(false);
          setCreateModalStageId(undefined);
          setCreateModalStageName('');
        }}
        stageId={createModalStageId}
        stageName={createModalStageName}
      />

      {/* Deal Detail Modal */}
      <DealDetailModal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedDeal(null);
        }}
        deal={selectedDeal}
        onDealUpdated={() => {
          if (onDealUpdated) {
            onDealUpdated();
          }
        }}
      />
    </div>
  );
};

