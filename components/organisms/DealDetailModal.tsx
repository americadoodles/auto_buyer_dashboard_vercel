'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Icon } from '../atoms/Icon';
import { Badge } from '../atoms/Badge';
import { dealsApi, DealCategory, DealStage } from '../../lib/services/dealsApi';
import { leadsApi } from '../../lib/services/leadsApi';
import { Lead } from '../../lib/types/lead';
import { useAuth } from '../../app/auth/useAuth';
import { useRouter } from 'next/navigation';
import { useDealStages, useDealCategories } from '../../lib/hooks/useDeals';

interface DealActivity {
  id: string;
  deal_id: string;
  activity_type: string;
  subject: string;
  description: string;
  activity_date: string;
  created_by: string;
  created_at: string;
}

interface Deal {
  id: string;
  name: string;
  description: string;
  contact?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  lead_id?: string;
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

interface DealDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  deal: Deal | null;
  onDealUpdated?: () => void;
}

export const DealDetailModal: React.FC<DealDetailModalProps> = ({
  isOpen,
  onClose,
  deal: initialDeal,
  onDealUpdated
}) => {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Deal fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [expectedCloseDate, setExpectedCloseDate] = useState(''); 
  const [probability, setProbability] = useState('0');
  const [dealStageId, setDealStageId] = useState<number | undefined>(undefined);
  const [dealCategoryId, setDealCategoryId] = useState<number | undefined>(undefined);
  const [dealValue, setDealValue] = useState('');
  const [contactId, setContactId] = useState<string | undefined>(undefined);
  
  // Related data - use hooks for stages and categories
  const { stages, loading: stagesLoading } = useDealStages();
  const { categories, loading: categoriesLoading } = useDealCategories();
  const [activities, setActivities] = useState<DealActivity[]>([]);
  const [contactName, setContactName] = useState<string>('');
  const [leadId, setLeadId] = useState<string | undefined>(undefined);
  const [lead, setLead] = useState<Lead | null>(null);
  const [loadingLead, setLoadingLead] = useState(false);

  // Reset states when modal closes
  useEffect(() => {
    if (!isOpen) {
      setDeleting(false);
      setShowDeleteConfirm(false);
      setSaving(false);
      setError(null);
      setLead(null);
      setLeadId(undefined);
    }
  }, [isOpen]);
  // Load deal details and activities
  useEffect(() => {
    if (!isOpen || !initialDeal) return;
    
    // Reset all states when opening a new deal
    setDeleting(false);
    setShowDeleteConfirm(false);
    setSaving(false);
    setError(null);
    setLead(null);
    
    // Initialize form fields from the deal prop
    setTitle(initialDeal.name || '');
    setDescription(initialDeal.description || '');
    setExpectedCloseDate(formatDateForInput(initialDeal.expected_close_date));
    setProbability(initialDeal.probability?.toString() || '0');
    setDealStageId(initialDeal.deal_stage?.id);
    setDealCategoryId(initialDeal.deal_category?.id);
    setDealValue(initialDeal.deal_value?.toString() || '');
    setContactId(initialDeal.contact?.id);
    setLeadId(initialDeal.lead_id);
    
    if (initialDeal.contact) {
      setContactName(`${initialDeal.contact.first_name} ${initialDeal.contact.last_name}`);
    }

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [dealActivities, leadData] = await Promise.all([
          dealsApi.getDealActivities(initialDeal.id).catch(() => []),
          initialDeal.lead_id ? leadsApi.getLead(initialDeal.lead_id).catch(() => null) : Promise.resolve(null)
        ]);
        setActivities(dealActivities);
        setLead(leadData);
      } catch (e: any) {
        setError(e?.message || 'Failed to load deal details');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen, initialDeal]);

  const handleSave = async () => {
    if (!initialDeal) return;
    
    setSaving(true);
    setError(null);
    
    try {
      await dealsApi.updateDeal(initialDeal.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        expected_close_date: expectedCloseDate || undefined,
        probability: probability ? parseInt(probability) : 0,
        deal_stage_id: dealStageId,
        deal_category_id: dealCategoryId,
        deal_value: dealValue ? parseFloat(dealValue) : undefined,
        contact_id: contactId || undefined
      });

      // Reload activities after update
      const updatedActivities = await dealsApi.getDealActivities(initialDeal.id);
      setActivities(updatedActivities);

      if (onDealUpdated) {
        onDealUpdated();
      }
      
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to update deal');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!initialDeal) return;
    
    setDeleting(true);
    setError(null);
    
    try {
      await dealsApi.deleteDeal(initialDeal.id);

      // Reset states before closing
      setDeleting(false);
      setShowDeleteConfirm(false);

      if (onDealUpdated) {
        onDealUpdated();
      }
      
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to delete deal');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const formatDate = (dateString: string) => {
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

  if (!isOpen || !initialDeal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
          <h3 className="text-lg font-semibold">Deal Details</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <Icon name="x" className="w-5 h-5" />
          </button>
        </div>

        {(loading || stagesLoading || categoriesLoading) ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">{error}</div>
              )}

              {/* Vehicle and Contact Information Section */}
              {lead && (lead.listing || lead.contact) && (
                <div className="space-y-2">
                  <h4 className="text-md font-semibold text-gray-900 border-b pb-2">Lead Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Vehicle Information */}
                    {lead.listing && (
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                        <div className="text-sm font-medium text-blue-900 mb-2">Vehicle Information</div>
                        <div className="text-sm text-blue-700 space-y-1">
                          <div><span className="font-medium">Year:</span> {lead.listing.year}</div>
                          <div><span className="font-medium">Make:</span> {lead.listing.make}</div>
                          <div><span className="font-medium">Model:</span> {lead.listing.model}</div>
                          {lead.listing.trim && (
                            <div><span className="font-medium">Trim:</span> {lead.listing.trim}</div>
                          )}
                          {lead.listing.vin && (
                            <div><span className="font-medium">VIN:</span> {lead.listing.vin}</div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Contact Information */}
                    {lead.contact && (
                      <div className="bg-green-50 border border-green-200 rounded-md p-3">
                        <div className="text-sm font-medium text-green-900 mb-2">Contact Information</div>
                        <div className="text-sm text-green-700 space-y-1">
                          <div>
                            <span className="font-medium">Name:</span> {lead.contact.first_name} {lead.contact.last_name}
                          </div>
                          {lead.contact.company && (
                            <div><span className="font-medium">Company:</span> {lead.contact.company}</div>
                          )}
                          {lead.contact.email && (
                            <div><span className="font-medium">Email:</span> {lead.contact.email}</div>
                          )}
                          {lead.contact.phone && (
                            <div><span className="font-medium">Phone:</span> {lead.contact.phone}</div>
                          )}
                          {lead.contact.mobile && !lead.contact.phone && (
                            <div><span className="font-medium">Mobile:</span> {lead.contact.mobile}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

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
                    placeholder="Deal title"
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
                    placeholder="Deal description"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Owner (Assigned To)</label>
                    <div className="w-full border rounded-md h-10 px-3 flex items-center bg-gray-50">
                      <span className="text-sm text-gray-700">
                        {initialDeal.assigned_to?.username || 'Unassigned'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                    <Input
                      type="date"
                      value={expectedCloseDate}
                      onChange={(e) => setExpectedCloseDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority (Probability %)</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status (Stage)</label>
                    <select
                      className="w-full border rounded-md h-10 px-3"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      className="w-full border rounded-md h-10 px-3"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Deal Value ($)</label>
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

              {/* Related Entities Section */}
              {(contactId || leadId) && (
                <div className="space-y-2">
                  <h4 className="text-md font-semibold text-gray-900 border-b pb-2">Related Entities</h4>
                  <div className="flex flex-wrap gap-2">
                    {contactId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/admin/crm/contacts`)}
                      >
                        <Icon name="user" className="w-4 h-4 mr-2" />
                        View Contact
                      </Button>
                    )}
                    {leadId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/admin/crm/leads`)}
                      >
                        <Icon name="file-text" className="w-4 h-4 mr-2" />
                        View Lead
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Activity Log Timeline */}
              <div className="space-y-2">
                <h4 className="text-md font-semibold text-gray-900 border-b pb-2">Activity Log</h4>
                {activities.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    No activities yet
                  </div>
                ) : (
                  <div className="relative">
                    {activities.map((activity, index) => (
                      <div key={activity.id} className="relative flex items-start space-x-3 pb-4">
                        {/* Timeline line */}
                        {index < activities.length - 1 && (
                          <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-gray-200"></div>
                        )}
                        {/* Icon */}
                        <div className="relative flex-shrink-0 mt-1 z-10">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <Icon name={getActivityIcon(activity.activity_type)} className="w-4 h-4 text-blue-600" />
                          </div>
                        </div>
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-900">
                                {activity.subject || activity.activity_type}
                              </span>
                              <Badge color="blue">{activity.activity_type}</Badge>
                            </div>
                            <span className="text-xs text-gray-500">
                              {formatDate(activity.activity_date || activity.created_at)}
                            </span>
                          </div>
                          {activity.description && (
                            <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-between items-center sticky bottom-0 bg-white">
          <div>
            {!showDeleteConfirm ? (
              <Button 
                variant="outline" 
                onClick={() => setShowDeleteConfirm(true)}
                disabled={saving || deleting || loading}
                className="text-red-600 border-red-300 hover:bg-red-50 flex items-center"
              >
                <Icon name="trash-2" className="w-4 h-4 mr-2" />
                <span>
                  Delete Deal
                </span>
              </Button>
            ) : (
              <div className="flex items-center space-x-2">
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
              </div>
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

