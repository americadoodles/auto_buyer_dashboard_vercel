'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '../../../../components/atoms/Button';
import { Input } from '../../../../components/atoms/Input';
import { Icon } from '../../../../components/atoms/Icon';
import { Badge } from '../../../../components/atoms/Badge';
import { leadsApi } from '../../../../lib/services/leadsApi';
import { updateContact, getListingDetails, getListingActivities } from '../../../../lib/services/listingManagementApi';
import { Lead, LeadStatus, LeadSource, LeadActivity } from '../../../../lib/types/lead';
import { Listing, ListingActivity } from '../../../../lib/types/listing';
import { useLeadStatuses, useLeadSources } from '../../../../lib/hooks/useLeads';
import { LeadCreateModal } from '../../../../components/organisms/LeadCreateModal';
import { ConfirmationModal } from '../../../../components/organisms/ConfirmationModal';
import { VehiclePhotoGallery } from '../../../../components/organisms/VehiclePhotoGallery';
import { VehicleHeader } from '../../../../components/organisms/VehicleHeader';
import { MMRCard } from '../../../../components/organisms/MMRCard';
import { CompactAutocheckSection } from '../../../../components/organisms/CompactAutocheckSection';
import { CompactCarfaxSection } from '../../../../components/organisms/CompactCarfaxSection';
import { PricingCard } from '../../../../components/organisms/PricingCard';
import { SMSThreadCompact } from '../../../../components/organisms/SMSThreadCompact';
import { AccuTradeDataSection } from '../../../../components/organisms/AccuTradeDataSection';
import { ArrowLeft, ExternalLink, Check, X, Edit2, Save } from 'lucide-react';
import { useToast } from '../../../../hooks/useToast';
import { formatDateTime } from '../../../../lib/utils/formatters';
import { ApiService } from '../../../../lib/services/api';
import { useAccuTradeData } from '../../../../lib/hooks/useAccuTradeData';
import { useMMRData } from '../../../../lib/hooks/useMMRData';

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
  const [listing, setListing] = useState<Listing | null>(null);
  const [listingActivities, setListingActivities] = useState<ListingActivity[]>([]);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [isUpdateListingModalOpen, setIsUpdateListingModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [savingField, setSavingField] = useState<string | null>(null);
  const [mmrData, setMmrData] = useState<any>(null);
  const [accuTradeData, setAccuTradeData] = useState<any>(null);
  
  // Related data
  const { statuses, loading: statusesLoading } = useLeadStatuses();
  const { sources, loading: sourcesLoading } = useLeadSources();

  // Use the full listing details if available, otherwise fall back to nested listing
  const displayListing = listing || lead?.listing;
  
  // Hooks for data availability - MUST be called before any early returns
  const { hasData: hasAccuTradeData } = useAccuTradeData(displayListing?.vin);
  const { hasData: hasMMRData } = useMMRData(displayListing?.vin);

  // Load lead details
  useEffect(() => {
    if (!leadId || statusesLoading || sourcesLoading) return;
    
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [leadData, leadActivities] = await Promise.all([
          leadsApi.getLead(leadId),
          leadsApi.getLeadActivities(leadId).catch(() => [])
        ]);
        
        if (!leadData) {
          setError('Lead not found');
          setLoading(false);
          return;
        }
        
        setLead(leadData);
        setActivities(leadActivities);
        
        // If lead has a listing_id, fetch complete listing details
        if (leadData.listing_id) {
          try {
            const [listingData, activitiesData] = await Promise.all([
              getListingDetails(leadData.listing_id),
              getListingActivities(leadData.listing_id).catch(() => [])
            ]);
            setListing(listingData);
            setListingActivities(activitiesData);
            
            // Fetch MMR and AccuTrade data if VIN exists
            if (listingData?.vin) {
              try {
                const [mmrResult, accuTradeResult] = await Promise.allSettled([
                  ApiService.getMMRData(listingData.vin),
                  ApiService.getAccuTradeData(listingData.vin),
                ]);
                
                if (mmrResult.status === 'fulfilled') {
                  setMmrData(mmrResult.value);
                }
                if (accuTradeResult.status === 'fulfilled') {
                  setAccuTradeData(accuTradeResult.value);
                }
              } catch (e) {
                console.error('Failed to load MMR/AccuTrade data:', e);
                // Don't fail the whole page if data can't be loaded
              }
            }
          } catch (e) {
            console.error('Failed to load listing details:', e);
            // Don't fail the whole page if listing can't be loaded
          }
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load lead details');
        showError('Failed to load lead', e?.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [leadId, statusesLoading, sourcesLoading]);

  // Start editing a field
  const startEditing = (field: string, currentValue: any) => {
    setEditingField(field);
    if (typeof currentValue === 'number') {
      setEditValue(currentValue.toString());
    } else {
      setEditValue(currentValue || '');
    }
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingField(null);
    setEditValue('');
  };

  // Save a single field
  const saveField = async (field: string) => {
    if (!leadId || !lead) return;

    try {
      setSavingField(field);
      
      let updateData: any = {};
      let value: any = editValue;

      // Parse value based on field type
      switch (field) {
        case 'lead_score':
          value = value ? parseInt(value, 10) : undefined;
          if (isNaN(value)) value = undefined;
          break;
        case 'status_id':
        case 'source_id':
          value = value ? parseInt(value, 10) : undefined;
          break;
        default:
          value = value || undefined;
      }

      // Update lead information
      const updatedLead = await leadsApi.updateLead(leadId, {
        ...updateData,
        [field]: value
      });
      
      setLead(updatedLead);
      setEditingField(null);
      setEditValue('');
      
      // Reload activities after update
      const updatedActivities = await leadsApi.getLeadActivities(leadId).catch(() => []);
      setActivities(updatedActivities);
      
      showSuccess('Field Updated', `${field} has been successfully updated`);
    } catch (error) {
      console.error('Error updating field:', error);
      showError('Failed to save', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setSavingField(null);
    }
  };

  // Save all changes
  const handleSave = async () => {
    if (!leadId) return;
    
    setSaving(true);
    setError(null);
    
    try {
      // Update contact information if contact_id exists
      if (lead?.contact_id) {
        await updateContact(lead.contact_id, {
          first_name: lead.contact?.first_name || undefined,
          last_name: lead.contact?.last_name || undefined,
          email: lead.contact?.email || undefined,
          phone: lead.contact?.phone || undefined,
          job_title: lead.contact?.job_title || undefined
        });
      }
      
      // Update lead information
      const updatedLead = await leadsApi.updateLead(leadId, {
        status_id: lead?.status_id,
        source_id: lead?.source_id,
        notes: lead?.notes,
        lead_score: lead?.lead_score
      });
      
      setLead(updatedLead);
      
      // Reload activities after update
      const updatedActivities = await leadsApi.getLeadActivities(leadId).catch(() => []);
      setActivities(updatedActivities);
      
      showSuccess('Lead Updated', 'Lead has been successfully updated');
    } catch (e: any) {
      setError(e?.message || 'Failed to update lead');
      showError('Failed to update lead', e?.message || 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateListingSuccess = async () => {
    // Reload lead data after successful update
    if (!leadId) return;
    try {
      const leadData = await leadsApi.getLead(leadId);
      if (leadData) {
        setLead(leadData);
        
        // Reload listing details if listing_id exists
        if (leadData.listing_id) {
          try {
            const [listingData, activitiesData] = await Promise.all([
              getListingDetails(leadData.listing_id),
              getListingActivities(leadData.listing_id).catch(() => [])
            ]);
            setListing(listingData);
            setListingActivities(activitiesData);
          } catch (e) {
            console.error('Failed to reload listing details:', e);
          }
        }
        
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

  const getActivityIcon = (activityType: string) => {
    switch (activityType.toLowerCase()) {
      case 'edit':
        return 'edit';
      case 'create':
        return 'plus';
      case 'delete':
        return 'trash-2';
      default:
        return 'circle';
    }
  };

  // Format number with commas
  const formatNumberWithCommas = (value: number | string | undefined): string => {
    if (value === undefined || value === null || value === '') return '';
    const numValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
    if (isNaN(numValue)) return '';
    return numValue.toLocaleString('en-US');
  };

  if (loading || statusesLoading || sourcesLoading) {
    return (
      <div className="h-full overflow-y-auto bg-white dark:bg-gray-900">
        <div className="p-6 flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <span className="ml-3 text-gray-800 dark:text-gray-200 font-medium">Loading lead details...</span>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="h-full overflow-y-auto bg-white dark:bg-gray-900">
        <div className="p-6">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Lead Not Found</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-2 font-medium">{error || 'The lead you are looking for does not exist.'}</p>
            <Button onClick={() => router.push('/crm/leads')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Leads
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const contactName = displayListing 
    ? `${displayListing.year} ${displayListing.make} ${displayListing.model}`.trim()
    : lead?.contact 
    ? `${lead.contact.first_name} ${lead.contact.last_name}`.trim()
    : 'Lead Details';

  return (
    <div className="h-full flex flex-col bg-[#0f1117]">
      {/* Main Content Layout */}
      <div className="flex-1 overflow-y-auto bg-[#0f1117]">
        <div className="max-w-[1800px] mx-auto px-6 py-6">
          {/* Status Badges */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              {lead.status && (
                <Badge color="blue" className="bg-blue-500 dark:bg-blue-600 text-white font-semibold shadow-sm">
                  Status: {lead.status.name}
                </Badge>
              )}
              {lead.source && (
                <Badge color="orange" className="bg-orange-500 dark:bg-orange-600 text-white font-semibold shadow-sm">
                  Source: {lead.source.name}
                </Badge>
              )}
              {lead.lead_score !== undefined && (
                <Badge color="green" className="bg-emerald-500 dark:bg-emerald-600 text-white font-semibold shadow-sm">
                  Score: {lead.lead_score}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsUpdateListingModalOpen(true)}
                variant="outline"
              size="sm"
                className="flex items-center gap-2 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-black border-0 shadow-md font-semibold cursor-pointer"
            >
                <Icon name="edit" className="w-4 h-4" />
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

          {/* 3-Column Grid Layout */}
          {displayListing ? (
            <div className="mb-2 grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* First Column - Vehicle Images and SMS */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                {/* Vehicle Photo Gallery */}
                {displayListing.images && displayListing.images.length > 0 && (
                  <VehiclePhotoGallery images={displayListing.images} />
                )}
                
                {/* SMS Thread */}
                <SMSThreadCompact
                  contactName={lead?.contact ? `${lead.contact.first_name} ${lead.contact.last_name}` : 'Contact'}
                />
      </div>

              {/* Second Column - Vehicle Header, MMR, AutoCheck, CARFAX */}
              <div className="lg:col-span-4 space-y-4">
                {/* Vehicle Header */}
                <VehicleHeader
                  year={displayListing.year}
                  make={displayListing.make}
                  model={displayListing.model}
                  trim={displayListing.trim || undefined}
                  miles={displayListing.miles || undefined}
                  vin={displayListing.vin || undefined}
                  hasAutoCheck={true}
                  hasCarfax={true}
                  hasMMR={hasMMRData || false}
                  hasAccuTrade={hasAccuTradeData || false}
                />
                
                {/* MMR Card */}
                <MMRCard
                  mmrValue={
                    (mmrData?.features && typeof mmrData.features === 'object' && mmrData.features['Base MMR']) 
                      ? mmrData.features['Base MMR']
                      : (mmrData?.features && typeof mmrData.features === 'object' && mmrData.features.base_mmr)
                        ? mmrData.features.base_mmr
                        : (typeof mmrData?.estimated_retail === 'object' && mmrData?.estimated_retail?.average) 
                          ? mmrData.estimated_retail.average 
                          : (typeof mmrData?.estimated_retail === 'number' 
                            ? mmrData.estimated_retail 
                            : displayListing.mmr || undefined)
                  }
                  average={
                    (typeof mmrData?.historical_average === 'object' && mmrData?.historical_average?.average) 
                      ? mmrData.historical_average.average 
                      : (typeof mmrData?.historical_average === 'number' 
                        ? mmrData.historical_average 
                        : displayListing.mmr || undefined)
                  }
                  above={
                    (typeof mmrData?.estimated_retail === 'object' && mmrData?.estimated_retail?.above) 
                      ? mmrData.estimated_retail.above 
                      : undefined
                  }
                  below={
                    (typeof mmrData?.estimated_retail === 'object' && mmrData?.estimated_retail?.below) 
                      ? mmrData.estimated_retail.below 
                      : undefined
                  }
                  transactions={Array.isArray(mmrData?.transactions) ? mmrData.transactions.length : 37}
                  similar={37}
                  mmrData={mmrData}
                  vin={displayListing?.vin}
                />
                
                {/* AutoCheck Section */}
                <CompactAutocheckSection
                  status={displayListing.cleanTitle ? 'Clean' : 'Unknown'}
                />
                
                {/* CARFAX Section */}
                <CompactCarfaxSection
                  status={displayListing.cleanTitle ? 'Clean' : 'Unknown'}
                  previousOwners={1}
                  images={displayListing.images?.slice(0, 3) || []}
                />
              </div>

              {/* Third Column - Pricing and Factory Options */}
              <div className="lg:col-span-4 space-y-4">
                {/* Pricing Card */}
                <PricingCard
                  sellerName={displayListing.sellerName || undefined}
                  askingPrice={displayListing.price || undefined}
                  suggestedPrice={displayListing.buyMax || undefined}
                />
                
                {/* AccuTrade Data - Always show if VIN exists */}
                {displayListing.vin && (
                  <>
                    {hasAccuTradeData && accuTradeData ? (
                      <AccuTradeDataSection 
                        accuTradeData={accuTradeData}
                        vin={displayListing.vin}
                        hasAccuTradeData={hasAccuTradeData}
                      />
                    ) : (
                      <div className="bg-[#1a1d29] border border-gray-700/50 rounded-lg p-5">
                        <h3 className="text-white font-semibold mb-2">AccuTrade Data</h3>
                        <p className="text-sm text-gray-400 mb-2">
                          No AccuTrade data found for VIN: {displayListing.vin}
                        </p>
                        <Button
                          onClick={() => {
                            const accuTradeUrl = `https://appraiser3.accu-trade.com/appraisal/new?vin=${encodeURIComponent(displayListing.vin!)}`;
                            window.open(accuTradeUrl, '_blank');
                          }}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Open AccuTrade Appraisal
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : null}

          {/* Edit Fields Section */}
          <div className="mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-3">
              <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">Lead Information</h4>
                  </div>
            
            <div className="grid grid-cols-2 gap-x-8 gap-y-1">
              {/* Status */}
              <div className="flex items-center w-full group">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Status:</span>
                {editingField === 'status_id' ? (
                  <div className="flex items-center gap-2 flex-1">
                    <select
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100 flex-1 w-full min-w-0 h-8 py-0.5 px-2 text-sm rounded-md bg-white dark:bg-gray-700"
                      autoFocus
                    >
                      <option value="">Select status</option>
                      {statuses.map((status) => (
                        <option key={status.id} value={status.id}>
                          {status.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => saveField('status_id')}
                      disabled={savingField === 'status_id'}
                      className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                      title="Save"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={cancelEditing}
                      disabled={savingField === 'status_id'}
                      className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span 
                      onClick={() => startEditing('status_id', lead.status_id || '')}
                      className="text-sm text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {lead.status?.name || ''}
                    </span>
                    <button
                      onClick={() => startEditing('status_id', lead.status_id || '')}
                      className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-all opacity-0 group-hover:opacity-100"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Source */}
              <div className="flex items-center w-full group">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Source:</span>
                {editingField === 'source_id' ? (
                  <div className="flex items-center gap-2 flex-1">
                    <select
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100 flex-1 w-full min-w-0 h-8 py-0.5 px-2 text-sm rounded-md bg-white dark:bg-gray-700"
                      autoFocus
                    >
                      <option value="">Select source</option>
                      {sources.map((source) => (
                        <option key={source.id} value={source.id}>
                          {source.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => saveField('source_id')}
                      disabled={savingField === 'source_id'}
                      className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                      title="Save"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={cancelEditing}
                      disabled={savingField === 'source_id'}
                      className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span 
                      onClick={() => startEditing('source_id', lead.source_id || '')}
                      className="text-sm text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {lead.source?.name || ''}
                    </span>
                    <button
                      onClick={() => startEditing('source_id', lead.source_id || '')}
                      className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-all opacity-0 group-hover:opacity-100"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                      )}
                    </div>

              {/* Lead Score */}
              <div className="flex items-center w-full group">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Lead Score:</span>
                {editingField === 'lead_score' ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100 flex-1 w-full min-w-0 h-8 py-0.5 px-2 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => saveField('lead_score')}
                      disabled={savingField === 'lead_score'}
                      className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                      title="Save"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={cancelEditing}
                      disabled={savingField === 'lead_score'}
                      className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                        </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span 
                      onClick={() => startEditing('lead_score', lead.lead_score !== undefined ? lead.lead_score.toString() : '')}
                      className="text-sm text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {lead.lead_score !== undefined ? lead.lead_score.toString() : ''}
                    </span>
                    <button
                      onClick={() => startEditing('lead_score', lead.lead_score !== undefined ? lead.lead_score.toString() : '')}
                      className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-all opacity-0 group-hover:opacity-100"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                          </div>
                        )}
                                  </div>

              {/* Assigned To */}
              <div className="flex items-center w-full group">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Assigned To:</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-900 dark:text-gray-100">
                    {lead.assigned_to_user?.username || 'Unassigned'}
                  </span>
                                </div>
                          </div>

              {/* Contact Information */}
              {lead.contact && (
                <>
                  <div className="flex items-center w-full group">
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Contact Name:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        {lead.contact.first_name} {lead.contact.last_name}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center w-full group">
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Email:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        {lead.contact.email || ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center w-full group">
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Phone:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        {lead.contact.phone || ''}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* Notes */}
              <div className="flex items-start col-span-2 w-full group">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0 pt-1">Notes:</span>
                {editingField === 'notes' ? (
                  <div className="flex items-start gap-2 flex-1">
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="flex-1 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex flex-col gap-1 pt-1">
                      <button
                        onClick={() => saveField('notes')}
                        disabled={savingField === 'notes'}
                        className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                        title="Save"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={cancelEditing}
                        disabled={savingField === 'notes'}
                        className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                        title="Cancel"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                      </div>
                    ) : (
                  <div className="flex items-start gap-2">
                    <span 
                      onClick={() => startEditing('notes', lead.notes || '')}
                      className="text-sm text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {lead.notes || ''}
                    </span>
                    <button
                      onClick={() => startEditing('notes', lead.notes || '')}
                      className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-all opacity-0 group-hover:opacity-100 mt-1"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                      </div>
                    )}
              </div>
            </div>
                  </div>

          {/* Vehicle Information Section */}
          {displayListing && (
            <div className="mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-3">
                <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">Vehicle Information</h4>
                {lead.listing_id && (
                  <Button
                    onClick={() => router.push(`/listings/${lead.listing_id}`)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-black border-blue-600 dark:border-blue-500"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View Listing
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                <div className="flex items-center w-full group">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">VIN Number:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900 dark:text-gray-100 uppercase">
                      {displayListing.vin || ''}
                    </span>
                      </div>
                    </div>

                <div className="flex items-center w-full group">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">LPN:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900 dark:text-gray-100 uppercase">
                      {displayListing.lpn || '—'}
                    </span>
                      </div>
                    </div>
                
                <div className="flex items-center w-full group">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Location:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {displayListing.location || ''}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center w-full group">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Price:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {displayListing.price ? `$${formatNumberWithCommas(displayListing.price)}` : ''}
                    </span>
                </div>
              </div>

                <div className="flex items-center w-full group">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Miles:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {displayListing.miles ? formatNumberWithCommas(displayListing.miles) : ''}
                    </span>
                    </div>
                      </div>

                <div className="flex items-center w-full group">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">MMR:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {displayListing.mmr ? formatNumberWithCommas(displayListing.mmr) : ''}
                    </span>
                  </div>
                    </div>
                
                <div className="flex items-center w-full group">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">DOM:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {displayListing.dom || ''}
                    </span>
                      </div>
                  </div>

                <div className="flex items-center w-full group">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Status:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {displayListing.status || displayListing.decision?.status || ''}
                    </span>
                </div>
              </div>

                <div className="flex items-center w-full group">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Score:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {displayListing.score !== undefined ? displayListing.score.toString() : ''}
                      </span>
                    </div>
                  </div>

                <div className="flex items-center w-full group">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Buy Max:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {displayListing.buyMax ? `$${displayListing.buyMax.toLocaleString()}` : ''}
                      </span>
                    </div>
                  </div>

                <div className="flex items-center w-full group">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Interior Color:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {displayListing.interiorColor || ''}
                      </span>
                    </div>
                  </div>
                
                <div className="flex items-center w-full group">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Exterior Color:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {displayListing.exteriorColor || ''}
                    </span>
                </div>
              </div>

                <div className="flex items-center w-full group">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Transmission:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {displayListing.transmission || ''}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center w-full group">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Fuel Type:</span>
                          <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {displayListing.fuelType || ''}
                    </span>
                          </div>
                </div>

                <div className="flex items-center w-full group">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Drivetrain:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {displayListing.driveType || ''}
                          </span>
                        </div>
                  </div>
                
                <div className="flex items-center w-full group">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Engine:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {displayListing.engine || ''}
                        </span>
                      </div>
                    </div>

                <div className="flex items-center w-full group">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Body Style:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {displayListing.bodyStyle || ''}
                    </span>
                  </div>
                </div>

                <div className="flex items-center w-full group">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">MPG:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {displayListing.mpg || ''}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center w-full group">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Overall Rating:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {displayListing.overallRating || ''}
                    </span>
                </div>
              </div>

                <div className="flex items-center w-full group">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Condition:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {displayListing.condition || ''}
                    </span>
                    </div>
                    </div>

                <div className="flex items-center w-full group">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Detailed Ratings:</span>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-wrap gap-2">
                      {displayListing.detailedRatings && displayListing.detailedRatings.length > 0 ? (
                        displayListing.detailedRatings.map((rating, idx) => (
                          <Badge key={idx} color="blue" className="bg-blue-500 dark:bg-blue-600 text-white">{rating}</Badge>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400"></span>
                      )}
                    </div>
                    </div>
                    </div>
                
                <div className="flex items-center w-full group">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Clean Title:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {displayListing.cleanTitle ? 'Yes' : 'No'}
                    </span>
                    </div>
                </div>
                
                <div className="flex items-center w-full group">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Paid Status:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {displayListing.paidStatus || ''}
                    </span>
                  </div>
                </div>

                <div className="flex items-center w-full group">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Seller Name:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {displayListing.sellerName || ''}
                    </span>
                    </div>
                    </div>

                <div className="flex items-center w-full group">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Phone Number:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {displayListing.phoneNumber || ''}
                    </span>
                  </div>
                </div>

                <div className="flex items-center w-full group">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Seller Joined Date:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {displayListing.sellerJoinedDate || ''}
                    </span>
              </div>
                </div>
              </div>

              <div className="flex items-start col-span-2 w-full group">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0 pt-1">Seller Description:</span>
                <div className="flex items-start gap-2">
                  <span className="text-sm text-gray-900 dark:text-gray-100">
                    {displayListing.sellerDescription || ''}
                  </span>
                </div>
              </div>
              <div className="flex items-start col-span-2 w-full group">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0 pt-1">Notes:</span>
                <div className="flex items-start gap-2">
                  <span className="text-sm text-gray-900 dark:text-gray-100">
                    {displayListing.notes || ''}
                  </span>
                </div>
              </div>
            </div>
          )}

        

          {/* Activity Log Timeline */}
          <div className="mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-2">
            <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">Activity Log</h4>
            {activities.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm font-medium">
                No activities yet
                </div>
            ) : (
              <div className="relative">
                {activities.map((activity, index) => (
                  <div key={activity.id} className="relative flex items-start space-x-3 pb-4">
                    {/* Timeline line */}
                    {index < activities.length - 1 && (
                      <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-600"></div>
                    )}
                    {/* Icon */}
                    <div className="relative flex-shrink-0 mt-1 z-10">
                      <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                        <Icon name={getActivityIcon(activity.activity_type)} className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {activity.description || activity.subject || activity.activity_type}
                          </span>
                          <Badge color="green" className="bg-green-500 dark:bg-green-600 text-white">{activity.activity_type}</Badge>
                </div>
                        <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                          {formatDateTime(activity.activity_date || activity.created_at)}
                        </span>
              </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>

          {/* Lead Metadata */}
          <div className="mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-2">
            <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">Lead Information</h4>
            <div className="flex flex-col space-y-2 text-sm">
                <div>
                <span className="font-medium text-gray-800 dark:text-gray-200">Created:</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300 font-medium">
                  {lead.created_at ? formatDateTime(lead.created_at) : ''}
                </span>
                </div>
                <div>
                <span className="font-medium text-gray-800 dark:text-gray-200">Updated:</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300 font-medium">
                  {lead.updated_at ? formatDateTime(lead.updated_at) : ''}
                </span>
                </div>
              {lead.qualified_at && (
                <div>
                  <span className="font-medium text-gray-800 dark:text-gray-200">Qualified:</span>
                  <span className="ml-2 text-gray-700 dark:text-gray-300 font-medium">{formatDateTime(lead.qualified_at)}</span>
                </div>
              )}
              {lead.converted_at && (
                <div>
                  <span className="font-medium text-gray-800 dark:text-gray-200">Converted:</span>
                  <span className="ml-2 text-gray-700 dark:text-gray-300 font-medium">{formatDateTime(lead.converted_at)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end space-x-2 pb-6">
            <Button 
              variant="outline" 
              onClick={() => router.push('/crm/leads')} 
              disabled={saving} 
              className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-black flex items-center gap-2 font-medium">
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

