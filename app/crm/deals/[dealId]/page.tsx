'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '../../../../components/atoms/Button';
import { Input } from '../../../../components/atoms/Input';
import { Icon } from '../../../../components/atoms/Icon';
import { Badge } from '../../../../components/atoms/Badge';
import { dealsApi } from '../../../../lib/services/dealsApi';
import { leadsApi } from '../../../../lib/services/leadsApi';
import { Lead } from '../../../../lib/types/lead';
import { Deal, DealActivity } from '../../../../lib/types/deal';
import { useAuth } from '../../../auth/useAuth';
import { useDealStages, useDealCategories } from '../../../../lib/hooks/useDeals';
import { useTasks, useTaskPriorities, useTaskStatuses } from '../../../../lib/hooks/useTasks';
import { VehicleContactCard } from '../../../../components/molecules/VehicleContactCard';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '../../../../hooks/useToast';

interface DealDetailPageProps {
  // No props needed - we get dealId from URL params
}

export default function DealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dealId = params.dealId as string;
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deal, setDeal] = useState<Deal | null>(null);
  
  // Deal fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [expectedCloseDate, setExpectedCloseDate] = useState(''); 
  const [probability, setProbability] = useState('0');
  const [dealStageId, setDealStageId] = useState<number | undefined>(undefined);
  const [dealCategoryId, setDealCategoryId] = useState<number | undefined>(undefined);
  const [dealValue, setDealValue] = useState('');
  const [contactId, setContactId] = useState<string | undefined>(undefined);
  
  // Related data
  const { stages, loading: stagesLoading } = useDealStages();
  const { categories, loading: categoriesLoading } = useDealCategories();
  const { priorities, loading: prioritiesLoading } = useTaskPriorities();
  const { statuses, loading: statusesLoading } = useTaskStatuses();
  const [activities, setActivities] = useState<DealActivity[]>([]);
  const [leadId, setLeadId] = useState<string | undefined>(undefined);
  const [lead, setLead] = useState<Lead | null>(null);
  
  // Use useTasks hook to get related tasks
  const { tasks: relatedTasksRaw, loading: loadingTasks } = useTasks({
    related_deal_id: dealId,
    limit: 100
  });
  
  // Transform tasks to include priority and status objects, and filter by related_deal_id
  const relatedTasks = useMemo(() => {
    return relatedTasksRaw
      .filter(task => task.related_deal_id === dealId)
      .map(task => {
        const foundPriority = priorities.find(p => p.id === task.priority_id);
        const foundStatus = statuses.find(s => s.id === task.status_id);
        
        return {
          ...task,
          priority: foundPriority ? {
            id: foundPriority.id,
            name: foundPriority.name,
            color: foundPriority.color_code
          } : undefined,
          status: foundStatus ? {
            id: foundStatus.id,
            name: foundStatus.name,
            color: foundStatus.color_code
          } : undefined
        };
      });
  }, [relatedTasksRaw, priorities, statuses, dealId]);

  // Load deal details
  useEffect(() => {
    if (!dealId || stagesLoading || categoriesLoading) return;
    
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Get full deal data
        const dealData = await dealsApi.getDeal(dealId);
        if (!dealData) {
          setError('Deal not found');
          setLoading(false);
          return;
        }
        
        // Transform deal data to match Deal interface
        const transformedDeal: Deal = {
          id: dealData.id,
          name: dealData.title || '',
          description: dealData.description || '',
          contact: dealData.contact ? (typeof dealData.contact === 'object' ? dealData.contact : undefined) : undefined,
          lead_id: dealData.lead_id,
          deal_value: dealData.deal_value || 0,
          probability: dealData.probability || 0,
          expected_close_date: dealData.expected_close_date || '',
          deal_stage: dealData.deal_stage_id ? {
            id: dealData.deal_stage_id,
            name: 'Unknown',
            color: 'gray'
          } : undefined,
          deal_category: dealData.deal_category_id ? {
            id: dealData.deal_category_id,
            name: 'Unknown'
          } : undefined,
          assigned_to: dealData.assigned_to ? (typeof dealData.assigned_to === 'object' ? dealData.assigned_to : undefined) : undefined,
          is_won: dealData.is_won || false,
          is_lost: dealData.is_lost || false,
          created_at: dealData.created_at,
          updated_at: dealData.updated_at
        };
        
        // Find stage and category objects from loaded data
        if (dealData.deal_stage_id) {
          const foundStage = stages.find(s => s.id === dealData.deal_stage_id);
          if (foundStage) {
            transformedDeal.deal_stage = {
              id: foundStage.id,
              name: foundStage.name,
              color: foundStage.color_code
            };
          }
        }
        
        if (dealData.deal_category_id) {
          const foundCategory = categories.find(c => c.id === dealData.deal_category_id);
          if (foundCategory) {
            transformedDeal.deal_category = {
              id: foundCategory.id,
              name: foundCategory.name
            };
          }
        }
        
        setDeal(transformedDeal);
        
        // Initialize form fields
        setTitle(transformedDeal.name || '');
        setDescription(transformedDeal.description || '');
        setExpectedCloseDate(formatDateForInput(transformedDeal.expected_close_date));
        setProbability(transformedDeal.probability?.toString() || '0');
        setDealStageId(transformedDeal.deal_stage?.id);
        setDealCategoryId(transformedDeal.deal_category?.id);
        setDealValue(transformedDeal.deal_value?.toString() || '');
        setContactId(transformedDeal.contact?.id);
        setLeadId(transformedDeal.lead_id);
        
        // Load related data
        const [dealActivities, leadData] = await Promise.all([
          dealsApi.getDealActivities(dealId).catch(() => []),
          transformedDeal.lead_id ? leadsApi.getLead(transformedDeal.lead_id).catch(() => null) : Promise.resolve(null)
        ]);
        setActivities(dealActivities);
        setLead(leadData);
      } catch (e: any) {
        setError(e?.message || 'Failed to load deal details');
        showError('Failed to load deal', e?.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [dealId, stages, categories, stagesLoading, categoriesLoading]);

  const handleSave = async () => {
    if (!dealId) return;
    
    setSaving(true);
    setError(null);
    
    try {
      await dealsApi.updateDeal(dealId, {
        title: title.trim(),
        description: description.trim() || undefined,
        expected_close_date: expectedCloseDate || undefined,
        probability: probability ? parseInt(probability) : 0,
        deal_stage_id: dealStageId,
        deal_category_id: dealCategoryId,
        deal_value: dealValue ? parseFloat(dealValue) : undefined,
        contact_id: contactId || undefined
      });

      showSuccess('Deal Updated', 'Deal has been successfully updated');
      
      // Reload deal data
      const dealData = await dealsApi.getDeal(dealId);
      if (dealData) {
        const transformedDeal: Deal = {
          id: dealData.id,
          name: dealData.title || '',
          description: dealData.description || '',
          contact: dealData.contact ? (typeof dealData.contact === 'object' ? dealData.contact : undefined) : undefined,
          lead_id: dealData.lead_id,
          deal_value: dealData.deal_value || 0,
          probability: dealData.probability || 0,
          expected_close_date: dealData.expected_close_date || '',
          deal_stage: dealData.deal_stage_id ? {
            id: dealData.deal_stage_id,
            name: 'Unknown',
            color: 'gray'
          } : undefined,
          deal_category: dealData.deal_category_id ? {
            id: dealData.deal_category_id,
            name: 'Unknown'
          } : undefined,
          assigned_to: dealData.assigned_to ? (typeof dealData.assigned_to === 'object' ? dealData.assigned_to : undefined) : undefined,
          is_won: dealData.is_won || false,
          is_lost: dealData.is_lost || false,
          created_at: dealData.created_at,
          updated_at: dealData.updated_at
        };
        
        // Find stage and category objects from loaded data
        if (dealData.deal_stage_id) {
          const foundStage = stages.find(s => s.id === dealData.deal_stage_id);
          if (foundStage) {
            transformedDeal.deal_stage = {
              id: foundStage.id,
              name: foundStage.name,
              color: foundStage.color_code
            };
          }
        }
        
        if (dealData.deal_category_id) {
          const foundCategory = categories.find(c => c.id === dealData.deal_category_id);
          if (foundCategory) {
            transformedDeal.deal_category = {
              id: foundCategory.id,
              name: foundCategory.name
            };
          }
        }
        
        setDeal(transformedDeal);
      }
      
      // Reload activities after update
      const updatedActivities = await dealsApi.getDealActivities(dealId);
      setActivities(updatedActivities);
    } catch (e: any) {
      setError(e?.message || 'Failed to update deal');
      showError('Failed to update deal', e?.message || 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!dealId) return;
    
    setDeleting(true);
    setError(null);
    
    try {
      await dealsApi.deleteDeal(dealId);
      showSuccess('Deal Deleted', 'Deal has been successfully deleted');
      router.push('/crm/deals');
    } catch (e: any) {
      setError(e?.message || 'Failed to delete deal');
      showError('Failed to delete deal', e?.message || 'An error occurred');
      setDeleting(false);
      setShowDeleteConfirm(false);
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

  const getActivityIcon = (activityType: string) => {
    switch (activityType.toLowerCase()) {
      case 'call':
        return 'phone';
      case 'email':
        return 'mail';
      case 'meeting':
        return 'calendar';
      case 'note':
        return 'file-text';
      case 'status_change':
        return 'refresh-cw';
      default:
        return 'circle';
    }
  };

  if (loading || stagesLoading || categoriesLoading || prioritiesLoading || statusesLoading) {
    return (
      <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900">
        <div className="p-6 flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-300">Loading deal details...</span>
        </div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900">
        <div className="p-6">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Deal Not Found</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">{error || 'The deal you are looking for does not exist.'}</p>
            <Button onClick={() => router.push('/crm/deals')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Deals
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 pb-6 flex-shrink-0">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/crm/deals')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
              <Icon name="briefcase" className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Deal: {deal.name}</h1>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {!showDeleteConfirm ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={saving || deleting}
                  className="text-red-600 dark:text-red-400 border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center"
                >
                  <Icon name="trash-2" className="w-4 h-4 mr-2" />
                  <span>Delete Deal</span>
                </Button>
              </>
            ) : (
              <>
                <span className="text-sm text-gray-700 dark:text-gray-300">Are you sure?</span>
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
                  className="bg-red-400 dark:bg-red-600 hover:bg-red-500 dark:hover:bg-red-700 text-white"
                >
                  {deleting ? 'Deleting...' : 'Confirm Delete'}
                </Button>
              </>
            )}
          </div>
        </div>
        {error && (
          <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-md mt-4 border border-red-200 dark:border-red-800">{error}</div>
        )}
      </div>

      {/* Main Content Layout */}
      <div className="flex-1 flex gap-6 overflow-hidden px-6 pb-6 items-stretch">
        {/* Left Content - Scrollable */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-4">
          {/* Status Badges */}
          <div className="mt-4 flex items-center space-x-4">
            {deal.deal_stage && (
              <Badge color="blue">
                Stage: {deal.deal_stage.name}
              </Badge>
            )}
            {deal.deal_category && (
              <Badge color="orange">
                Category: {deal.deal_category.name}
              </Badge>
            )}
            {deal.is_won && (
              <Badge color="green">
                Won
              </Badge>
            )}
            {deal.is_lost && (
              <Badge color="red">
                Lost
              </Badge>
            )}
          </div>

          {/* Edit Fields Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <h4 className="text-md font-semibold text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Edit Fields</h4>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Deal title"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deal description"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Owner (Assigned To)</label>
              <div className="w-full border border-gray-300 dark:border-gray-600 rounded-md h-10 px-3 flex items-center bg-gray-50 dark:bg-gray-700">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {deal.assigned_to?.username || 'Unassigned'}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expected Close Date</label>
              <Input
                type="date"
                value={expectedCloseDate}
                onChange={(e) => setExpectedCloseDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Probability (%)</label>
              <Input
                type="number"
                value={probability}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 100)) {
                    setProbability(val);
                  }
                }}
                min="0"
                max="100"
                placeholder="0-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status (Stage)</label>
              <select
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md h-10 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={dealStageId || ''}
                onChange={(e) => setDealStageId(e.target.value ? Number(e.target.value) : undefined)}
              >
                <option value="">Select stage</option>
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
              <select
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md h-10 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={dealCategoryId !== undefined ? String(dealCategoryId) : ''}
                onChange={(e) => setDealCategoryId(e.target.value ? Number(e.target.value) : undefined)}
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.id} value={String(category.id)}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Deal Value ($)</label>
              <Input
                type="number"
                value={dealValue}
                onChange={(e) => setDealValue(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
          </div>
        </div>
        {/* Related Tasks Section */}
        {relatedTasks.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <h4 className="text-md font-semibold text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Related Tasks</h4>
            <div className="space-y-3">
              {relatedTasks.map((task) => {
                const priority = task.priority && typeof task.priority === 'object' ? task.priority : undefined;
                const status = task.status && typeof task.status === 'object' ? task.status : undefined;
                return (
                  <div key={task.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h5 className="font-medium text-gray-900 dark:text-white">{task.title}</h5>
                          {priority && (
                            <Badge color="orange">Priority: {priority.name}</Badge>
                          )}
                          {status && (
                            <Badge color="blue">Status: {status.name}</Badge>
                          )}
                        </div>
                        {task.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{task.description}</p>
                        )}
                        <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                          {task.due_date && (
                            <span>Due: {formatDate(task.due_date)}</span>
                          )}
                          {task.owner_user_name && (
                            <span>Owner: {task.owner_user_name}</span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/crm/tasks/${task.id}`)}
                      >
                        <Icon name="external-link" className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {/* Related Entities Section */}
        {(contactId || leadId) && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-2">
            <h4 className="text-md font-semibold text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Related Entities</h4>
            <div className="flex flex-wrap gap-2">
              {contactId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/crm/contacts`)}
                >
                  <Icon name="user" className="w-4 h-4 mr-2" />
                  View Contact
                </Button>
              )}
              {leadId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/crm/leads/${leadId}`)}
                >
                  <Icon name="file-text" className="w-4 h-4 mr-2" />
                  View Lead
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Activity Log Timeline */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-2">
          <h4 className="text-md font-semibold text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Activity Log</h4>
          {activities.length === 0 ? (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
              No activities yet
            </div>
          ) : (
            <div className="relative">
              {activities.map((activity, index) => (
                <div key={activity.id} className="relative flex items-start space-x-3 pb-4">
                  {/* Timeline line */}
                  {index < activities.length - 1 && (
                    <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
                  )}
                  {/* Icon */}
                  <div className="relative flex-shrink-0 mt-1 z-10">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Icon name={getActivityIcon(activity.activity_type)} className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {activity.subject || activity.activity_type}
                        </span>
                        <Badge color="blue">{activity.activity_type}</Badge>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(activity.activity_date || activity.created_at)}
                      </span>
                    </div>
                    {activity.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{activity.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Deal Metadata */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-2">
          <h4 className="text-md font-semibold text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Deal Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Created:</span>
              <span className="ml-2 text-gray-600 dark:text-gray-400">{formatDate(deal.created_at)}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Last Updated:</span>
              <span className="ml-2 text-gray-600 dark:text-gray-400">{formatDate(deal.updated_at)}</span>
            </div>
          </div>
        </div>

          {/* Footer Actions */}
          <div className="flex justify-end space-x-2 pb-6">
            <Button variant="outline" onClick={() => router.push('/crm/deals')} disabled={saving || deleting}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!title.trim() || saving || deleting} className="bg-blue-400 dark:bg-blue-600 hover:bg-blue-500 dark:hover:bg-blue-700 text-white">
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Right Sidebar - Vehicle and Contact Information - Fixed Width, Full Height */}
        <div className="w-[400px] flex-shrink-0 flex flex-col">
          <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 p-6 h-full overflow-y-auto">
            <VehicleContactCard
              title="Lead Information"
              vehicle={lead?.listing ? {
                year: lead.listing.year,
                make: lead.listing.make,
                model: lead.listing.model,
                trim: lead.listing.trim || undefined,
                vin: lead.listing.vin
              } : null}
              contact={lead?.contact ? {
                first_name: lead.contact.first_name,
                last_name: lead.contact.last_name,
                company: lead.contact.company,
                email: lead.contact.email,
                phone: lead.contact.phone,
                mobile: lead.contact.mobile
              } : null}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

