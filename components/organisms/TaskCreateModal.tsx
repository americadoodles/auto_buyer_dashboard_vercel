'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Icon } from '../atoms/Icon';
import { tasksApi } from '../../lib/services/tasksApi';
import { User } from '../../lib/types/user';
import { useAuth } from '../../app/auth/useAuth';
import { useTaskStatuses, useTaskPriorities } from '../../lib/hooks/useTasks';
import { useDeals } from '../../lib/hooks/useDeals';
import { ApiService } from '../../lib/services/api';

interface TaskCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
  statusId?: number;
  statusName?: string;
}

export const TaskCreateModal: React.FC<TaskCreateModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  statusId,
  statusName
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ownerUserId, setOwnerUserId] = useState<string | undefined>(user?.id);
  const [priorityId, setPriorityId] = useState<number | undefined>(undefined);
  const [selectedStatusId, setSelectedStatusId] = useState<number | undefined>(statusId);
  const [dueDate, setDueDate] = useState('');
  const [relatedDealId, setRelatedDealId] = useState<string | undefined>(undefined);
  const [selectedDeal, setSelectedDeal] = useState<{ id: string; name: string; description?: string; contact?: { first_name?: string; last_name?: string; email?: string; phone?: string } } | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  
  // Use hooks for statuses, priorities, and deals
  const { statuses, loading: statusesLoading } = useTaskStatuses();
  const { priorities, loading: prioritiesLoading } = useTaskPriorities();
  const { deals, loading: dealsLoading } = useDeals({ limit: 1000 });

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    
    const loadData = async () => {
      try {
        const usersData = await ApiService.getUsers().catch(() => []);
        setUsers(usersData);
      } catch (e) {
        console.error('Error loading data:', e);
      }
    };
    loadData();
  }, [isOpen]);

  // Update selected status when statusId prop changes
  useEffect(() => {
    if (statusId !== undefined) {
      setSelectedStatusId(statusId);
    }
  }, [statusId]);

  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setDescription('');
      setOwnerUserId(user?.id);
      setPriorityId(undefined);
      setSelectedStatusId(statusId);
      // Calculate default date (7 days from now) when modal opens
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 7);
      const defaultDateString = defaultDate.toISOString().split('T')[0];
      setDueDate(defaultDateString);
      setRelatedDealId(undefined);
      setError(null);
      setLoading(false);
    }
  }, [isOpen, statusId, user]);

  // Update selectedDeal when relatedDealId changes
  useEffect(() => {
    if (relatedDealId) {
      const deal = deals.find(d => d.id === relatedDealId);
      if (deal) {
        setSelectedDeal({
          id: deal.id,
          name: deal.title || '',
          description: deal.description,
          contact: deal.contact ? {
            first_name: deal.contact.first_name,
            last_name: deal.contact.last_name,
            email: deal.contact.email,
            phone: deal.contact.phone
          } : undefined
        });
      } else {
        setSelectedDeal(undefined);
      }
    } else {
      setSelectedDeal(undefined);
    }
  }, [relatedDealId, deals]);

  const handleAIDraft = async () => {
    if (!relatedDealId || !selectedDeal) {
      setError('Please select a related deal first');
      return;
    }

    setAiLoading(true);
    setError(null);
    try {
      const draft = await tasksApi.generateAIDraft({
        deal_id: relatedDealId,
        contact_id: selectedDeal.contact ? undefined : undefined, // We'll pass contact info separately
        contact_info: selectedDeal.contact ? {
          first_name: selectedDeal.contact.first_name,
          last_name: selectedDeal.contact.last_name,
          email: selectedDeal.contact.email,
          phone: selectedDeal.contact.phone
        } : undefined,
        additional_context: selectedDeal.description || undefined,
      });

      // Populate fields with AI suggestions
      setTitle(draft.title);
      setDescription(draft.description);
    } catch (e: any) {
      setError(e?.message || 'Failed to generate AI draft');
    } finally {
      setAiLoading(false);
    }
  };

  const canSubmit = title.trim().length > 0 && selectedStatusId !== undefined && !loading;

  const handleCreate = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      
      // Check if the selected status is "Completed"
      const selectedStatus = statuses.find(s => s.id === selectedStatusId);
      const isCompleted = selectedStatus?.name?.toLowerCase() === 'completed';
      
      const newTask = await tasksApi.createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        owner_user_id: ownerUserId || undefined,
        priority_id: priorityId !== undefined ? priorityId : undefined,
        status_id: selectedStatusId,
        due_date: dueDate || undefined,
        related_deal_id: relatedDealId || undefined,
        // Set completed_at if creating in Completed status
        completed_at: isCompleted ? new Date().toISOString() : undefined,
      });
      
      // Close modal first
      onClose();
      
      // Then trigger refresh callback to update the board
      // Use setTimeout to ensure modal closes before refresh
      setTimeout(() => {
        if (onCreated) {
          onCreated();
        }
      }, 100);
    } catch (e: any) {
      setError(e?.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Calculate default date (7 days from now)
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 7);
  const defaultDateString = defaultDate.toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
          <h3 className="text-lg font-semibold">Create New Task{statusName ? ` - ${statusName}` : ''}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <Icon name="x" className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Related Deal</label>
            <select
              className="w-full border rounded-md h-10 px-3"
              value={relatedDealId || ''}
              onChange={(e) => setRelatedDealId(e.target.value || undefined)}
            >
              <option value="">No deal selected</option>
              {deals.map((deal) => (
                <option key={deal.id} value={deal.id}>
                  {deal.title || `Deal ${deal.id}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Task Title <span className="text-red-500">*</span>
              </label>
              <Button
                type="button"
                variant="outline"
                onClick={handleAIDraft}
                disabled={aiLoading || loading || !relatedDealId}
                className="text-xs px-3 py-1 h-7"
              >
                {aiLoading ? (
                  <>
                    <Icon name="loader" className="w-3 h-3 mr-1 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Icon name="sparkles" className="w-3 h-3 mr-1" />
                    Draft with AI
                  </>
                )}
              </Button>
            </div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={selectedDeal ? `Task for ${selectedDeal.name}` : "e.g., Follow up with client"}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="w-full border rounded-md px-3 py-2"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the task..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full border rounded-md h-10 px-3"
                value={selectedStatusId || ''}
                onChange={(e) => setSelectedStatusId(e.target.value ? Number(e.target.value) : undefined)}
                required
                disabled={statusesLoading}
              >
                {statuses.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                className="w-full border rounded-md h-10 px-3"
                value={priorityId ?? ''}
                onChange={(e) => setPriorityId(e.target.value ? Number(e.target.value) : undefined)}
                disabled={prioritiesLoading}
              >
                <option value="">Select Priority</option>
                {[...priorities]
                  .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                  .map((priority) => (
                    <option key={priority.id} value={priority.id}>
                      {priority.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

        </div>

        <div className="px-6 py-4 border-t flex justify-end space-x-2 sticky bottom-0 bg-white">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!canSubmit}>
            {loading ? 'Creating...' : 'Create Task'}
          </Button>
        </div>
      </div>
    </div>
  );
};

