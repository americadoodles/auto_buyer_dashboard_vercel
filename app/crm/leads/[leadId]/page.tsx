'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
import { CallModal } from '../../../../components/organisms/CallModal';
import { SMSModal } from '../../../../components/organisms/SMSModal';
import { VehiclePhotoGallery } from '../../../../components/organisms/VehiclePhotoGallery';
import { VehicleHeader } from '../../../../components/organisms/VehicleHeader';
import { MMRCard } from '../../../../components/organisms/MMRCard';
import { VehicleDetails } from '../../../../components/molecules/VehicleDetails';
import { LeadInformation } from '../../../../components/molecules/LeadInformation';
import { CompactAutocheckSection } from '../../../../components/organisms/CompactAutocheckSection';
import { CompactCarfaxSection } from '../../../../components/organisms/CompactCarfaxSection';
import { AccuTradeDataSection } from '../../../../components/organisms/AccuTradeDataSection';
import { ChatBox } from '../../../../components/organisms/ChatBox';
import { ArrowLeft, ExternalLink, Check, X, Edit2, Save } from 'lucide-react';
import { useToast } from '../../../../hooks/useToast';
import { formatDateTime } from '../../../../lib/utils/formatters';
import { ApiService } from '../../../../lib/services/api';
import { useAccuTradeData } from '../../../../lib/hooks/useAccuTradeData';
import { useMMRData } from '../../../../lib/hooks/useMMRData';
import { ACCU_TRADE_BASE_URL } from '../../../../lib/constants/url';

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
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [isSMSModalOpen, setIsSMSModalOpen] = useState(false);
  const [mmrData, setMmrData] = useState<any>(null);
  const [accuTradeData, setAccuTradeData] = useState<any>(null);

  // Refs and state for equalizing first and second column heights (no scrollbar)
  const col1ContentRef = useRef<HTMLDivElement>(null);
  const col2ContentRef = useRef<HTMLDivElement>(null);
  const [row1MinHeight, setRow1MinHeight] = useState<number | undefined>(undefined);
  const [col1Padding, setCol1Padding] = useState<{ top: number; bottom: number }>({ top: 0, bottom: 0 });
  const [col2Padding, setCol2Padding] = useState<{ top: number; bottom: number }>({ top: 0, bottom: 0 });
  
  // Related data
  const { statuses, loading: statusesLoading } = useLeadStatuses();
  const { sources, loading: sourcesLoading } = useLeadSources();

  // Use the full listing details if available, otherwise fall back to nested listing
  const displayListing = listing || lead?.listing;

  // Equalize first and second column heights: add top/bottom padding to the shorter column so both match, no scrollbar
  useLayoutEffect(() => {
    if (!displayListing) return;
    const el1 = col1ContentRef.current;
    const el2 = col2ContentRef.current;
    if (!el1 || !el2) return;

    const measure = () => {
      const h1 = el1.scrollHeight;
      const h2 = el2.scrollHeight;
      const target = Math.max(h1, h2);
      setRow1MinHeight(target);

      if (h2 > h1) {
        // Keep image at top: put all extra space at bottom
        setCol1Padding({ top: 0, bottom: Math.round(h2 - h1) });
        setCol2Padding({ top: 0, bottom: 0 });
      } else if (h1 > h2) {
        setCol1Padding({ top: 0, bottom: 0 });
        const pad = (h1 - h2) / 2;
        setCol2Padding({ top: Math.round(pad), bottom: Math.round(pad) });
      } else {
        setCol1Padding({ top: 0, bottom: 0 });
        setCol2Padding({ top: 0, bottom: 0 });
      }
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el1);
    ro.observe(el2);
    return () => ro.disconnect();
  }, [displayListing, lead, mmrData, accuTradeData, listing]);

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


  // Save a single field (for LeadInformation component)
  const handleFieldSave = async (field: string, value: any) => {
    if (!leadId || !lead) return;

    try {
      // Check if this is a contact field
      const contactFields = ['first_name', 'last_name', 'email', 'phone', 'mobile', 'company', 'job_title'];
      
      if (contactFields.includes(field) && lead.contact_id) {
        // Update contact information
        const updatedContact = await updateContact(lead.contact_id, {
          [field]: value
        });
        
        // Reload lead to get updated contact information
        const updatedLead = await leadsApi.getLead(leadId);
        setLead(updatedLead);
        
        // Reload activities after update
        const updatedActivities = await leadsApi.getLeadActivities(leadId).catch(() => []);
        setActivities(updatedActivities);
        
        showSuccess('Field Updated', `${field} has been successfully updated`);
      } else {
        // Update lead information
        const updatedLead = await leadsApi.updateLead(leadId, {
          [field]: value
        });
        
        setLead(updatedLead);
        
        // Reload activities after update
        const updatedActivities = await leadsApi.getLeadActivities(leadId).catch(() => []);
        setActivities(updatedActivities);
        
        showSuccess('Field Updated', `${field} has been successfully updated`);
      }
    } catch (error) {
      console.error('Error updating field:', error);
      showError('Failed to save', error instanceof Error ? error.message : 'Unknown error');
      throw error; // Re-throw so component can handle it
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
          mobile: lead.contact?.mobile || undefined,
          job_title: lead.contact?.job_title || undefined
        });
      }
      
      // Update lead information
      await leadsApi.updateLead(leadId, {
        status_id: lead?.status_id,
        source_id: lead?.source_id,
        notes: lead?.notes,
        lead_score: lead?.lead_score
      });
      
      // Refetch full lead so we keep nested contact, listing, status, source (API may return only lead row)
      const fullLead = await leadsApi.getLead(leadId);
      setLead(fullLead);
      
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
          <span className="ml-3 text-black dark:text-gray-200 font-medium">Loading lead details...</span>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="h-full overflow-y-auto bg-white dark:bg-gray-900">
        <div className="p-6">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-black dark:text-gray-100 mb-2">Lead Not Found</h2>
            <p className="text-black dark:text-gray-300 mb-2 font-medium">{error || 'The lead you are looking for does not exist.'}</p>
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
    <div className="h-full flex flex-col bg-white dark:bg-[#0f1117]">
      {/* Main Content Layout - no page scroll; columns scroll internally */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-white dark:bg-[#0f1117]">
        <div className="max-w-[1800px] mx-auto px-4 py-4 flex-1 flex flex-col min-h-0 w-full">
          {/* Status Badges */}
          <div className="flex items-center justify-between mb-2 flex-shrink-0">
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
                className="flex items-center gap-2 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white dark:text-white border-0 shadow-md font-semibold cursor-pointer"
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

          {/* One wrapper with two divs: left (gallery + vehicle/lead + chat), right (AccuTrade) */}
          {displayListing ? (
            <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 min-w-0">
              {/* Left div: gallery + vehicle/lead (top) and chat (bottom) */}
              <div className="flex flex-col flex-1 lg:flex-[2] min-h-0 min-w-0 gap-2">
                {/* Top: gallery and vehicle/lead side by side (sized to content, no extra space below) */}
                <div
                  className="flex flex-none min-h-0 gap-4"
                  style={
                    row1MinHeight !== undefined
                      ? { minHeight: row1MinHeight }
                      : undefined
                  }
                >
                    <div ref={col1ContentRef} className="flex flex-col flex-1 min-h-0 min-w-0 h-full">
                      {displayListing.images && displayListing.images.length > 0 && (
                        <VehiclePhotoGallery images={displayListing.images} className="flex-1 min-h-0 h-full" />
                      )}
                    </div>
                  <div ref={col2ContentRef} className="flex flex-col flex-1 space-y-2 min-h-0 min-w-0">
                {/* Vehicle Header */}
                <VehicleHeader
                  year={displayListing.year}
                  make={displayListing.make}
                  model={displayListing.model}
                  trim={displayListing.trim || undefined}
                  miles={displayListing.miles || undefined}
                  vin={displayListing.vin || undefined}
                  price={displayListing.price || undefined}
                  source={displayListing.source || undefined}
                  listingId={lead?.listing_id || undefined}
                  hasAutoCheck={false}
                  hasCarfax={false}
                  hasMMR={hasMMRData || false}
                  hasAccuTrade={hasAccuTradeData || false}
                />

                {/* Vehicle Details */}
                {displayListing && <VehicleDetails listing={displayListing} />}

                {/* Lead Information */}
                <LeadInformation
                  lead={lead}
                  statuses={statuses}
                  sources={sources}
                  onFieldSave={handleFieldSave}
                  onSaveAll={handleSave}
                  saving={saving}
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
                </div>
                {/* Bottom: chat box */}
                <div className="flex flex-col flex-1 min-h-[280px] overflow-hidden">
                  <ChatBox
                    contactId={lead?.contact_id || null}
                    contactName={lead?.contact ? `${lead.contact.first_name} ${lead.contact.last_name}`.trim() : 'Contact'}
                    phone={lead?.contact?.mobile || lead?.contact?.phone}
                    onSent={() => leadsApi.getLeadActivities(leadId).then(setActivities).catch(() => {})}
                    onCallClick={() => setIsCallModalOpen(true)}
                    className="h-full min-h-[280px]"
                  />
                </div>
              </div>

              {/* Right div: AccuTrade */}
              <div className="flex flex-col flex-1 min-h-0 min-w-0">
                <div className="flex-1 flex flex-col min-h-0 min-w-0">
                  <div className="space-y-4 flex-1 flex flex-col min-h-0">
                    {displayListing.vin && (
                      <>
                        {hasAccuTradeData && accuTradeData ? (
                          <AccuTradeDataSection 
                            accuTradeData={accuTradeData}
                            vin={displayListing.vin}
                            hasAccuTradeData={hasAccuTradeData}
                            sellerName={displayListing.sellerName || undefined}
                            askingPrice={displayListing.price || undefined}
                            suggestedPrice={displayListing.buyMax || undefined}
                          />
                        ) : (
                          <div className="bg-white dark:bg-[#1a1d29] border border-gray-200 dark:border-gray-700/50 rounded-lg p-5">
                            <h3 className="text-black dark:text-white font-semibold mb-2">AccuTrade Data</h3>
                            <p className="text-sm text-black dark:text-gray-400 mb-2">
                              No AccuTrade data found for VIN: {displayListing.vin}
                            </p>
                            <Button
                              onClick={() => {
                                const accuTradeUrl = `${ACCU_TRADE_BASE_URL}=${encodeURIComponent(displayListing.vin!)}`;
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
              </div>
            </div>
          ) : null}
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

