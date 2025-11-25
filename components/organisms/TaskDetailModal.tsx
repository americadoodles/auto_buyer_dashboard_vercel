'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Icon } from '../atoms/Icon';
import { Badge } from '../atoms/Badge';
import { tasksApi } from '../../lib/services/tasksApi';
import { dealsApi } from '../../lib/services/dealsApi';
import { leadsApi } from '../../lib/services/leadsApi';
import { getListingDetails } from '../../lib/services/listingManagementApi';
import { User } from '../../lib/types/user';
import { useAuth } from '../../app/auth/useAuth';
import { useRouter } from 'next/navigation';
import { useTaskStatuses, useTaskPriorities } from '../../lib/hooks/useTasks';
import { ApiService, apiCall } from '../../lib/services/api';
import { Listing } from '../../lib/types/listing';
import { VehicleContactCard } from '../molecules/VehicleContactCard';

interface Task {
  id: string;
  title: string;
  description?: string;
  assigned_to?: {
    id: string;
    username: string;
  };
  priority?: {
    id: number;
    name: string;
    color: string;
  };
  status?: {
    id: number;
    name: string;
    color: string;
  };
  due_date?: string;
  completed_at?: string | null;
  related_lead?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  related_contact?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  related_deal?: {
    id: string;
    name: string;
  } | null;
  created_at: string;
  updated_at: string;
}

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onTaskUpdated?: () => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  isOpen,
  onClose,
  task: initialTask,
  onTaskUpdated
}) => {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Task fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedToId, setAssignedToId] = useState<string | undefined>(undefined);
  const [priorityId, setPriorityId] = useState<number | undefined>(undefined);
  const [statusId, setStatusId] = useState<number | undefined>(undefined);
  const [dueDate, setDueDate] = useState('');
  const [relatedDealId, setRelatedDealId] = useState<string | undefined>(undefined);
  
  // Related data
  const { statuses, loading: statusesLoading } = useTaskStatuses();
  const { priorities, loading: prioritiesLoading } = useTaskPriorities();
  const [deals, setDeals] = useState<any[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [deal, setDeal] = useState<any | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [taskContact, setTaskContact] = useState<any | null>(null);

  // Reset states when modal closes
  useEffect(() => {
    if (!isOpen) {
      setDeleting(false);
      setShowDeleteConfirm(false);
      setSaving(false);
      setError(null);
      setDeal(null);
      setListing(null);
      setTaskContact(null);
    }
  }, [isOpen]);

  // Load task details
  useEffect(() => {
    if (!isOpen || !initialTask) return;
    
    // Reset all states when opening a new task
    setDeleting(false);
    setShowDeleteConfirm(false);
    setSaving(false);
    setError(null);
    setDeal(null);
    setListing(null);
    setTaskContact(null);
    
    // Initialize form fields from the task prop
    setTitle(initialTask.title || '');
    setDescription(initialTask.description || '');
    setDueDate(formatDateForInput(initialTask.due_date));
    setPriorityId(initialTask.priority?.id);
    setStatusId(initialTask.status?.id);
    setAssignedToId(initialTask.assigned_to?.id);
    setRelatedDealId(initialTask.related_deal?.id);

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Get full task data to access contact_id and related_deal_id
        const taskData = await tasksApi.getTask(initialTask.id).catch(() => null);
        
        const dealId = taskData?.related_deal_id || (initialTask.related_deal ? initialTask.related_deal.id : null);
        const [dealsData, usersData, dealData] = await Promise.all([
          dealsApi.getDeals({ limit: 1000 }).catch(() => []),
          ApiService.getUsers().catch(() => []),
          dealId ? dealsApi.getDeal(dealId).catch(() => null) : Promise.resolve(null)
        ]);
        setDeals(dealsData);
        setUsers(usersData);
        setDeal(dealData);
        
        // Load contact from task's contact_id if available
        const contactId = taskData?.contact_id || taskData?.related_contact_id;
        if (contactId) {
          try {
            const contactData = await apiCall<any>(`/crm/contacts/${contactId}`);
            setTaskContact(contactData);
          } catch (e) {
            console.error('Failed to load task contact:', e);
          }
        }
        
        // If deal has a lead_id, fetch the lead and then the listing
        if (dealData?.lead_id) {
          try {
            const leadData = await leadsApi.getLead(dealData.lead_id);
            if (leadData?.listing_id) {
              try {
                const listingData = await getListingDetails(leadData.listing_id);
                setListing(listingData);
              } catch (e) {
                console.error('Failed to load listing:', e);
              }
            }
          } catch (e) {
            console.error('Failed to load lead:', e);
          }
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load task details');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen, initialTask]);

  const handleSave = async () => {
    if (!initialTask) return;
    
    setSaving(true);
    setError(null);
    
    try {
      await tasksApi.updateTask(initialTask.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        assigned_to: assignedToId || undefined,
        priority_id: priorityId || undefined,
        status_id: statusId,
        due_date: dueDate || undefined,
        related_deal_id: relatedDealId || undefined,
      });

      if (onTaskUpdated) {
        onTaskUpdated();
      }
      
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to update task');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!initialTask) return;
    
    setDeleting(true);
    setError(null);
    
    try {
      await tasksApi.deleteTask(initialTask.id);

      // Reset states before closing
      setDeleting(false);
      setShowDeleteConfirm(false);

      if (onTaskUpdated) {
        onTaskUpdated();
      }
      
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to delete task');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleComplete = async () => {
    if (!initialTask) return;
    
    setSaving(true);
    setError(null);
    
    try {
      await tasksApi.completeTask(initialTask.id);

      if (onTaskUpdated) {
        onTaskUpdated();
      }
      
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to complete task');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Convert ISO datetime string to YYYY-MM-DD format for date input
  const formatDateForInput = (dateString: string | undefined): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) return '';
      // Format as YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (e) {
      return '';
    }
  };

  if (!isOpen || !initialTask) return null;

  const isCompleted = initialTask.completed_at !== null && initialTask.completed_at !== undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
          <h3 className="text-lg font-semibold">Task Details</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <Icon name="x" className="w-5 h-5" />
          </button>
        </div>

        {(loading || statusesLoading || prioritiesLoading) ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">{error}</div>
              )}

              {/* Status and Priority Badges */}
              <div className="flex items-center space-x-4">
                {initialTask.status && (
                  <Badge color="blue">
                    Status: {initialTask.status.name}
                  </Badge>
                )}
                {initialTask.priority && (
                  <Badge color="orange">
                    Priority: {initialTask.priority.name}
                  </Badge>
                )}
                {isCompleted && (
                  <Badge color="green">
                    Completed
                  </Badge>
                )}
              </div>

              {/* Vehicle and Contact Information from Deal's Listing and Task's Contact */}
              <VehicleContactCard
                title="Vehicle & Contact Information"
                vehicle={listing ? {
                  year: listing.year,
                  make: listing.make,
                  model: listing.model,
                  trim: listing.trim,
                  vin: listing.vin
                } : null}
                contact={taskContact ? {
                  first_name: taskContact.first_name,
                  last_name: taskContact.last_name,
                  company: taskContact.company,
                  email: taskContact.email,
                  phone: taskContact.phone,
                  mobile: taskContact.mobile
                } : null}
              />

              {/* Deal Information Section - Vehicle and Contact */}
              <VehicleContactCard
                title="Deal Information"
                vehicle={deal?.vehicle_requirements || null}
                contact={deal?.contact || null}
              />

              {/* Edit Fields Section */}
              <div className="space-y-4">
                <h4 className="text-md font-semibold text-gray-900 border-b pb-2">Edit Fields</h4>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Task title"
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
                    placeholder="Task description"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                    <select
                      className="w-full border rounded-md h-10 px-3"
                      value={assignedToId || ''}
                      onChange={(e) => setAssignedToId(e.target.value || undefined)}
                    >
                      <option value="">Unassigned</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.username}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      className="w-full border rounded-md h-10 px-3"
                      value={priorityId !== undefined ? String(priorityId) : ''}
                      onChange={(e) => setPriorityId(e.target.value ? Number(e.target.value) : undefined)}
                      disabled={prioritiesLoading}
                    >
                      <option value="">Select priority</option>
                      {priorities.map((priority) => (
                        <option key={priority.id} value={String(priority.id)}>
                          {priority.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      className="w-full border rounded-md h-10 px-3"
                      value={statusId !== undefined ? String(statusId) : ''}
                      onChange={(e) => setStatusId(e.target.value ? Number(e.target.value) : undefined)}
                      disabled={statusesLoading}
                    >
                      <option value="">Select status</option>
                      {statuses.map((status) => (
                        <option key={status.id} value={String(status.id)}>
                          {status.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

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
                        {deal.name || deal.title || `Deal ${deal.id}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Related Deal Section */}
              {relatedDealId && (
                <div className="space-y-2">
                  <h4 className="text-md font-semibold text-gray-900 border-b pb-2">Related Deal</h4>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/admin/crm/deals`)}
                    >
                      <Icon name="briefcase" className="w-4 h-4 mr-2" />
                      View Deal
                    </Button>
                  </div>
                </div>
              )}

              {/* Task Metadata */}
              <div className="space-y-2">
                <h4 className="text-md font-semibold text-gray-900 border-b pb-2">Task Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Created:</span>
                    <span className="ml-2 text-gray-600">{formatDate(initialTask.created_at)}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Last Updated:</span>
                    <span className="ml-2 text-gray-600">{formatDate(initialTask.updated_at)}</span>
                  </div>
                  {initialTask.completed_at && (
                    <div>
                      <span className="font-medium text-gray-700">Completed:</span>
                      <span className="ml-2 text-gray-600">{formatDate(initialTask.completed_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-between items-center sticky bottom-0 bg-white">
          <div className="flex items-center space-x-2">
            {!showDeleteConfirm ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={saving || deleting || loading}
                  className="text-red-600 border-red-300 hover:bg-red-50 flex items-center"
                >
                  <Icon name="trash-2" className="w-4 h-4 mr-2" />
                  <span>
                    Delete Task
                  </span>
                </Button>
                {!isCompleted && (
                  <Button 
                    variant="outline" 
                    onClick={handleComplete}
                    disabled={saving || deleting || loading}
                    className="text-green-600 border-green-300 hover:bg-green-50 flex items-center"
                  >
                    <Icon name="check" className="w-4 h-4 mr-2" />
                    <span>
                      Complete Task
                    </span>
                  </Button>
                )}
              </>
            ) : (
              <>
                <span className="text-sm text-gray-700">Are you sure?</span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-red-400 hover:bg-red-500 text-white"
                >
                  {deleting ? 'Deleting...' : 'Confirm Delete'}
                </Button>
              </>
            )}
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose} disabled={saving || deleting || loading}>
              Close
            </Button>
            <Button onClick={handleSave} disabled={!title.trim() || saving || deleting || loading}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

