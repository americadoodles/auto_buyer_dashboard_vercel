'use client';

import React, { useState, useEffect } from 'react';
import { Listing, ListingUpdate } from '../../lib/types/listing';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Badge } from '../atoms/Badge';
import { Icon } from '../atoms/Icon';
import { 
  updateListing,
  createContact
} from '../../lib/services/listingManagementApi';
import { X, Plus, User, Phone, Mail, Building, Edit, Trash2, Save, Upload } from 'lucide-react';
import { LeadCreateModal } from './LeadCreateModal';
import { ImageCarousel } from './ImageCarousel';
import { leadsApi } from '../../lib/services/leadsApi';
import { Lead } from '../../lib/types/lead';
interface ListingEditModalProps {
  listing: Listing;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedListing: Listing) => void;
}

export const ListingEditModal: React.FC<ListingEditModalProps> = ({
  listing,
  isOpen,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState<ListingUpdate>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        vin: listing.vin || '',
        notes: listing.notes || '',
        condition_rating: listing.condition_rating || undefined,
        interior_color: listing.interior_color || '',
        exterior_color: listing.exterior_color || '',
        transmission: listing.transmission || '',
        fuel_type: listing.fuel_type || '',
        drivetrain: listing.drivetrain || '',
        engine_size: listing.engine_size || '',
        body_style: listing.body_style || '',
        price: listing.price,
        miles: listing.miles,
        location: listing.location || ''
      });
      setImages(listing.images || []);
    }
  }, [isOpen, listing]);

  // Check if listing has existing contact information
  useEffect(() => {
    if (!isOpen || !listing.id) return;
    
    const checkExistingContact = async () => {
      try {
        const leads = await leadsApi.getLeads({ limit: 1000 });
        const listingLead = leads.find((lead: Lead) => lead.listing_id === parseInt(listing.id));
        setHasExistingContact(!!(listingLead && listingLead.contact));
      } catch (e) {
        // Silently fail - default to false
        setHasExistingContact(false);
      }
    };
    
    checkExistingContact();
  }, [isOpen, listing.id]);

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
        // Create a FormData object
        const formData = new FormData();
        formData.append('file', file);
        formData.append('listing_id', listing.id);

        // Upload the file
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || '/api'}/listings/${listing.id}/images/upload`, {
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
      alert('Failed to upload images. Please try again.');
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
      
      const updateData: ListingUpdate = {
        ...cleanedFormData,
        images: images  // Always include images array (even if empty) to allow clearing images
      };
      
      console.log('Saving listing with data:', updateData);
      
      const updatedListing = await updateListing(parseInt(listing.id), updateData);
      
      console.log('Listing updated successfully:', updatedListing);
      
      // Notify parent component of the update (this triggers the refresh)
      onSave(updatedListing);
      
      // Close the modal
      onClose();
    } catch (error) {
      console.error('Error updating listing:', error);
      alert(`Failed to save changes: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  // Create new contact
  const handleCreateContact = async () => {
    if (!newContactData.first_name || !newContactData.last_name) {
      alert('First name and last name are required');
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
      alert('Contact created successfully!');
    } catch (error) {
      console.error('Error creating contact:', error);
      alert('Failed to create contact. Please try again.');
    } finally {
      setCreatingContact(false);
    }
  };

  if (!isOpen) return null;

  const handleScrollToImages = () => {
    const imagesSection = document.getElementById('images-section');
    if (imagesSection) {
      imagesSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Edit Listing: {listing.year} {listing.make} {listing.model}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              VIN: {listing.vin || 'Not available'}
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
            {/* Vehicle Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                Vehicle Information
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  VIN Number
                </label>
                <Input
                  value={formData.vin || ''}
                  onChange={(e) => handleFieldChange('vin', e.target.value)}
                  placeholder="Enter VIN number"
                  className="uppercase"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price
                  </label>
                  <Input
                    type="number"
                    value={formData.price || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      handleFieldChange('price', value === '' ? undefined : parseFloat(value));
                    }}
                    placeholder="Enter price"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Miles
                  </label>
                  <Input
                    type="number"
                    value={formData.miles || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      handleFieldChange('miles', value === '' ? undefined : parseInt(value));
                    }}
                    placeholder="Enter miles"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <Input
                  value={formData.location || ''}
                  onChange={(e) => handleFieldChange('location', e.target.value)}
                  placeholder="Enter location"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Interior Color
                  </label>
                  <Input
                    value={formData.interior_color || ''}
                    onChange={(e) => handleFieldChange('interior_color', e.target.value)}
                    placeholder="e.g., Black, Tan"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Exterior Color
                  </label>
                  <Input
                    value={formData.exterior_color || ''}
                    onChange={(e) => handleFieldChange('exterior_color', e.target.value)}
                    placeholder="e.g., White, Silver"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transmission
                  </label>
                  <select
                    value={formData.transmission || ''}
                    onChange={(e) => handleFieldChange('transmission', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select transmission</option>
                    <option value="Automatic">Automatic</option>
                    <option value="Manual">Manual</option>
                    <option value="CVT">CVT</option>
                    <option value="Semi-Automatic">Semi-Automatic</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fuel Type
                  </label>
                  <select
                    value={formData.fuel_type || ''}
                    onChange={(e) => handleFieldChange('fuel_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Drivetrain
                  </label>
                  <select
                    value={formData.drivetrain || ''}
                    onChange={(e) => handleFieldChange('drivetrain', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select drivetrain</option>
                    <option value="FWD">Front Wheel Drive</option>
                    <option value="RWD">Rear Wheel Drive</option>
                    <option value="AWD">All Wheel Drive</option>
                    <option value="4WD">Four Wheel Drive</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Engine Size
                  </label>
                  <Input
                    value={formData.engine_size || ''}
                    onChange={(e) => handleFieldChange('engine_size', e.target.value)}
                    placeholder="e.g., 2.0L, 3.5L"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Body Style
                </label>
                <select
                  value={formData.body_style || ''}
                  onChange={(e) => handleFieldChange('body_style', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Condition Rating (1-5)
                </label>
                <select
                  value={formData.condition_rating || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    handleFieldChange('condition_rating', value === '' ? undefined : parseInt(value));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select condition</option>
                  <option value="1">1 - Poor</option>
                  <option value="2">2 - Fair</option>
                  <option value="3">3 - Good</option>
                  <option value="4">4 - Very Good</option>
                  <option value="5">5 - Excellent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => handleFieldChange('notes', e.target.value)}
                  placeholder="Additional notes about this vehicle..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                Quick Actions
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setIsLeadCreateOpen(true)}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  {hasExistingContact ? 'Update Contact' : 'Create Contact'}
                </Button>
                {/* <Button
                  onClick={() => setIsCreateContactOpen(true)}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create Contact
                </Button> */}
              </div>
            </div>
          </div>

          {/* Image Carousel at the bottom of the modal */}
            <div id="images-section" className="p-6 border-t border-gray-200 mt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Vehicle Images</h3>
                <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer transition-colors">
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
                          className="w-full h-24 object-cover rounded-md border-2 border-gray-200"
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

      {/* Create Lead Modal */}
      <LeadCreateModal
        isOpen={isLeadCreateOpen}
        onClose={() => setIsLeadCreateOpen(false)}
        listingId={parseInt(listing.id)}
        onCreated={async () => {
          // Lead created successfully
          setIsLeadCreateOpen(false);
        }}
      />

      {/* Create Contact Modal */}
      {isCreateContactOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Create New Contact</h3>
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
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <Input
                    value={newContactData.first_name}
                    onChange={(e) => setNewContactData(prev => ({ ...prev, first_name: e.target.value }))}
                    placeholder="Enter first name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <Input
                    value={newContactData.last_name}
                    onChange={(e) => setNewContactData(prev => ({ ...prev, last_name: e.target.value }))}
                    placeholder="Enter last name"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={newContactData.email}
                    onChange={(e) => setNewContactData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <Input
                    value={newContactData.phone}
                    onChange={(e) => setNewContactData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter phone number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mobile
                  </label>
                  <Input
                    value={newContactData.mobile}
                    onChange={(e) => setNewContactData(prev => ({ ...prev, mobile: e.target.value }))}
                    placeholder="Enter mobile number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company
                  </label>
                  <Input
                    value={newContactData.company}
                    onChange={(e) => setNewContactData(prev => ({ ...prev, company: e.target.value }))}
                    placeholder="Enter company"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Title
                </label>
                <Input
                  value={newContactData.job_title}
                  onChange={(e) => setNewContactData(prev => ({ ...prev, job_title: e.target.value }))}
                  placeholder="Enter job title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={newContactData.notes}
                  onChange={(e) => setNewContactData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleCreateContact}
                  disabled={!newContactData.first_name || !newContactData.last_name || creatingContact}
                  className="flex-1"
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
                  className="flex-1"
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
};
