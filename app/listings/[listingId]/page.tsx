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
  createContact
} from '../../../lib/services/listingManagementApi';
import { LeadCreateModal } from '../../../components/organisms/LeadCreateModal';
import { ImageCarousel } from '../../../components/organisms/ImageCarousel';
import { leadsApi } from '../../../lib/services/leadsApi';
import { Lead } from '../../../lib/types/lead';
import { ListingActivity } from '../../../lib/types/listing';
import { ArrowLeft, Plus, Upload, X, Save } from 'lucide-react';
import { useToast } from '../../../hooks/useToast';

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
  const [isLeadCreateOpen, setIsLeadCreateOpen] = useState(false);
  const [isCreateContactOpen, setIsCreateContactOpen] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [newContactData, setNewContactData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    mobile: '',
    company: '',
    job_title: '',
    notes: ''
  });
  const [creatingContact, setCreatingContact] = useState(false);
  const [hasExistingContact, setHasExistingContact] = useState(false);
  const [lead, setLead] = useState<Lead | null>(null);

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
          notes: listingData.notes || '',
          condition_rating: listingData.condition_rating || undefined,
          interior_color: listingData.interior_color || '',
          exterior_color: listingData.exterior_color || '',
          transmission: listingData.transmission || '',
          fuel_type: listingData.fuel_type || '',
          drivetrain: listingData.drivetrain || '',
          engine_size: listingData.engine_size || '',
          body_style: listingData.body_style || '',
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

  // Create new contact
  const handleCreateContact = async () => {
    if (!newContactData.first_name || !newContactData.last_name) {
      showError('Validation Error', 'First name and last name are required');
      return;
    }

    try {
      setCreatingContact(true);
      await createContact(newContactData);
      setIsCreateContactOpen(false);
      setNewContactData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        mobile: '',
        company: '',
        job_title: '',
        notes: ''
      });
      showSuccess('Contact Created', 'Contact has been successfully created');
    } catch (error) {
      console.error('Error creating contact:', error);
      showError('Failed to create contact', 'Please try again.');
    } finally {
      setCreatingContact(false);
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
            <Button
              onClick={() => setIsLeadCreateOpen(true)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white border-0 shadow-md font-semibold"
            >
              <Plus className="h-4 w-4" />
              {hasExistingContact ? 'Update Contact' : 'Create Contact'}
            </Button>
          </div>

          {/* Edit Fields Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-3">Vehicle Information</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  VIN Number
                </label>
                <Input
                  value={formData.vin || ''}
                  onChange={(e) => handleFieldChange('vin', e.target.value)}
                  placeholder="Enter VIN number"
                  className="uppercase border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  Location
                </label>
                <Input
                  value={formData.location || ''}
                  onChange={(e) => handleFieldChange('location', e.target.value)}
                  placeholder="Enter location"
                  className="border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  Price
                </label>
                <Input
                  type="text"
                  value={formatNumberWithCommas(formData.price)}
                  onChange={(e) => {
                    const value = e.target.value;
                    const parsed = parseNumberFromFormatted(value);
                    handleFieldChange('price', parsed);
                  }}
                  placeholder="Enter price"
                  className="border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  Miles
                </label>
                <Input
                  type="text"
                  value={formatNumberWithCommas(formData.miles)}
                  onChange={(e) => {
                    const value = e.target.value;
                    const parsed = parseIntFromFormatted(value);
                    handleFieldChange('miles', parsed);
                  }}
                  placeholder="Enter miles"
                  className="border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  MMR (Manheim Market Report)
                </label>
                <Input
                  type="text"
                  value={formatNumberWithCommas(formData.mmr)}
                  onChange={(e) => {
                    const value = e.target.value;
                    const parsed = parseNumberFromFormatted(value);
                    handleFieldChange('mmr', parsed);
                  }}
                  placeholder="Enter MMR value"
                  className="border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  Condition Rating (1-5)
                </label>
                <select
                  value={formData.condition_rating || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    handleFieldChange('condition_rating', value === '' ? undefined : parseInt(value));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select condition</option>
                  <option value="1">1 - Poor</option>
                  <option value="2">2 - Fair</option>
                  <option value="3">3 - Good</option>
                  <option value="4">4 - Very Good</option>
                  <option value="5">5 - Excellent</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  Interior Color
                </label>
                <Input
                  value={formData.interior_color || ''}
                  onChange={(e) => handleFieldChange('interior_color', e.target.value)}
                  placeholder="e.g., Black, Tan"
                  className="border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  Exterior Color
                </label>
                <Input
                  value={formData.exterior_color || ''}
                  onChange={(e) => handleFieldChange('exterior_color', e.target.value)}
                  placeholder="e.g., White, Silver"
                  className="border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  Transmission
                </label>
                <select
                  value={formData.transmission || ''}
                  onChange={(e) => handleFieldChange('transmission', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select transmission</option>
                  <option value="Automatic">Automatic</option>
                  <option value="Manual">Manual</option>
                  <option value="CVT">CVT</option>
                  <option value="Semi-Automatic">Semi-Automatic</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  Fuel Type
                </label>
                <select
                  value={formData.fuel_type || ''}
                  onChange={(e) => handleFieldChange('fuel_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select fuel type</option>
                  <option value="Gasoline">Gasoline</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="Electric">Electric</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  Drivetrain
                </label>
                <select
                  value={formData.drivetrain || ''}
                  onChange={(e) => handleFieldChange('drivetrain', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select drivetrain</option>
                  <option value="FWD">Front Wheel Drive</option>
                  <option value="RWD">Rear Wheel Drive</option>
                  <option value="AWD">All Wheel Drive</option>
                  <option value="4WD">Four Wheel Drive</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  Engine Size
                </label>
                <Input
                  value={formData.engine_size || ''}
                  onChange={(e) => handleFieldChange('engine_size', e.target.value)}
                  placeholder="e.g., 2.0L, 3.5L"
                  className="border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  Body Style
                </label>
                <select
                  value={formData.body_style || ''}
                  onChange={(e) => handleFieldChange('body_style', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select body style</option>
                  <option value="Sedan">Sedan</option>
                  <option value="SUV">SUV</option>
                  <option value="Truck">Truck</option>
                  <option value="Coupe">Coupe</option>
                  <option value="Convertible">Convertible</option>
                  <option value="Hatchback">Hatchback</option>
                  <option value="Wagon">Wagon</option>
                  <option value="Van">Van</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => handleFieldChange('notes', e.target.value)}
                placeholder="Additional notes about this vehicle..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                rows={3}
              />
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
                          {formatDate(activity.created_at)}
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
                    className="ml-2 text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium"
                  >
                    {listing.source}
                  </a>
                ) : (
                  <span className="ml-2 text-gray-600 dark:text-gray-400 font-medium">N/A</span>
                )}
              </div>
              <div>
                <span className="font-medium text-gray-800 dark:text-gray-200">DOM:</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300 font-medium">{listing.dom ? listing.dom.toLocaleString('en-US') : 'N/A'} days</span>
              </div>
              <div>
                <span className="font-medium text-gray-800 dark:text-gray-200">Buyer:</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300 font-medium">{listing.buyer_username || 'N/A'}</span>
              </div>
              {listing.created_at && (
                <div>
                  <span className="font-medium text-gray-800 dark:text-gray-200">Created:</span>
                  <span className="ml-2 text-gray-700 dark:text-gray-300 font-medium">{formatDate(listing.created_at)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end space-x-2 pb-6">
            <Button variant="outline" onClick={() => router.push('/listings')} disabled={saving} className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white flex items-center gap-2 font-medium">
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

      {/* Create Lead Modal */}
      <LeadCreateModal
        isOpen={isLeadCreateOpen}
        onClose={() => setIsLeadCreateOpen(false)}
        listingId={parseInt(listingId)}
        onCreated={async () => {
          setIsLeadCreateOpen(false);
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
        }}
      />

      {/* Create Contact Modal */}
      {isCreateContactOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Create New Contact</h3>
              <Button 
                onClick={() => {
                  setIsCreateContactOpen(false);
                  setNewContactData({
                    first_name: '',
                    last_name: '',
                    email: '',
                    phone: '',
                    mobile: '',
                    company: '',
                    job_title: '',
                    notes: ''
                  });
                }} 
                variant="outline" 
                size="sm"
                className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    First Name *
                  </label>
                  <Input
                    value={newContactData.first_name}
                    onChange={(e) => setNewContactData(prev => ({ ...prev, first_name: e.target.value }))}
                    placeholder="Enter first name"
                    className="border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    Last Name *
                  </label>
                  <Input
                    value={newContactData.last_name}
                    onChange={(e) => setNewContactData(prev => ({ ...prev, last_name: e.target.value }))}
                    placeholder="Enter last name"
                    className="border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={newContactData.email}
                    onChange={(e) => setNewContactData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter email"
                    className="border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    Phone
                  </label>
                  <Input
                    value={newContactData.phone}
                    onChange={(e) => setNewContactData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter phone number"
                    className="border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    Mobile
                  </label>
                  <Input
                    value={newContactData.mobile}
                    onChange={(e) => setNewContactData(prev => ({ ...prev, mobile: e.target.value }))}
                    placeholder="Enter mobile number"
                    className="border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    Company
                  </label>
                  <Input
                    value={newContactData.company}
                    onChange={(e) => setNewContactData(prev => ({ ...prev, company: e.target.value }))}
                    placeholder="Enter company"
                    className="border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  Job Title
                </label>
                <Input
                  value={newContactData.job_title}
                  onChange={(e) => setNewContactData(prev => ({ ...prev, job_title: e.target.value }))}
                  placeholder="Enter job title"
                  className="border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  Notes
                </label>
                <textarea
                  value={newContactData.notes}
                  onChange={(e) => setNewContactData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  rows={3}
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleCreateContact}
                  disabled={!newContactData.first_name || !newContactData.last_name || creatingContact}
                  className="flex-1 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white font-medium"
                >
                  {creatingContact ? 'Creating...' : 'Create Contact'}
                </Button>
                <Button
                  onClick={() => {
                    setIsCreateContactOpen(false);
                    setNewContactData({
                      first_name: '',
                      last_name: '',
                      email: '',
                      phone: '',
                      mobile: '',
                      company: '',
                      job_title: '',
                      notes: ''
                    });
                  }}
                  variant="outline"
                  className="flex-1 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  disabled={creatingContact}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

