'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { dealsApi } from '../../lib/services/dealsApi';
import { DealCreateModal } from './DealCreateModal';
import { TaskCreateModal } from './TaskCreateModal';

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
  
  // Horizontal scroll drag state
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollStartXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  // Map stage name to stage ID
  const getStageIdByName = (stageName: string): number | undefined => {
    const targetLower = stageName.toLowerCase();
    
    // First try to find in the stagesFromDb prop
    if (stagesFromDb && stagesFromDb.length > 0) {
      // Try exact match first
      let stage = stagesFromDb.find(s => s.name.toLowerCase() === targetLower);
      if (stage) return stage.id;
      
      // For "closed lost" or "closed won", try more specific matching
      if (targetLower.includes('closed') && targetLower.includes('lost')) {
        stage = stagesFromDb.find(s => {
          const sLower = s.name.toLowerCase();
          return sLower.includes('closed') && sLower.includes('lost');
        });
        if (stage) return stage.id;
      } else if (targetLower.includes('closed') && targetLower.includes('won')) {
        stage = stagesFromDb.find(s => {
          const sLower = s.name.toLowerCase();
          return sLower.includes('closed') && sLower.includes('won');
        });
        if (stage) return stage.id;
      }
      
      // Fallback: match any stage containing "closed" if target also contains "closed"
      if (targetLower.includes('closed')) {
        stage = stagesFromDb.find(s => s.name.toLowerCase().includes('closed'));
        if (stage) return stage.id;
      }
    }
    
    // Try to find in stages array
    const stage = stages.find(s => s.name.toLowerCase() === targetLower);
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
    const currentStageLower = currentStageName.toLowerCase();
    const targetStageLower = targetStageName.toLowerCase();
    
    // Only prevent if it's the exact same stage
    if (currentStageLower === targetStageLower) {
      setDraggedItem(null);
      return;
    }

    // Get the stage ID - try multiple times with different matching strategies
    let stageId = getStageIdByName(targetStageName);
    
    // If not found, try with the stage name from the stages array
    if (!stageId) {
      const stageFromStages = stages.find(s => s.name.toLowerCase() === targetStageLower);
      if (stageFromStages && typeof stageFromStages.id === 'number') {
        stageId = stageFromStages.id;
      }
    }
    
    if (!stageId) {
      console.error(`Could not find stage ID for stage: ${targetStageName}`, {
        targetStageName,
        stagesFromDb: stagesFromDb?.map(s => ({ id: s.id, name: s.name })),
        stages: stages.map(s => ({ id: s.id, name: s.name }))
      });
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

  // Handle horizontal scroll drag start
  const handleScrollMouseDown = (e: React.MouseEvent) => {
    // Only enable scroll dragging if we're not dragging an item
    if (draggedItem) return;
    
    // Don't start scroll drag if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button, a, [draggable="true"]')) return;
    
    setIsScrolling(true);
    if (scrollContainerRef.current) {
      scrollStartXRef.current = e.pageX - scrollContainerRef.current.offsetLeft;
      scrollLeftRef.current = scrollContainerRef.current.scrollLeft;
    }
    e.preventDefault();
  };

  // Add global mouse event listeners for scroll dragging
  useEffect(() => {
    if (!isScrolling) {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      return;
    }

    // Handle horizontal scroll drag move
    const handleScrollMouseMove = (e: MouseEvent) => {
      if (!scrollContainerRef.current) return;
      e.preventDefault();
      const x = e.pageX - scrollContainerRef.current.offsetLeft;
      const walk = (x - scrollStartXRef.current) * 2; // Scroll speed multiplier
      scrollContainerRef.current.scrollLeft = scrollLeftRef.current - walk;
    };

    // Handle horizontal scroll drag end
    const handleScrollMouseUp = () => {
      setIsScrolling(false);
    };

    document.addEventListener('mousemove', handleScrollMouseMove);
    document.addEventListener('mouseup', handleScrollMouseUp);
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleScrollMouseMove);
      document.removeEventListener('mouseup', handleScrollMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isScrolling]);

  // Handle horizontal scroll mouse leave
  const handleScrollMouseLeave = () => {
    setIsScrolling(false);
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
    <div className="w-full h-full flex flex-col">
      <div 
        ref={scrollContainerRef}
        className={`flex-1 min-h-0 overflow-x-auto overflow-y-hidden ${isScrolling ? 'cursor-grabbing' : 'cursor-grab'} select-none`}
        style={{ scrollbarWidth: 'thin' }}
        onMouseDown={handleScrollMouseDown}
        onMouseLeave={handleScrollMouseLeave}
      >
        <div className="flex gap-2 h-full w-full">
          {stages.map((stage) => {
            const stageItems = itemsByStage[stage.name] || [];
            const stats = getStageStats(stage.name);
            const isDragOver = dragOverStage === stage.name;
            return (
              <div
                key={stage.name}
                className={`h-full max-h-full flex-1 min-w-[300px] ${stage.bgColor} rounded-lg border-2 ${isDragOver ? 'border-blue-500 border-dashed' : stage.borderColor} flex flex-col transition-all relative`}
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
                <div className={`px-4 py-2 border-b-2 ${stage.borderColor} ${stage.bgColor} dark:border-gray-700`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded-full "
                        style={{ backgroundColor: stage.color }}
                      ></div>
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">{stage.name}</h3>
                    </div>
                    <Badge color={getStageColor(stage.name)}>
                      {stats.count}
                    </Badge>
                  </div>
                  {stats.value !== undefined && formatCurrency && (
                    <div className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                      {formatCurrency(stats.value)}
                    </div>
                  )}
                </div>

                {/* Item Cards */}
                <div className="flex-1 p-1 space-y-1 overflow-y-auto min-h-0 kanban-scrollbar">
                  {stageItems.length === 0 ? (
                    <div className={`text-center py-8 text-gray-400 dark:text-gray-500 text-sm ${isDragOver ? 'border-2 border-dashed border-blue-400 dark:border-blue-500 rounded-lg' : ''}`}>
                      {isDragOver ? `Drop ${itemType} here` : emptyStateText}
                    </div>
                  ) : (
                    stageItems.map((item) => (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item)}
                        onDragEnd={handleDragEnd}
                        className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2 shadow-sm hover:shadow-md transition-all cursor-move ${
                          draggedItem?.id === item.id ? 'opacity-50' : ''
                        }`}
                      >
                        {renderCard(item, stage, (clickedItem) => {
                          // For both deals and tasks, navigate to detail page
                          onItemClick(clickedItem.id);
                        })}
                      </div>
                    ))
                  )}
                </div>

                {/* Create Item Button - Hidden by default, slides up on hover */}
                {onCreateItem && (
                  <div 
                    className={`border-t-2 border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out overflow-hidden ${
                      hoveredStage === stage.name 
                        ? 'opacity-100 translate-y-0 max-h-32' 
                        : 'opacity-0 translate-y-4 max-h-0 pointer-events-none'
                    }`}
                    onDragOver={(e) => handleDragOver(e, stage.name)}
                    onDrop={(e) => handleDrop(e, stage.name)}
                  >
                    <div className="p-3">
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
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Deal-specific modals - only render if itemType is 'deal' */}
      {itemType === 'deal' && (
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
      )}

      {/* Task-specific modals - only render if itemType is 'task' */}
      {itemType === 'task' && (
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
      )}
    </div>
  );
}
