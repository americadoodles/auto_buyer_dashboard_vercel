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
import { ArrowLeft } from 'lucide-react';
import { useToast } from '../../../../hooks/useToast';

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.leadId as string;
  const { showSuccess, showError } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lead, setLead] = useState<Lead | null>(null);
  
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
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading || statusesLoading || sourcesLoading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-6 flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading lead details...</span>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-6">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Lead Not Found</h2>
            <p className="text-gray-600 mb-4">{error || 'The lead you are looking for does not exist.'}</p>
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
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-gray-200 pb-6 flex-shrink-0">
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
              <h1 className="text-3xl font-bold text-gray-900">Lead Details</h1>
              <p className="text-gray-600 mt-2">
                Lead ID: {leadId}
              </p>
            </div>
          </div>
        </div>
        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md mt-4">{error}</div>
        )}
      </div>

      {/* Main Content Layout */}
      <div className="flex-1 flex gap-6 overflow-hidden px-6 pb-6 items-stretch">
        {/* Left Content - Scrollable */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-4">
          {/* Status Badges */}
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

          {/* Edit Fields Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
            <h4 className="text-md font-semibold text-gray-900 border-b pb-2">Contact Information</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter first name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Company (Read-only)
                </label>
                <Input
                  value={lead.contact.company}
                  disabled
                  className="bg-gray-50"
                />
              </div>
            )}
          </div>

          {/* Lead Information Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
            <h4 className="text-md font-semibold text-gray-900 border-b pb-2">Lead Information</h4>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={statusId || ''}
                onChange={(e) => setStatusId(e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Source
              </label>
              <select
                value={sourceId || ''}
                onChange={(e) => setSourceId(e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this lead..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
            </div>
          </div>

          {/* Lead Metadata */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-2">
            <h4 className="text-md font-semibold text-gray-900 border-b pb-2">Lead Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Assigned To:</span>
                <span className="ml-2 text-gray-600">
                  {lead.assigned_to_user?.username || 'Unassigned'}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Created:</span>
                <span className="ml-2 text-gray-600">{formatDate(lead.created_at)}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Last Updated:</span>
                <span className="ml-2 text-gray-600">{formatDate(lead.updated_at)}</span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end space-x-2 pb-6">
            <Button variant="outline" onClick={() => router.push('/crm/leads')} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-400 hover:bg-blue-500 text-white">
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Right Sidebar - Vehicle and Contact Information - Fixed Width, Full Height */}
        <div className="w-[400px] flex-shrink-0 flex flex-col">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-full overflow-y-auto">
            <VehicleContactCard
              title="Vehicle of Interest"
              vehicle={lead.listing ? {
                year: lead.listing.year,
                make: lead.listing.make,
                model: lead.listing.model,
                trim: lead.listing.trim,
                vin: lead.listing.vin
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
    </div>
  );
}

