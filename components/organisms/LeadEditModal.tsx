'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Badge } from '../atoms/Badge';
import { X, Save } from 'lucide-react';
import { leadsApi } from '../../lib/services/leadsApi';
import { Lead, LeadStatus, LeadSource } from '../../lib/types/lead';
import { updateContact } from '../../lib/services/listingManagementApi';


interface LeadEditModalProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedLead: Lead) => void;
  statuses?: LeadStatus[];
  sources?: LeadSource[];
}

export const LeadEditModal: React.FC<LeadEditModalProps> = ({
  lead,
  isOpen,
  onClose,
  onSave,
  statuses = [],
  sources = []
}) => {
  console.log('lead', lead);
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
  
  const [saving, setSaving] = useState(false);
  const [loadingStatuses, setLoadingStatuses] = useState(false);
  const [loadingSources, setLoadingSources] = useState(false);
  const [availableStatuses, setAvailableStatuses] = useState<LeadStatus[]>(statuses);
  const [availableSources, setAvailableSources] = useState<LeadSource[]>(sources);

  // Load statuses and sources if not provided
  useEffect(() => {
    const loadData = async () => {
      try {
        if (statuses.length === 0) {
          setLoadingStatuses(true);
          const statusesData = await leadsApi.getLeadStatuses();
          setAvailableStatuses(statusesData);
        }
        
        if (sources.length === 0) {
          setLoadingSources(true);
          const sourcesData = await leadsApi.getLeadSources();
          setAvailableSources(sourcesData);
        }
      } catch (error) {
        console.error('Error loading statuses/sources:', error);
      } finally {
        setLoadingStatuses(false);
        setLoadingSources(false);
      }
    };

    if (isOpen) {
      loadData();
    }
  }, [isOpen, statuses, sources]);

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen && lead) {
      setFirstName(lead.contact?.first_name || '');
      setLastName(lead.contact?.last_name || '');
      setEmail(lead.contact?.email || '');
      setPhone(lead.contact?.phone || '');
      setJobTitle(lead.contact?.job_title || '');
      setStatusId(lead.status_id || lead.status?.id);
      setSourceId(lead.source_id);
      setNotes(lead.notes || '');
      setLeadScore(lead.lead_score || 0);
    }
  }, [isOpen, lead]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      
      return () => {
        // Restore scroll position
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  // Save changes
  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Update contact information if contact_id exists
      if (lead.contact_id) {
        await updateContact(lead.contact_id, {
          first_name: firstName,
          last_name: lastName,
          email: email || undefined,
          phone: phone || undefined,
          job_title: jobTitle || undefined
        });
      }
      
      // Update lead information
      const updatedLead = await leadsApi.updateLead(lead.id, {
        status_id: statusId,
        source_id: sourceId,
        notes: notes,
        lead_score: leadScore
      });
      
      onSave(updatedLead);
      onClose();
    } catch (error) {
      console.error('Error updating lead:', error);
      alert('Failed to update lead. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Edit Lead
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Lead ID: {lead.id}
            </p>
          </div>
          <Button
            onClick={onClose}
            variant="outline"
            size="sm"
            className="p-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Contact Information (Editable) */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                Contact Information
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
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

              {/* Read-only contact fields */}
              {lead.contact?.company && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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

            {/* Lead Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                Lead Information
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={statusId || ''}
                  onChange={(e) => setStatusId(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loadingStatuses}
                >
                  <option value="">Select status</option>
                  {availableStatuses.map((status) => (
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
                  disabled={loadingSources}
                >
                  <option value="">Select source</option>
                  {availableSources.map((source) => (
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

              {/* Read-only lead fields */}
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Assigned To
                  </label>
                  <div className="text-sm text-gray-900">
                    {lead.assigned_to_user?.username || 'Unassigned'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Created
                  </label>
                  <div className="text-sm text-gray-900">
                    {formatDate(lead.created_at)}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Last Updated
                  </label>
                  <div className="text-sm text-gray-900">
                    {formatDate(lead.updated_at)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Vehicle Information (Read-only) */}
          {lead.listing && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Vehicle of Interest
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    VIN
                  </label>
                  <div className="text-sm text-gray-900 font-mono">
                    {lead.listing.vin || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Year
                  </label>
                  <div className="text-sm text-gray-900">
                    {lead.listing.year || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Make
                  </label>
                  <div className="text-sm text-gray-900">
                    {lead.listing.make || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Model
                  </label>
                  <div className="text-sm text-gray-900">
                    {lead.listing.model || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Trim
                  </label>
                  <div className="text-sm text-gray-900">
                    {lead.listing.trim || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Miles
                  </label>
                  <div className="text-sm text-gray-900">
                    {lead.listing.miles?.toLocaleString() || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Price
                  </label>
                  <div className="text-sm text-gray-900 font-semibold">
                    {lead.listing.price ? `$${lead.listing.price.toLocaleString()}` : 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Location
                  </label>
                  <div className="text-sm text-gray-900">
                    {lead.listing.location || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Radius
                  </label>
                  <div className="text-sm text-gray-900">
                    {lead.listing.radius !== undefined ? `${lead.listing.radius} miles` : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <Button
            onClick={onClose}
            variant="outline"
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

