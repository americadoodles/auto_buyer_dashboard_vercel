'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '../../../components/atoms/Button';
import { Input } from '../../../components/atoms/Input';
import { Icon } from '../../../components/atoms/Icon';
import { Badge } from '../../../components/atoms/Badge';
import { Listing, ListingUpdate } from '../../../lib/types/listing';
import { 
  updateListing,
  getListingDetails,
  getListingActivities,
  getContacts
} from '../../../lib/services/listingManagementApi';
import { ContactEditModal } from '../../../components/organisms/ContactEditModal';
import { LeadCreateModal } from '../../../components/organisms/LeadCreateModal';
import { ImageCarousel } from '../../../components/organisms/ImageCarousel';
import { leadsApi } from '../../../lib/services/leadsApi';
import { Lead } from '../../../lib/types/lead';
import { ListingActivity, Contact } from '../../../lib/types/listing';
import { ArrowLeft, Plus, Upload, X, Save, Edit2, Check } from 'lucide-react';
import { useToast } from '../../../hooks/useToast';
import { formatDateTime } from 'lib/utils/formatters';

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const listingId = params.listingId as string;
  const { showSuccess, showError } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [activities, setActivities] = useState<ListingActivity[]>([]);
  const [formData, setFormData] = useState<ListingUpdate>({});
  const [isCreateContactOpen, setIsCreateContactOpen] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [hasExistingContact, setHasExistingContact] = useState(false);
  const [lead, setLead] = useState<Lead | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [savingField, setSavingField] = useState<string | null>(null);
  const [isCreateLeadFromContactOpen, setIsCreateLeadFromContactOpen] = useState(false);
  // Load listing details
  useEffect(() => {
    if (!listingId) return;
    
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const listingData = await getListingDetails(parseInt(listingId));
        if (!listingData) {
          setError('Listing not found');
          setLoading(false);
          return;
        }
        
        setListing(listingData);
        
        // Initialize form data
        setFormData({
          vin: listingData.vin || '',
          lpn: listingData.lpn || '',
          notes: listingData.notes || '',
          condition_rating: undefined, // condition_rating removed from Listing type
          interior_color: listingData.interiorColor || '',
          exterior_color: listingData.exteriorColor || '',
          transmission: listingData.transmission || '',
          fuel_type: listingData.fuelType || '',
          drivetrain: listingData.driveType || '',
          engine_size: listingData.engine || '',
          body_style: listingData.bodyStyle || '',
          price: listingData.price,
          miles: listingData.miles,
          location: listingData.location || '',
          mmr: listingData.mmr || undefined
        });
        setImages(listingData.images || []);
        
        // Load related data
        const [listingActivities, leadsData] = await Promise.all([
          getListingActivities(parseInt(listingId)).catch(() => []),
          leadsApi.getLeads({ limit: 1000 }).catch(() => [])
        ]);
        setActivities(listingActivities);
        
        // Find lead associated with this listing
        const listingLead = leadsData.find((lead: Lead) => lead.listing_id === parseInt(listingId));
        if (listingLead) {
          setLead(listingLead);
          setHasExistingContact(!!(listingLead && listingLead.contact));
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load listing details');
        showError('Failed to load listing', e?.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [listingId]);

  // Handle form field changes
  const handleFieldChange = (field: keyof ListingUpdate, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

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
    if (!listingId || !listing) return;

    try {
      setSavingField(field);
      
      let updateData: ListingUpdate = {};
      let value: any = editValue;

      // Parse value based on field type
      switch (field) {
        case 'price':
        case 'mmr':
        case 'buyMax':
          value = value ? parseFloat(value.replace(/,/g, '')) : undefined;
          if (isNaN(value)) value = undefined;
          break;
        case 'miles':
        case 'dom':
        case 'score':
          value = value ? parseInt(value.replace(/,/g, ''), 10) : undefined;
          if (isNaN(value)) value = undefined;
          break;
        case 'mpg':
          // MPG is a string field, keep as string
          value = value || undefined;
          break;
        case 'vin':
          value = value.toUpperCase();
          break;
        case 'lpn':
          value = value.toUpperCase();
          break;
        case 'detailed_ratings':
          // Convert comma-separated string to array
          value = value ? value.split(',').map((r: string) => r.trim()).filter((r: string) => r.length > 0) : [];
          break;
        case 'clean_title':
          // Convert Yes/No to boolean
          value = value.toLowerCase() === 'yes' || value.toLowerCase() === 'true';
          break;
        default:
          value = value || undefined;
      }

      // Map field names to API field names
      const apiFieldMap: Record<string, string> = {
        'interior_color': 'interior_color',
        'exterior_color': 'exterior_color',
        'fuel_type': 'fuel_type',
        'drivetrain': 'drivetrain',
        'engine_size': 'engine_size',
        'body_style': 'body_style',
        'overall_rating': 'overall_rating',
        'clean_title': 'clean_title',
        'paid_status': 'paid_status',
        'seller_name': 'seller_name',
        'phone_number': 'phone_number',
        'seller_description': 'seller_description',
        'seller_joined_date': 'seller_joined_date',
        'detailed_ratings': 'detailed_ratings',
        'buyMax': 'buy_max',
      };

      const apiField = apiFieldMap[field] || field;
      updateData[apiField as keyof ListingUpdate] = value;

      const updatedListing = await updateListing(parseInt(listingId), updateData);
      setListing(updatedListing);
      setEditingField(null);
      setEditValue('');
      
      showSuccess('Field Updated', `${field} has been successfully updated`);
      
      // Reload activities after update
      const updatedActivities = await getListingActivities(parseInt(listingId));
      setActivities(updatedActivities);
    } catch (error) {
      console.error('Error updating field:', error);
      showError('Failed to save', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setSavingField(null);
    }
  };

  // Handle image file upload
  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('listing_id', listingId);

        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || '/api'}/listings/${listingId}/images/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth.token')}`,
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload image: ${response.statusText}`);
        }

        const data = await response.json();
        return data.url;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      setImages(prev => [...prev, ...uploadedUrls]);
    } catch (error) {
      console.error('Error uploading images:', error);
      showError('Failed to upload images', 'Please try again.');
    } finally {
      setUploadingImages(false);
    }
  };

  // Remove an image
  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // Save listing updates
  const handleSave = async () => {
    if (!listingId) return;
    
    try {
      setSaving(true);
      
      // Clean up the form data to remove NaN values and empty strings for numbers
      const cleanedFormData: ListingUpdate = { ...formData };
      
      // Handle price - convert to number or undefined
      if (formData.price !== undefined) {
        const priceNum = typeof formData.price === 'string' ? parseFloat(formData.price) : formData.price;
        cleanedFormData.price = isNaN(priceNum) ? undefined : priceNum;
      }
      
      // Handle miles - convert to number or undefined
      if (formData.miles !== undefined) {
        const milesNum = typeof formData.miles === 'string' ? parseInt(formData.miles) : formData.miles;
        cleanedFormData.miles = isNaN(milesNum) ? undefined : milesNum;
      }
      
      // Handle condition_rating - convert to number or undefined
      if (formData.condition_rating !== undefined) {
        const ratingNum = typeof formData.condition_rating === 'string' ? parseInt(formData.condition_rating) : formData.condition_rating;
        cleanedFormData.condition_rating = isNaN(ratingNum) ? undefined : ratingNum;
      }
      
      // Handle mmr - convert to number or undefined
      if (formData.mmr !== undefined) {
        const mmrNum = typeof formData.mmr === 'string' ? parseFloat(formData.mmr) : formData.mmr;
        cleanedFormData.mmr = isNaN(mmrNum) ? undefined : mmrNum;
      }
      
      const updateData: ListingUpdate = {
        ...cleanedFormData,
        images: images  // Always include images array (even if empty) to allow clearing images
      };
      
      const updatedListing = await updateListing(parseInt(listingId), updateData);
      setListing(updatedListing);
      
      showSuccess('Listing Updated', 'Listing has been successfully updated');
      
      // Reload activities after update
      const updatedActivities = await getListingActivities(parseInt(listingId));
      setActivities(updatedActivities);
    } catch (error) {
      console.error('Error updating listing:', error);
      showError('Failed to save changes', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  // Handle lead creation/update success
  const handleLeadCreateSuccess = async () => {
    // Reload lead data
    try {
      const leadsData = await leadsApi.getLeads({ limit: 1000 });
      const listingLead = leadsData.find((lead: Lead) => lead.listing_id === parseInt(listingId));
      if (listingLead) {
        setLead(listingLead);
        setHasExistingContact(!!(listingLead && listingLead.contact));
      }
    } catch (e) {
      console.error('Error reloading lead data:', e);
    }
  };

  // Handle contact save (from ContactEditModal)
  const handleContactSave = (contact: Contact) => {
    // Contact was created/updated successfully
    // You can add any additional logic here if needed
  };

  // Format number with commas
  const formatNumberWithCommas = (value: number | string | undefined): string => {
    if (value === undefined || value === null || value === '') return '';
    const numValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
    if (isNaN(numValue)) return '';
    return numValue.toLocaleString('en-US');
  };

  // Parse number from formatted string (remove commas)
  const parseNumberFromFormatted = (value: string): number | undefined => {
    if (!value || value.trim() === '') return undefined;
    const cleaned = value.replace(/,/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? undefined : parsed;
  };

  // Parse integer from formatted string (remove commas)
  const parseIntFromFormatted = (value: string): number | undefined => {
    if (!value || value.trim() === '') return undefined;
    const cleaned = value.replace(/,/g, '');
    const parsed = parseInt(cleaned, 10);
    return isNaN(parsed) ? undefined : parsed;
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

  if (loading) {
    return (
      <div className="h-full overflow-y-auto bg-white dark:bg-gray-900">
        <div className="p-6 flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <span className="ml-3 text-gray-800 dark:text-gray-200 font-medium">Loading listing details...</span>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="h-full overflow-y-auto bg-white dark:bg-gray-900">
        <div className="p-6">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Listing Not Found</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4 font-medium">{error || 'The listing you are looking for does not exist.'}</p>
            <Button onClick={() => router.push('/listings')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Listings
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 pb-6 flex-shrink-0 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/listings')}
              className="flex items-center space-x-2 border-blue-300 dark:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
            <div className="w-12 h-12 bg-blue-600 dark:bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
              <Icon name="car" className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {listing.year} {listing.make} {listing.model}
              </h1>
            </div>
          </div>
        </div>
        {error && (
          <div className="text-red-700 dark:text-red-400 text-sm bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 p-3 rounded-md mt-4 font-medium">{error}</div>
        )}
      </div>

      {/* Main Content Layout */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Status Badges */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {listing.score !== undefined && (
                <Badge color="blue" className="bg-blue-500 dark:bg-blue-600 text-white font-semibold shadow-sm">
                  Score: {listing.score}
                </Badge>
              )}
              {listing.buyMax && (
                <Badge color="green" className="bg-emerald-500 dark:bg-emerald-600 text-white font-semibold shadow-sm">
                  Buy Max: ${listing.buyMax.toLocaleString()}
                </Badge>
              )}
              {listing.decision?.status && (
                <Badge color="orange" className="bg-orange-500 dark:bg-orange-600 text-white font-semibold shadow-sm">
                  Status: {listing.decision.status}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsCreateContactOpen(true)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-black border-0 shadow-md font-semibold cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                {hasExistingContact ? 'Update Contact' : 'Create Contact'}
              </Button>
              <Button
                onClick={() => setIsCreateLeadFromContactOpen(true)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600 text-black border-0 shadow-md font-semibold cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                {lead && lead.contact ? 'Update Lead' : 'Create Lead'}
              </Button>
            </div>
          </div>

          {/* Edit Fields Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-3">Vehicle Information</h4>
            
            {/* Read-only basic info */}
            <div className="grid grid-cols-4 gap-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-md">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Year</label>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{listing.year}</div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Make</label>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{listing.make}</div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Model</label>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{listing.model}</div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Trim</label>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{listing.trim || ''}</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-x-8 gap-y-1">
              <div className="flex items-center w-full group">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">VIN Number:</span>
                {editingField === 'vin' ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="uppercase border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100 flex-1 w-full min-w-0 h-8 py-0.5 px-2 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => saveField('vin')}
                      disabled={savingField === 'vin'}
                      className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                      title="Save"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={cancelEditing}
                      disabled={savingField === 'vin'}
                      className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span 
                      onClick={() => startEditing('vin', listing.vin || '')}
                      className="text-sm text-gray-900 dark:text-gray-100 uppercase cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {listing.vin || ''}
                    </span>
                    <button
                      onClick={() => startEditing('vin', listing.vin || '')}
                      className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-all opacity-0 group-hover:opacity-100"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex items-center w-full group">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">LPN:</span>
                {editingField === 'lpn' ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="uppercase border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100 flex-1 w-full min-w-0 h-8 py-0.5 px-2 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => saveField('lpn')}
                      disabled={savingField === 'lpn'}
                      className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                      title="Save"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={cancelEditing}
                      disabled={savingField === 'lpn'}
                      className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span 
                      onClick={() => startEditing('lpn', listing.lpn || '')}
                      className="text-sm text-gray-900 dark:text-gray-100 uppercase cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {listing.lpn || '—'}
                    </span>
                    <button
                      onClick={() => startEditing('lpn', listing.lpn || '')}
                      className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-all opacity-0 group-hover:opacity-100"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex items-center w-full group">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Location:</span>
                {editingField === 'location' ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100 flex-1 w-full min-w-0 h-8 py-0.5 px-2 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => saveField('location')}
                      disabled={savingField === 'location'}
                      className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                      title="Save"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={cancelEditing}
                      disabled={savingField === 'location'}
                      className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span 
                      onClick={() => startEditing('location', listing.location || '')}
                      className="text-sm text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {listing.location || ''}
                    </span>
                    <button
                      onClick={() => startEditing('location', listing.location || '')}
                      className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-all opacity-0 group-hover:opacity-100"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex items-center w-full group">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Price:</span>
                {editingField === 'price' ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100 flex-1 w-full min-w-0 h-8 py-0.5 px-2 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => saveField('price')}
                      disabled={savingField === 'price'}
                      className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                      title="Save"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={cancelEditing}
                      disabled={savingField === 'price'}
                      className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span 
                      onClick={() => startEditing('price', listing.price || '')}
                      className="text-sm text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {listing.price ? `$${formatNumberWithCommas(listing.price)}` : ''}
                    </span>
                    <button
                      onClick={() => startEditing('price', listing.price || '')}
                      className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-all opacity-0 group-hover:opacity-100"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex items-center w-full group">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Miles:</span>
                {editingField === 'miles' ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100 flex-1 w-full min-w-0 h-8 py-0.5 px-2 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => saveField('miles')}
                      disabled={savingField === 'miles'}
                      className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                      title="Save"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={cancelEditing}
                      disabled={savingField === 'miles'}
                      className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span 
                      onClick={() => startEditing('miles', listing.miles || '')}
                      className="text-sm text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {listing.miles ? formatNumberWithCommas(listing.miles) : ''}
                    </span>
                    <button
                      onClick={() => startEditing('miles', listing.miles || '')}
                      className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-all opacity-0 group-hover:opacity-100"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center w-full group">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">MMR:</span>
                {editingField === 'mmr' ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100 flex-1 w-full min-w-0 h-8 py-0.5 px-2 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => saveField('mmr')}
                      disabled={savingField === 'mmr'}
                      className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                      title="Save"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={cancelEditing}
                      disabled={savingField === 'mmr'}
                      className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span 
                      onClick={() => startEditing('mmr', listing.mmr || '')}
                      className="text-sm text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {listing.mmr ? formatNumberWithCommas(listing.mmr) : ''}
                    </span>
                    <button
                      onClick={() => startEditing('mmr', listing.mmr || '')}
                      className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-all opacity-0 group-hover:opacity-100"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex items-center w-full group">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">DOM:</span>
                {editingField === 'dom' ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100 flex-1 w-full min-w-0 h-8 py-0.5 px-2 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => saveField('dom')}
                      disabled={savingField === 'dom'}
                      className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                      title="Save"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={cancelEditing}
                      disabled={savingField === 'dom'}
                      className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span 
                      onClick={() => startEditing('dom', listing.dom || '')}
                      className="text-sm text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {listing.dom || ''}
                    </span>
                    <button
                      onClick={() => startEditing('dom', listing.dom || '')}
                      className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-all opacity-0 group-hover:opacity-100"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center w-full group">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Status:</span>
                {editingField === 'status' ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100 flex-1 w-full min-w-0 h-8 py-0.5 px-2 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => saveField('status')}
                      disabled={savingField === 'status'}
                      className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                      title="Save"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={cancelEditing}
                      disabled={savingField === 'status'}
                      className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span 
                      onClick={() => startEditing('status', listing.status || listing.decision?.status || '')}
                      className="text-sm text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {listing.status || listing.decision?.status || ''}
                    </span>
                    <button
                      onClick={() => startEditing('status', listing.status || listing.decision?.status || '')}
                      className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-all opacity-0 group-hover:opacity-100"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex items-center w-full group">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Score:</span>
                {editingField === 'score' ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100 flex-1 w-full min-w-0 h-8 py-0.5 px-2 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => saveField('score')}
                      disabled={savingField === 'score'}
                      className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                      title="Save"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={cancelEditing}
                      disabled={savingField === 'score'}
                      className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span 
                      onClick={() => startEditing('score', listing.score !== undefined ? listing.score.toString() : '')}
                      className="text-sm text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {listing.score !== undefined ? listing.score.toString() : ''}
                    </span>
                    <button
                      onClick={() => startEditing('score', listing.score !== undefined ? listing.score.toString() : '')}
                      className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-all opacity-0 group-hover:opacity-100"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center w-full group">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Buy Max:</span>
                {editingField === 'buyMax' ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100 flex-1 w-full min-w-0 h-8 py-0.5 px-2 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => saveField('buyMax')}
                      disabled={savingField === 'buyMax'}
                      className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                      title="Save"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={cancelEditing}
                      disabled={savingField === 'buyMax'}
                      className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span 
                      onClick={() => startEditing('buyMax', listing.buyMax || '')}
                      className="text-sm text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {listing.buyMax ? `$${listing.buyMax.toLocaleString()}` : ''}
                    </span>
                    <button
                      onClick={() => startEditing('buyMax', listing.buyMax || '')}
                      className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-all opacity-0 group-hover:opacity-100"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center w-full group">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Interior Color:</span>
                {editingField === 'interior_color' ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100 flex-1 w-full min-w-0 h-8 py-0.5 px-2 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => saveField('interior_color')}
                      disabled={savingField === 'interior_color'}
                      className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                      title="Save"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={cancelEditing}
                      disabled={savingField === 'interior_color'}
                      className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span 
                      onClick={() => startEditing('interior_color', listing.interiorColor || '')}
                      className="text-sm text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {listing.interiorColor || ''}
                    </span>
                    <button
                      onClick={() => startEditing('interior_color', listing.interiorColor || '')}
                      className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-all opacity-0 group-hover:opacity-100"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex items-center w-full group">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Exterior Color:</span>
                {editingField === 'exterior_color' ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100 flex-1 w-full min-w-0 h-8 py-0.5 px-2 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => saveField('exterior_color')}
                      disabled={savingField === 'exterior_color'}
                      className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                      title="Save"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={cancelEditing}
                      disabled={savingField === 'exterior_color'}
                      className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span 
                      onClick={() => startEditing('exterior_color', listing.exteriorColor || '')}
                      className="text-sm text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {listing.exteriorColor || ''}
                    </span>
                    <button
                      onClick={() => startEditing('exterior_color', listing.exteriorColor || '')}
                      className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-all opacity-0 group-hover:opacity-100"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center w-full group">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Transmission:</span>
                {editingField === 'transmission' ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100 flex-1 w-full min-w-0 h-8 py-0.5 px-2 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => saveField('transmission')}
                      disabled={savingField === 'transmission'}
                      className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                      title="Save"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={cancelEditing}
                      disabled={savingField === 'transmission'}
                      className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span 
                      onClick={() => startEditing('transmission', listing.transmission || '')}
                      className="text-sm text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {listing.transmission || ''}
                    </span>
                    <button
                      onClick={() => startEditing('transmission', listing.transmission || '')}
                      className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-all opacity-0 group-hover:opacity-100"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex items-center w-full group">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Fuel Type:</span>
                {editingField === 'fuel_type' ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100 flex-1 w-full min-w-0 h-8 py-0.5 px-2 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => saveField('fuel_type')}
                      disabled={savingField === 'fuel_type'}
                      className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                      title="Save"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={cancelEditing}
                      disabled={savingField === 'fuel_type'}
                      className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span 
                      onClick={() => startEditing('fuel_type', listing.fuelType || '')}
                      className="text-sm text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {listing.fuelType || ''}
                    </span>
                    <button
                      onClick={() => startEditing('fuel_type', listing.fuelType || '')}
                      className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-all opacity-0 group-hover:opacity-100"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center w-full group">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Drivetrain:</span>
                {editingField === 'drivetrain' ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100 flex-1 w-full min-w-0 h-8 py-0.5 px-2 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => saveField('drivetrain')}
                      disabled={savingField === 'drivetrain'}
                      className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                      title="Save"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={cancelEditing}
                      disabled={savingField === 'drivetrain'}
                      className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span 
                      onClick={() => startEditing('drivetrain', listing.driveType || '')}
                      className="text-sm text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {listing.driveType || ''}
                    </span>
                    <button
                      onClick={() => startEditing('drivetrain', listing.driveType || '')}
                      className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-all opacity-0 group-hover:opacity-100"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex items-center w-full group">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Engine:</span>
                {editingField === 'engine_size' ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100 flex-1 w-full min-w-0 h-8 py-0.5 px-2 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => saveField('engine_size')}
                      disabled={savingField === 'engine_size'}
                      className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                      title="Save"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={cancelEditing}
                      disabled={savingField === 'engine_size'}
                      className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span 
                      onClick={() => startEditing('engine_size', listing.engine || '')}
                      className="text-sm text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {listing.engine || ''}
                    </span>
                    <button
                      onClick={() => startEditing('engine_size', listing.engine || '')}
                      className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-all opacity-0 group-hover:opacity-100"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center w-full group">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Body Style:</span>
                {editingField === 'body_style' ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100 flex-1 w-full min-w-0 h-8 py-0.5 px-2 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => saveField('body_style')}
                      disabled={savingField === 'body_style'}
                      className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                      title="Save"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={cancelEditing}
                      disabled={savingField === 'body_style'}
                      className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span 
                      onClick={() => startEditing('body_style', listing.bodyStyle || '')}
                      className="text-sm text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {listing.bodyStyle || ''}
                    </span>
                    <button
                      onClick={() => startEditing('body_style', listing.bodyStyle || '')}
                      className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-all opacity-0 group-hover:opacity-100"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center w-full group">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">MPG:</span>
                {editingField === 'mpg' ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100 flex-1 w-full min-w-0 h-8 py-0.5 px-2 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => saveField('mpg')}
                      disabled={savingField === 'mpg'}
                      className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                      title="Save"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={cancelEditing}
                      disabled={savingField === 'mpg'}
                      className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span 
                      onClick={() => startEditing('mpg', listing.mpg || '')}
                      className="text-sm text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {listing.mpg || ''}
                    </span>
                    <button
                      onClick={() => startEditing('mpg', listing.mpg || '')}
                      className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-all opacity-0 group-hover:opacity-100"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex items-center w-full group">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Overall Rating:</span>
                {editingField === 'overall_rating' ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100 flex-1 w-full min-w-0 h-8 py-0.5 px-2 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => saveField('overall_rating')}
                      disabled={savingField === 'overall_rating'}
                      className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                      title="Save"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={cancelEditing}
                      disabled={savingField === 'overall_rating'}
                      className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span 
                      onClick={() => startEditing('overall_rating', listing.overallRating || '')}
                      className="text-sm text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {listing.overallRating || ''}
                    </span>
                    <button
                      onClick={() => startEditing('overall_rating', listing.overallRating || '')}
                      className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-all opacity-0 group-hover:opacity-100"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center w-full group">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Condition:</span>
                {editingField === 'condition' ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100 flex-1 w-full min-w-0 h-8 py-0.5 px-2 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => saveField('condition')}
                      disabled={savingField === 'condition'}
                      className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                      title="Save"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={cancelEditing}
                      disabled={savingField === 'condition'}
                      className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span 
                      onClick={() => startEditing('condition', listing.condition || '')}
                      className="text-sm text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {listing.condition || ''}
                    </span>
                    <button
                      onClick={() => startEditing('condition', listing.condition || '')}
                      className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-all opacity-0 group-hover:opacity-100"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center w-full group">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Detailed Ratings:</span>
                {editingField === 'detailed_ratings' ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      placeholder="Comma-separated ratings"
                      className="border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100 flex-1 w-full min-w-0 h-8 py-0.5 px-2 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => saveField('detailed_ratings')}
                      disabled={savingField === 'detailed_ratings'}
                      className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                      title="Save"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={cancelEditing}
                      disabled={savingField === 'detailed_ratings'}
                      className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div 
                      onClick={() => startEditing('detailed_ratings', listing.detailedRatings ? listing.detailedRatings.join(', ') : '')}
                      className="flex flex-wrap gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      {listing.detailedRatings && listing.detailedRatings.length > 0 ? (
                        listing.detailedRatings.map((rating, idx) => (
                          <Badge key={idx} color="blue" className="bg-blue-500 dark:bg-blue-600 text-white">{rating}</Badge>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400"></span>
                      )}
                    </div>
                    <button
                      onClick={() => startEditing('detailed_ratings', listing.detailedRatings ? listing.detailedRatings.join(', ') : '')}
                      className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-all opacity-0 group-hover:opacity-100"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center w-full group">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Clean Title:</span>
                {editingField === 'clean_title' ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100 flex-1 w-full min-w-0 h-8 py-0.5 px-2 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => saveField('clean_title')}
                      disabled={savingField === 'clean_title'}
                      className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                      title="Save"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={cancelEditing}
                      disabled={savingField === 'clean_title'}
                      className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span 
                      onClick={() => startEditing('clean_title', listing.cleanTitle ? 'Yes' : 'No')}
                      className="text-sm text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {listing.cleanTitle ? 'Yes' : 'No'}
                    </span>
                    <button
                      onClick={() => startEditing('clean_title', listing.cleanTitle ? 'Yes' : 'No')}
                      className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-all opacity-0 group-hover:opacity-100"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex items-center w-full group">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Paid Status:</span>
                {editingField === 'paid_status' ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100 flex-1 w-full min-w-0 h-8 py-0.5 px-2 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => saveField('paid_status')}
                      disabled={savingField === 'paid_status'}
                      className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                      title="Save"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={cancelEditing}
                      disabled={savingField === 'paid_status'}
                      className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span 
                      onClick={() => startEditing('paid_status', listing.paidStatus || '')}
                      className="text-sm text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {listing.paidStatus || ''}
                    </span>
                    <button
                      onClick={() => startEditing('paid_status', listing.paidStatus || '')}
                      className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-all opacity-0 group-hover:opacity-100"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center w-full group">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Seller Name:</span>
                {editingField === 'seller_name' ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100 flex-1 w-full min-w-0 h-8 py-0.5 px-2 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => saveField('seller_name')}
                      disabled={savingField === 'seller_name'}
                      className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                      title="Save"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={cancelEditing}
                      disabled={savingField === 'seller_name'}
                      className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span 
                      onClick={() => startEditing('seller_name', listing.sellerName || '')}
                      className="text-sm text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {listing.sellerName || ''}
                    </span>
                    <button
                      onClick={() => startEditing('seller_name', listing.sellerName || '')}
                      className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-all opacity-0 group-hover:opacity-100"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center w-full group">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Phone Number:</span>
                {editingField === 'phone_number' ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100 flex-1 w-full min-w-0 h-8 py-0.5 px-2 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => saveField('phone_number')}
                      disabled={savingField === 'phone_number'}
                      className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                      title="Save"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={cancelEditing}
                      disabled={savingField === 'phone_number'}
                      className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span 
                      onClick={() => startEditing('phone_number', listing.phoneNumber || '')}
                      className="text-sm text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {listing.phoneNumber || ''}
                    </span>
                    <button
                      onClick={() => startEditing('phone_number', listing.phoneNumber || '')}
                      className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-all opacity-0 group-hover:opacity-100"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>       

              <div className="flex items-center w-full group">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Seller Joined Date:</span>
                {editingField === 'seller_joined_date' ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100 flex-1 w-full min-w-0 h-8 py-0.5 px-2 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => saveField('seller_joined_date')}
                      disabled={savingField === 'seller_joined_date'}
                      className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                      title="Save"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={cancelEditing}
                      disabled={savingField === 'seller_joined_date'}
                      className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span 
                      onClick={() => startEditing('seller_joined_date', listing.sellerJoinedDate || '')}
                      className="text-sm text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {listing.sellerJoinedDate || ''}
                    </span>
                    <button
                      onClick={() => startEditing('seller_joined_date', listing.sellerJoinedDate || '')}
                      className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-all opacity-0 group-hover:opacity-100"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center w-full group">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Radius:</span>
                {editingField === 'radius' ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100 flex-1 w-full min-w-0 h-8 py-0.5 px-2 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => saveField('radius')}
                      disabled={savingField === 'radius'}
                      className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                      title="Save"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={cancelEditing}
                      disabled={savingField === 'radius'}
                      className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span 
                      onClick={() => startEditing('radius', listing.radius || '')}
                      className="text-sm text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {listing.radius || ''}
                    </span>
                    <button
                      onClick={() => startEditing('radius', listing.radius || '')}
                      className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-all opacity-0 group-hover:opacity-100"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-start col-span-2 w-full group">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-32 flex-shrink-0">Seller Description:</span>
                {editingField === 'seller_description' ? (
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
                        onClick={() => saveField('seller_description')}
                        disabled={savingField === 'seller_description'}
                        className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                        title="Save"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={cancelEditing}
                        disabled={savingField === 'seller_description'}
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
                      onClick={() => startEditing('seller_description', listing.sellerDescription || '')}
                      className="text-sm text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {listing.sellerDescription || ''}
                    </span>
                    <button
                      onClick={() => startEditing('seller_description', listing.sellerDescription || '')}
                      className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-all opacity-0 group-hover:opacity-100 mt-1"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
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
                      onClick={() => startEditing('notes', listing.notes || '')}
                      className="text-sm text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {listing.notes || ''}
                    </span>
                    <button
                      onClick={() => startEditing('notes', listing.notes || '')}
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

          {/* Image Carousel Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100">Vehicle Images</h4>
              <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 cursor-pointer transition-colors font-medium">
                <Upload className="h-4 w-4" />
                {uploadingImages ? 'Uploading...' : 'Upload Images'}
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e.target.files)}
                  disabled={uploadingImages}
                />
              </label>
            </div>
            
            {images.length > 0 ? (
              <div className="space-y-4">
                <ImageCarousel images={images} />
                <div className="grid grid-cols-4 gap-2 mt-4">
                  {images.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={image}
                        alt={`Vehicle image ${index + 1}`}
                        className="w-full h-24 object-cover rounded-md border-2 border-gray-200 dark:border-gray-600"
                      />
                      <button
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove image"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <ImageCarousel images={[]} />
            )}
          </div>

          {/* Activity Log Timeline */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-2">
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
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                        <Icon name={getActivityIcon(activity.activity_type)} className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {activity.description || activity.activity_type}
                          </span>
                          <Badge color="blue" className="bg-blue-500 dark:bg-blue-600 text-white">{activity.activity_type}</Badge>
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                          {formatDateTime(activity.created_at)}
                        </span>
                      </div>
                      {activity.field_name && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 font-medium">
                          {activity.field_name}: {activity.old_value} → {activity.new_value}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Listing Metadata */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-2">
            <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">Listing Information</h4>
            <div className="flex flex-col space-y-2 text-sm">
              <div>
                <span className="font-medium text-gray-800 dark:text-gray-200">Source:</span>
                {listing.source ? (
                  <a
                    href={`/listings/source/${encodeURIComponent(listing.source)}`}
                    className="ml-2 text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium break-words"
                  >
                    <span className="break-words break-all">{listing.source}</span>
                  </a>
                ) : (
                  <span className="ml-2 text-gray-600 dark:text-gray-400 font-medium"></span>
                )}
              </div>
              <div>
                <span className="font-medium text-gray-800 dark:text-gray-200">DOM:</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300 font-medium">{listing.dom ? listing.dom.toLocaleString('en-US') : ''} days</span>
              </div>
              <div>
                <span className="font-medium text-gray-800 dark:text-gray-200">Buyer:</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300 font-medium">{listing.buyer_username || ''}</span>
              </div>
              <div>
                <span className="font-medium text-gray-800 dark:text-gray-200">Updated:</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300 font-medium">
                  {listing.updated_at ? formatDateTime(listing.updated_at) : ''}
                </span>
              </div>
              {listing.created_at && (
                <div>
                  <span className="font-medium text-gray-800 dark:text-gray-200">Created:</span>
                  <span className="ml-2 text-gray-700 dark:text-gray-300 font-medium">{formatDateTime(listing.created_at)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end space-x-2 pb-6">
            <Button variant="outline" onClick={() => router.push('/listings')} disabled={saving} className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
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

      {/* Create Lead from Contact Modal */}
      <LeadCreateModal
        isOpen={isCreateLeadFromContactOpen}
        onClose={() => setIsCreateLeadFromContactOpen(false)}
        listingId={parseInt(listingId)}
        existingLead={lead}
        onSuccess={handleLeadCreateSuccess}
      />

      {/* Create/Edit Contact Modal */}
      <ContactEditModal
        contact={lead?.contact || null}
        isOpen={isCreateContactOpen}
        onClose={() => setIsCreateContactOpen(false)}
        onSave={handleContactSave}
      />
    </div>
  );
}

