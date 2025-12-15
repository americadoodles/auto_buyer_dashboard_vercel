'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '../../../../components/atoms/Button';
import { Input } from '../../../../components/atoms/Input';
import { Icon } from '../../../../components/atoms/Icon';
import { Badge } from '../../../../components/atoms/Badge';
import { leadsApi } from '../../../../lib/services/leadsApi';
import { updateContact } from '../../../../lib/services/listingManagementApi';
import { Lead, LeadStatus, LeadSource } from '../../../../lib/types/lead';
import { useLeadStatuses, useLeadSources } from '../../../../lib/hooks/useLeads';
import { VehicleContactCard } from '../../../../components/molecules/VehicleContactCard';
import { LeadCreateModal } from '../../../../components/organisms/LeadCreateModal';
import { ConfirmationModal } from '../../../../components/organisms/ConfirmationModal';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { useToast } from '../../../../hooks/useToast';

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.leadId as string;
  const { showSuccess, showError } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lead, setLead] = useState<Lead | null>(null);
  const [isUpdateListingModalOpen, setIsUpdateListingModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Contact information (editable)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  
  // Lead information (editable)
  const [statusId, setStatusId] = useState<number | undefined>();
  const [sourceId, setSourceId] = useState<number | undefined>();
  const [notes, setNotes] = useState('');
  const [leadScore, setLeadScore] = useState(0);
  
  // Related data
  const { statuses, loading: statusesLoading } = useLeadStatuses();
  const { sources, loading: sourcesLoading } = useLeadSources();

  // Load lead details
  useEffect(() => {
    if (!leadId || statusesLoading || sourcesLoading) return;
    
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const leadData = await leadsApi.getLead(leadId);
        if (!leadData) {
          setError('Lead not found');
          setLoading(false);
          return;
        }
        
        setLead(leadData);
        
        // Initialize form fields
        setFirstName(leadData.contact?.first_name || '');
        setLastName(leadData.contact?.last_name || '');
        setEmail(leadData.contact?.email || '');
        setPhone(leadData.contact?.phone || '');
        setJobTitle(leadData.contact?.job_title || '');
        setStatusId(leadData.status_id || leadData.status?.id);
        setSourceId(leadData.source_id);
        setNotes(leadData.notes || '');
        setLeadScore(leadData.lead_score || 0);
      } catch (e: any) {
        setError(e?.message || 'Failed to load lead details');
        showError('Failed to load lead', e?.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [leadId, statusesLoading, sourcesLoading]);

  const handleSave = async () => {
    if (!leadId) return;
    
    setSaving(true);
    setError(null);
    
    try {
      // Update contact information if contact_id exists
      if (lead?.contact_id) {
        await updateContact(lead.contact_id, {
          first_name: firstName,
          last_name: lastName,
          email: email || undefined,
          phone: phone || undefined,
          job_title: jobTitle || undefined
        });
      }
      
      // Update lead information
      const updatedLead = await leadsApi.updateLead(leadId, {
        status_id: statusId,
        source_id: sourceId,
        notes: notes,
        lead_score: leadScore
      });
      
      setLead(updatedLead);
      showSuccess('Lead Updated', 'Lead has been successfully updated');
    } catch (e: any) {
      setError(e?.message || 'Failed to update lead');
      showError('Failed to update lead', e?.message || 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleUpdateListingSuccess = async () => {
    // Reload lead data after successful update
    if (!leadId) return;
    try {
      const leadData = await leadsApi.getLead(leadId);
      if (leadData) {
        setLead(leadData);
        
        // Update contact information fields
        setFirstName(leadData.contact?.first_name || '');
        setLastName(leadData.contact?.last_name || '');
        setEmail(leadData.contact?.email || '');
        setPhone(leadData.contact?.phone || '');
        setJobTitle(leadData.contact?.job_title || '');
        
        // Update lead information fields
        setStatusId(leadData.status_id || leadData.status?.id);
        setSourceId(leadData.source_id);
        setNotes(leadData.notes || '');
        setLeadScore(leadData.lead_score || 0);
        
        showSuccess('Lead Updated', 'Lead has been successfully updated');
      }
    } catch (e: any) {
      console.error('Error reloading lead:', e);
      showError('Failed to reload lead', e?.message || 'An error occurred');
    }
  };

  const handleDelete = async () => {
    if (!leadId) return;
    
    setDeleting(true);
    setError(null);
    
    try {
      await leadsApi.deleteLead(leadId);
      showSuccess('Lead Deleted', 'Lead has been successfully deleted');
      router.push('/crm/leads');
    } catch (e: any) {
      setError(e?.message || 'Failed to delete lead');
      showError('Failed to delete lead', e?.message || 'An error occurred');
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  if (loading || statusesLoading || sourcesLoading) {
    return (
      <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900">
        <div className="p-6 flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-300">Loading lead details...</span>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900">
        <div className="p-6">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Lead Not Found</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">{error || 'The lead you are looking for does not exist.'}</p>
            <Button onClick={() => router.push('/crm/leads')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Leads
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
              onClick={() => router.push('/crm/leads')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
            <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center shadow-lg">
              <Icon name="user-plus" className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Lead Details</h1>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setIsUpdateListingModalOpen(true)}
              className="bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-black font-medium cursor-pointer"
              size="sm"
            >
              <Icon name="edit" className="w-4 h-4 mr-2" />
              Update Lead
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteConfirm(true)}
              disabled={saving || deleting}
              className="text-red-600 dark:text-red-400 border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center"
              size="sm"
            >
              <Icon name="trash-2" className="w-4 h-4 mr-2" />
              <span>Delete Lead</span>
            </Button>
          </div>
        </div>
        {error && (
          <div className="text-red-600 dark:text-red-300 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-md mt-4">{error}</div>
        )}
      </div>

      {/* Main Content Layout */}
      <div className="flex-1 flex gap-6 overflow-hidden px-6 pb-6 items-stretch">
        {/* Left Content - Scrollable */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-4">
          {/* Alert if no listing_id */}
          {!lead.listing_id && (
            <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start">
                <Icon name="alert-circle" className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-1">
                    No Listing Information
                  </h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    This lead does not have an associated listing.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Status Badges - Only show if listing_id exists */}
          {lead.listing_id && (
            <div className="mt-4 flex items-center space-x-4">
              {lead.status && (
                <Badge color="blue">
                  Status: {lead.status.name}
                </Badge>
              )}
              {lead.source && (
                <Badge color="orange">
                  Source: {lead.source.name}
                </Badge>
              )}
              {lead.lead_score !== undefined && (
                <Badge color="green">
                  Score: {lead.lead_score}
                </Badge>
              )}
            </div>
          )}

          {/* Edit Fields Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <h4 className="text-md font-semibold text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Contact Information</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  First Name
                </label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter first name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Last Name
                </label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter last name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone
              </label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter phone number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Job Title
              </label>
              <Input
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Enter job title"
              />
            </div>

            {lead.contact?.company && (
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Company (Read-only)
                </label>
                <Input
                  value={lead.contact.company}
                  disabled
                  className="bg-gray-50 dark:bg-gray-700"
                />
              </div>
            )}
          </div>

          {/* Lead Information Section - Only show if listing_id exists */}
          {lead.listing_id && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
              <h4 className="text-md font-semibold text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Lead Information</h4>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={statusId || ''}
                  onChange={(e) => setStatusId(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  disabled={statusesLoading}
                >
                  <option value="">Select status</option>
                  {statuses.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Source
                </label>
                <select
                  value={sourceId || ''}
                  onChange={(e) => setSourceId(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  disabled={sourcesLoading}
                >
                  <option value="">Select source</option>
                  {sources.map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Lead Score
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={leadScore}
                  onChange={(e) => setLeadScore(parseInt(e.target.value) || 0)}
                  placeholder="Enter lead score (0-100)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this lead..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={4}
                />
              </div>
            </div>
          )}
          {lead.listing_id && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-2">
              <h4 className="text-md font-semibold text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Related Listing</h4>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => router.push(`/listings/${lead.listing_id}`)}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-black border-blue-600 dark:border-blue-500"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Listing
                </Button>
                </div>
            </div>
          )}

          {/* Lead Metadata */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-2">
            <h4 className="text-md font-semibold text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Lead Activity</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Assigned To:</span>
                <span className="ml-2 text-gray-600 dark:text-gray-300">
                  {lead.assigned_to_user?.username || 'Unassigned'}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Created:</span>
                <span className="ml-2 text-gray-600 dark:text-gray-300">{formatDate(lead.created_at)}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Last Updated:</span>
                <span className="ml-2 text-gray-600 dark:text-gray-300">{formatDate(lead.updated_at)}</span>
              </div>
            </div>
          </div>
          {/* Footer Actions */}
          <div className="flex justify-end space-x-2 pb-6">
            <Button variant="outline" onClick={() => router.push('/crm/leads')} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-400 hover:bg-blue-500  text-black">
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Right Sidebar - Vehicle and Contact Information - Fixed Width, Full Height */}
        <div className="w-[400px] flex-shrink-0 flex flex-col">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 h-full overflow-y-auto">
            <VehicleContactCard
              title="Vehicle of Interest"
              vehicle={lead.listing ? {
                year: lead.listing.year ?? undefined,
                make: lead.listing.make ?? undefined,
                model: lead.listing.model ?? undefined,
                trim: lead.listing.trim ?? undefined,
                vin: lead.listing.vin ?? undefined,
              } : null}
              contact={lead.contact ? {
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

      {/* Update Lead Modal */}
      <LeadCreateModal
        isOpen={isUpdateListingModalOpen}
        onClose={() => setIsUpdateListingModalOpen(false)}
        listingId={lead?.listing_id || 0}
        existingLead={lead || null}
        onSuccess={handleUpdateListingSuccess}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Confirm Deletion"
        message="Are you sure you want to delete this lead? This action cannot be undone."
        confirmText="Yes"
        cancelText="No"
        variant="danger"
        loading={deleting}
        loadingText="Deleting..."
      />
    </div>
  );
}

