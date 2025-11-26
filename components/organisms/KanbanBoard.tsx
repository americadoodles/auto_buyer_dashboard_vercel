'use client';

import React, { useState, useMemo } from 'react';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { dealsApi } from '../../lib/services/dealsApi';
import { DealCreateModal } from './DealCreateModal';
import { DealDetailModal } from './DealDetailModal';
import { TaskCreateModal } from './TaskCreateModal';
import { TaskDetailModal } from './TaskDetailModal';

// Generic types
export interface KanbanStage {
  id?: number | string;
  name: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export interface KanbanItem {
  id: string;
  [key: string]: any; // Allow any additional properties
}

export interface KanbanBoardProps<T extends KanbanItem> {
  items: T[];
  stages: KanbanStage[];
  itemsByStage: Record<string, T[]>;
  getStageStats: (stageName: string) => { count: number; value?: number };
  formatCurrency?: (amount: number) => string;
  formatDate: (dateString: string) => string;
  getStageColor: (stageName: string) => string;
  onItemClick: (itemId: string) => void;
  onItemUpdated?: () => void;
  onItemMove?: (itemId: string, newStageId: number | string, newStageName: string) => Promise<void>;
  stagesFromDb?: Array<{ id: number; name: string; color_code?: string }>;
  onCreateItem?: (stageName: string, stageId?: number) => void;
  renderCard: (item: T, stage: KanbanStage, onItemClick: (item: T) => void) => React.ReactNode;
  renderCreateButton?: (stage: KanbanStage, onCreateClick: () => void) => React.ReactNode;
  emptyStateText?: string;
  itemType?: 'deal' | 'task' | string; // For type-specific behavior
}

export function KanbanBoard<T extends KanbanItem>({
  items,
  stages,
  itemsByStage,
  getStageStats,
  formatCurrency,
  formatDate,
  getStageColor,
  onItemClick,
  onItemUpdated,
  onItemMove,
  stagesFromDb,
  onCreateItem,
  renderCard,
  renderCreateButton,
  emptyStateText = 'No items in this stage',
  itemType = 'deal'
}: KanbanBoardProps<T>) {
  const [draggedItem, setDraggedItem] = useState<T | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createModalStageId, setCreateModalStageId] = useState<number | undefined>(undefined);
  const [createModalStageName, setCreateModalStageName] = useState<string>('');
  const [hoveredStage, setHoveredStage] = useState<string | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<T | null>(null);

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
    // Try to find in stages array
    const stage = stages.find(s => s.name.toLowerCase() === stageName.toLowerCase());
    if (stage && typeof stage.id === 'number') return stage.id;
    return undefined;
  };

  // Get stage name from item (for deals vs tasks)
  const getItemStageName = (item: T): string => {
    if (itemType === 'deal') {
      return (item as any).deal_stage?.name || '';
    } else if (itemType === 'task') {
      return (item as any).status?.name || '';
    }
    return '';
  };

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, item: T) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
    // Add visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  // Handle drag end
  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedItem(null);
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

    if (!draggedItem) return;

    // Don't update if dropped on the same stage
    const currentStageName = getItemStageName(draggedItem);
    if (currentStageName.toLowerCase() === targetStageName.toLowerCase() ||
        (currentStageName.toLowerCase().includes('closed') && targetStageName.toLowerCase() === 'closed')) {
      setDraggedItem(null);
      return;
    }

    // Get the stage ID
    const stageId = getStageIdByName(targetStageName);
    if (!stageId) {
      console.error(`Could not find stage ID for stage: ${targetStageName}`);
      setDraggedItem(null);
      return;
    }

    try {
      // Use custom move handler if provided, otherwise use default
      if (onItemMove) {
        await onItemMove(draggedItem.id, stageId, targetStageName);
      } else if (itemType === 'deal') {
        // Default behavior for deals
        await dealsApi.updateDeal(draggedItem.id, {
          deal_stage_id: stageId
        });
      } else {
        console.error('No move handler provided and itemType is not "deal"');
        setDraggedItem(null);
        return;
      }

      // Call the callback to refresh items
      if (onItemUpdated) {
        onItemUpdated();
      }
    } catch (error) {
      console.error('Error updating item stage:', error);
      alert(`Failed to update ${itemType} stage. Please try again.`);
    } finally {
      setDraggedItem(null);
    }
  };

  // Default create button renderer
  const defaultRenderCreateButton = (stage: KanbanStage, onCreateClick: () => void) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={(e) => {
        e.stopPropagation();
        onCreateClick();
      }}
      className={`w-full justify-center ${hoveredStage === stage.name ? 'pointer-events-auto' : 'pointer-events-none'}`}
    >
      <div className="flex items-center justify-center">
        <Icon name="plus" className="w-4 h-4 mr-2" />
        <span className="text-sm font-medium">
          Create {itemType === 'deal' ? 'Deal' : 'Task'}
        </span>
      </div>
    </Button>
  );

  return (
    <div className="w-full">
      <div className="overflow-x-auto pb-4" style={{ scrollbarWidth: 'thin' }}>
        <div className="flex gap-4 min-w-max">
          {stages.map((stage) => {
            const stageItems = itemsByStage[stage.name] || [];
            const stats = getStageStats(stage.name);
            const isDragOver = dragOverStage === stage.name;
            return (
              <div
                key={stage.name}
                className={` h-full ${stage.bgColor} min-w-[300px] rounded-lg border-2 ${isDragOver ? 'border-blue-500 border-dashed' : stage.borderColor} flex flex-col transition-all relative`}
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
                        className="w-3 h-3 rounded-full "
                        style={{ backgroundColor: stage.color }}
                      ></div>
                      <h3 className="font-semibold text-gray-900 truncate">{stage.name}</h3>
                    </div>
                    <Badge color={getStageColor(stage.name)}>
                      {stats.count}
                    </Badge>
                  </div>
                  {stats.value !== undefined && formatCurrency && (
                    <div className="text-xs text-gray-600 font-medium">
                      {formatCurrency(stats.value)}
                    </div>
                  )}
                </div>

                {/* Item Cards */}
                <div className="flex-1 p-3 space-y-3 overflow-y-auto min-h-0">
                  {stageItems.length === 0 ? (
                    <div className={`text-center py-8 text-gray-400 text-sm ${isDragOver ? 'border-2 border-dashed border-blue-400 rounded-lg' : ''}`}>
                      {isDragOver ? `Drop ${itemType} here` : emptyStateText}
                    </div>
                  ) : (
                    stageItems.map((item) => (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item)}
                        onDragEnd={handleDragEnd}
                        className={`bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all cursor-move ${
                          draggedItem?.id === item.id ? 'opacity-50' : ''
                        }`}
                      >
                        {renderCard(item, stage, (clickedItem) => {
                          setSelectedItem(clickedItem);
                          if (itemType === 'deal' || itemType === 'task') {
                            setDetailModalOpen(true);
                          }
                          onItemClick(clickedItem.id);
                        })}
                      </div>
                    ))
                  )}
                </div>

                {/* Create Item Button - Always takes space at bottom, visible on hover */}
                {onCreateItem && (
                  <div 
                    className={`p-3 border-t-2 border-gray-200  transition-opacity ${
                      hoveredStage === stage.name ? 'opacity-100' : 'opacity-0'
                    }`}
                    onDragOver={(e) => handleDragOver(e, stage.name)}
                    onDrop={(e) => handleDrop(e, stage.name)}
                  >
                    {renderCreateButton 
                      ? renderCreateButton(stage, () => {
                          const stageId = getStageIdByName(stage.name);
                          setCreateModalStageId(stageId);
                          setCreateModalStageName(stage.name);
                          setCreateModalOpen(true);
                        })
                      : defaultRenderCreateButton(stage, () => {
                          const stageId = getStageIdByName(stage.name);
                          setCreateModalStageId(stageId);
                          setCreateModalStageName(stage.name);
                          setCreateModalOpen(true);
                        })
                    }
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Deal-specific modals - only render if itemType is 'deal' */}
      {itemType === 'deal' && (
        <>
          <DealCreateModal
            isOpen={createModalOpen}
            onClose={() => {
              setCreateModalOpen(false);
              setCreateModalStageId(undefined);
              setCreateModalStageName('');
            }}
            onCreated={() => {
              if (onItemUpdated) {
                onItemUpdated();
              }
              setCreateModalOpen(false);
              setCreateModalStageId(undefined);
              setCreateModalStageName('');
            }}
            stageId={createModalStageId}
            stageName={createModalStageName}
          />

          <DealDetailModal
            isOpen={detailModalOpen}
            onClose={() => {
              setDetailModalOpen(false);
              setSelectedItem(null);
            }}
            deal={selectedItem as any}
            onDealUpdated={() => {
              if (onItemUpdated) {
                onItemUpdated();
              }
            }}
          />
        </>
      )}

      {/* Task-specific modals - only render if itemType is 'task' */}
      {itemType === 'task' && (
        <>
          <TaskCreateModal
            isOpen={createModalOpen}
            onClose={() => {
              setCreateModalOpen(false);
              setCreateModalStageId(undefined);
              setCreateModalStageName('');
            }}
            onCreated={() => {
              if (onItemUpdated) {
                onItemUpdated();
              }
              setCreateModalOpen(false);
              setCreateModalStageId(undefined);
              setCreateModalStageName('');
            }}
            statusId={createModalStageId}
            statusName={createModalStageName}
          />

          <TaskDetailModal
            isOpen={detailModalOpen}
            onClose={() => {
              setDetailModalOpen(false);
              setSelectedItem(null);
            }}
            task={selectedItem as any}
            onTaskUpdated={() => {
              if (onItemUpdated) {
                onItemUpdated();
              }
            }}
          />
        </>
      )}
    </div>
  );
}
