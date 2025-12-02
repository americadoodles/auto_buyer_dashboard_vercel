'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '../../../../components/atoms/Button';
import { Input } from '../../../../components/atoms/Input';
import { Icon } from '../../../../components/atoms/Icon';
import { Badge } from '../../../../components/atoms/Badge';
import { tasksApi } from '../../../../lib/services/tasksApi';
import { dealsApi } from '../../../../lib/services/dealsApi';
import { leadsApi } from '../../../../lib/services/leadsApi';
import { getListingDetails } from '../../../../lib/services/listingManagementApi';
import { useAuth } from '../../../auth/useAuth';
import { useTaskStatuses, useTaskPriorities } from '../../../../lib/hooks/useTasks';
import { ApiService, apiCall } from '../../../../lib/services/api';
import { Listing } from '../../../../lib/types/listing';
import { VehicleContactCard } from '../../../../components/molecules/VehicleContactCard';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '../../../../hooks/useToast';

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

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.taskId as string;
  const { user } = useAuth();
  const { showSuccess, showError, showWarning } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  
  // Task fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priorityId, setPriorityId] = useState<number | undefined>(undefined);
  const [statusId, setStatusId] = useState<number | undefined>(undefined);
  const [dueDate, setDueDate] = useState('');
  const [relatedDealId, setRelatedDealId] = useState<string | undefined>(undefined);
  
  // Related data
  const { statuses, loading: statusesLoading } = useTaskStatuses();
  const { priorities, loading: prioritiesLoading } = useTaskPriorities();
  const [deals, setDeals] = useState<any[]>([]);
  const [deal, setDeal] = useState<any | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [taskContact, setTaskContact] = useState<any | null>(null);

  // Load task details
  useEffect(() => {
    if (!taskId || statusesLoading || prioritiesLoading) return;
    
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Get full task data
        const taskData = await tasksApi.getTask(taskId);
        if (!taskData) {
          setError('Task not found');
          setLoading(false);
          return;
        }
        
        // Find priority and status objects from loaded data
        const foundPriority = priorities.find(p => p.id === taskData.priority_id);
        const foundStatus = statuses.find(s => s.id === taskData.status_id);
        
        // Transform task data to match Task interface
        const transformedTask: Task = {
          id: taskData.id,
          title: taskData.title || '',
          description: taskData.description,
          assigned_to: taskData.assigned_to_user ? {
            id: taskData.assigned_to || '',
            username: taskData.assigned_to_user
          } : undefined,
          priority: foundPriority ? {
            id: foundPriority.id,
            name: foundPriority.name,
            color: foundPriority.color_code
          } : undefined,
          status: foundStatus ? {
            id: foundStatus.id,
            name: foundStatus.name,
            color: foundStatus.color_code
          } : undefined,
          due_date: taskData.due_date,
          completed_at: taskData.completed_at,
          related_lead: taskData.related_lead_id ? {
            id: taskData.related_lead_id,
            first_name: 'Lead',
            last_name: 'Name'
          } : null,
          related_contact: taskData.related_contact_id ? {
            id: taskData.related_contact_id,
            first_name: 'Contact',
            last_name: 'Name'
          } : null,
          related_deal: taskData.related_deal_id ? {
            id: taskData.related_deal_id,
            name: taskData.related_deal_name || 'Deal'
          } : null,
          created_at: taskData.created_at,
          updated_at: taskData.updated_at
        };
        
        setTask(transformedTask);
        
        // Initialize form fields
        setTitle(transformedTask.title || '');
        setDescription(transformedTask.description || '');
        setDueDate(formatDateForInput(transformedTask.due_date));
        setPriorityId(taskData.priority_id);
        setStatusId(taskData.status_id);
        setRelatedDealId(taskData.related_deal_id);
        
        const dealId = taskData.related_deal_id || (transformedTask.related_deal ? transformedTask.related_deal.id : null);
        const [dealsData, dealData] = await Promise.all([
          dealsApi.getDeals({ limit: 1000 }).catch(() => []),
          dealId ? dealsApi.getDeal(dealId).catch(() => null) : Promise.resolve(null)
        ]);
        setDeals(dealsData);
        setDeal(dealData);
        
        // Load contact from task's contact_id if available
        const contactId = taskData.contact_id || taskData.related_contact_id;
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
        showError('Failed to load task', e?.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [taskId, priorities, statuses, statusesLoading, prioritiesLoading]);

  const handleSave = async () => {
    if (!taskId) return;
    
    setSaving(true);
    setError(null);
    
    try {
      await tasksApi.updateTask(taskId, {
        title: title.trim(),
        description: description.trim() || undefined,
        priority_id: priorityId || undefined,
        status_id: statusId,
        due_date: dueDate || undefined,
        related_deal_id: relatedDealId || undefined,
      });

      showSuccess('Task Updated', 'Task has been successfully updated');
      
      // Reload task data
      const taskData = await tasksApi.getTask(taskId);
      if (taskData) {
        const transformedTask: Task = {
          id: taskData.id,
          title: taskData.title || '',
          description: taskData.description,
          assigned_to: (taskData as any).assigned_to && typeof (taskData as any).assigned_to === 'object' 
            ? (taskData as any).assigned_to 
            : undefined,
          priority: (taskData as any).priority && typeof (taskData as any).priority === 'object'
            ? (taskData as any).priority
            : undefined,
          status: (taskData as any).status && typeof (taskData as any).status === 'object'
            ? (taskData as any).status
            : undefined,
          due_date: taskData.due_date,
          completed_at: taskData.completed_at,
          related_lead: (taskData as any).related_lead || null,
          related_contact: (taskData as any).related_contact || null,
          related_deal: (taskData as any).related_deal || null,
          created_at: taskData.created_at,
          updated_at: taskData.updated_at
        };
        setTask(transformedTask);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to update task');
      showError('Failed to update task', e?.message || 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!taskId) return;
    
    setDeleting(true);
    setError(null);
    
    try {
      await tasksApi.deleteTask(taskId);
      showSuccess('Task Deleted', 'Task has been successfully deleted');
      router.push('/crm/tasks');
    } catch (e: any) {
      setError(e?.message || 'Failed to delete task');
      showError('Failed to delete task', e?.message || 'An error occurred');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleComplete = async () => {
    if (!taskId) return;
    
    setSaving(true);
    setError(null);
    
    try {
      await tasksApi.completeTask(taskId);
      showSuccess('Task Completed', 'Task has been marked as completed');
      
      // Reload task data
      const taskData = await tasksApi.getTask(taskId);
      if (taskData) {
        // Find priority and status objects from loaded data
        const foundPriority = priorities.find(p => p.id === taskData.priority_id);
        const foundStatus = statuses.find(s => s.id === taskData.status_id);
        
        const transformedTask: Task = {
          id: taskData.id,
          title: taskData.title || '',
          description: taskData.description,
          assigned_to: taskData.assigned_to_user ? {
            id: taskData.assigned_to || '',
            username: taskData.assigned_to_user
          } : undefined,
          priority: foundPriority ? {
            id: foundPriority.id,
            name: foundPriority.name,
            color: foundPriority.color_code
          } : undefined,
          status: foundStatus ? {
            id: foundStatus.id,
            name: foundStatus.name,
            color: foundStatus.color_code
          } : undefined,
          due_date: taskData.due_date,
          completed_at: taskData.completed_at,
          related_lead: taskData.related_lead_id ? {
            id: taskData.related_lead_id,
            first_name: 'Lead',
            last_name: 'Name'
          } : null,
          related_contact: taskData.related_contact_id ? {
            id: taskData.related_contact_id,
            first_name: 'Contact',
            last_name: 'Name'
          } : null,
          related_deal: taskData.related_deal_id ? {
            id: taskData.related_deal_id,
            name: taskData.related_deal_name || 'Deal'
          } : null,
          created_at: taskData.created_at,
          updated_at: taskData.updated_at
        };
        setTask(transformedTask);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to complete task');
      showError('Failed to complete task', e?.message || 'An error occurred');
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

  if (loading || statusesLoading || prioritiesLoading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-6 flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading task details...</span>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-6">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Task Not Found</h2>
            <p className="text-gray-600 mb-4">{error || 'The task you are looking for does not exist.'}</p>
            <Button onClick={() => router.push('/crm/tasks')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Tasks
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isCompleted = task.completed_at !== null && task.completed_at !== undefined;

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-gray-200 pb-6 flex-shrink-0">
        {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/crm/tasks')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Task Details</h1>
                <p className="text-gray-600 mt-2">View and manage task information</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {!showDeleteConfirm ? (
                <>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={saving || deleting}
                    className="text-red-600 border-red-300 hover:bg-red-50 flex items-center"
                  >
                    <Icon name="trash-2" className="w-4 h-4 mr-2" />
                    <span>Delete Task</span>
                  </Button>
                  {!isCompleted && (
                    <Button 
                      variant="outline" 
                      onClick={handleComplete}
                      disabled={saving || deleting}
                      className="text-green-600 border-green-300 hover:bg-green-50 flex items-center"
                    >
                      <Icon name="check" className="w-4 h-4 mr-2" />
                      <span>Complete Task</span>
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
          </div>
        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md mt-4">{error}</div>
        )}
      </div>

      {/* Main Content Layout */}
      <div className="flex-1 flex gap-6 overflow-hidden px-6 pb-6">
        {/* Left Content - Scrollable */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-4">
            {/* Status and Priority Badges */}
            <div className="flex items-center space-x-4">
              {task.status && (
                <Badge color="blue">
                  Status: {task.status.name}
                </Badge>
              )}
              {task.priority && (
                <Badge color="orange">
                  Priority: {task.priority.name}
                </Badge>
              )}
              {isCompleted && (
                <Badge color="green">
                  Completed
                </Badge>
              )}
            </div>

            {/* Edit Fields Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
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
                <option value="">No priority</option>
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
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-2">
                <h4 className="text-md font-semibold text-gray-900 border-b pb-2">Related Deal</h4>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/crm/deals/${relatedDealId}`)}
                  >
                    <Icon name="briefcase" className="w-4 h-4 mr-2" />
                    View Deal
                  </Button>
                </div>
              </div>
            )}

            {/* Task Metadata */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-2">
          <h4 className="text-md font-semibold text-gray-900 border-b pb-2">Task Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Created:</span>
              <span className="ml-2 text-gray-600">{formatDate(task.created_at)}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Last Updated:</span>
              <span className="ml-2 text-gray-600">{formatDate(task.updated_at)}</span>
            </div>
            {task.completed_at && (
              <div>
                <span className="font-medium text-gray-700">Completed:</span>
                <span className="ml-2 text-gray-600">{formatDate(task.completed_at)}</span>
              </div>
            )}
          </div>
        </div>

            {/* Footer Actions */}
            <div className="flex justify-end space-x-2 pb-6">
              <Button variant="outline" onClick={() => router.push('/crm/tasks')} disabled={saving || deleting}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!title.trim() || saving || deleting} className="bg-blue-400 hover:bg-blue-500 text-white">
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>

          {/* Right Sidebar - Vehicle and Contact Information - Fixed Height */}
          <div className="w-[400px] flex-shrink-0 flex flex-col">
            <div className="bg-white shadow-sm border border-gray-200 p-6 h-full overflow-y-auto">
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
            </div>
          </div>
        </div>
    </div>
  );
}

