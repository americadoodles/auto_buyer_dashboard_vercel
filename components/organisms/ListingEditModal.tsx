'use client';

import React, { useState, useEffect } from 'react';
import { Listing, ListingUpdate, Contact, ListingContactLink } from '../../lib/types/listing';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Badge } from '../atoms/Badge';
import { Icon } from '../atoms/Icon';
import { 
  updateListing, 
  getListingContacts, 
  linkContactToListing, 
  unlinkContactFromListing,
  getContacts,
  createContact
} from '../../lib/services/listingManagementApi';
import { X, Plus, User, Phone, Mail, Building, Edit, Trash2, Save } from 'lucide-react';

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
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [availableContacts, setAvailableContacts] = useState<Contact[]>([]);
  const [showContactSearch, setShowContactSearch] = useState(false);
  const [contactSearchTerm, setContactSearchTerm] = useState('');
  const [showNewContactForm, setShowNewContactForm] = useState(false);
  const [newContactData, setNewContactData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
    job_title: '',
    notes: ''
  });

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
      loadListingContacts();
    }
  }, [isOpen, listing]);

  // Load contacts linked to this listing
  const loadListingContacts = async () => {
    try {
      setLoading(true);
      const listingContacts = await getListingContacts(parseInt(listing.id));
      setContacts(listingContacts);
    } catch (error) {
      console.error('Error loading listing contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Search for available contacts
  const searchContacts = async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setAvailableContacts([]);
      return;
    }

    try {
      const results = await getContacts({ search: searchTerm, limit: 10 });
      setAvailableContacts(results);
    } catch (error) {
      console.error('Error searching contacts:', error);
    }
  };

  // Handle form field changes
  const handleFieldChange = (field: keyof ListingUpdate, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Save listing updates
  const handleSave = async () => {
    try {
      setSaving(true);
      const updatedListing = await updateListing(parseInt(listing.id), formData);
      onSave(updatedListing);
      onClose();
    } catch (error) {
      console.error('Error updating listing:', error);
      // You might want to show a toast notification here
    } finally {
      setSaving(false);
    }
  };

  // Link contact to listing
  const handleLinkContact = async (contact: Contact) => {
    try {
      const contactLink: ListingContactLink = {
        contact_id: contact.id,
        relationship_type: 'seller',
        is_primary: contacts.length === 0, // First contact becomes primary
        notes: ''
      };

      await linkContactToListing(parseInt(listing.id), contactLink);
      await loadListingContacts(); // Refresh contacts
      setShowContactSearch(false);
      setContactSearchTerm('');
      setAvailableContacts([]);
    } catch (error) {
      console.error('Error linking contact:', error);
    }
  };

  // Unlink contact from listing
  const handleUnlinkContact = async (contactId: string) => {
    try {
      await unlinkContactFromListing(parseInt(listing.id), contactId);
      await loadListingContacts(); // Refresh contacts
    } catch (error) {
      console.error('Error unlinking contact:', error);
    }
  };

  // Create new contact
  const handleCreateContact = async () => {
    try {
      const newContact = await createContact(newContactData);
      await handleLinkContact(newContact);
      setShowNewContactForm(false);
      setNewContactData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        company: '',
        job_title: '',
        notes: ''
      });
    } catch (error) {
      console.error('Error creating contact:', error);
    }
  };

  if (!isOpen) return null;

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
                    onChange={(e) => handleFieldChange('price', parseFloat(e.target.value))}
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
                    onChange={(e) => handleFieldChange('miles', parseInt(e.target.value))}
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
                  onChange={(e) => handleFieldChange('condition_rating', parseInt(e.target.value))}
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

            {/* Contact Management */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                  Contacts
                </h3>
                <Button
                  onClick={() => setShowContactSearch(true)}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Contact
                </Button>
              </div>

              {/* Linked Contacts */}
              <div className="space-y-2">
                {loading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Loading contacts...</p>
                  </div>
                ) : contacts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <User className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p>No contacts linked to this listing</p>
                  </div>
                ) : (
                  contacts.map((contact) => (
                    <div key={contact.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-gray-900">
                              {contact.first_name} {contact.last_name}
                            </h4>
                            {contact.id === listing.primary_contact_id && (
                              <Badge variant="default" className="text-xs">Primary</Badge>
                            )}
                          </div>
                          
                          <div className="space-y-1 text-sm text-gray-600">
                            {contact.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {contact.email}
                              </div>
                            )}
                            {contact.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {contact.phone}
                              </div>
                            )}
                            {contact.company && (
                              <div className="flex items-center gap-1">
                                <Building className="h-3 w-3" />
                                {contact.company}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <Button
                          onClick={() => handleUnlinkContact(contact.id)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Contact Search Modal */}
              {showContactSearch && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
                    <div className="flex items-center justify-between p-4 border-b">
                      <h3 className="text-lg font-semibold">Add Contact to Listing</h3>
                      <Button onClick={() => setShowContactSearch(false)} variant="outline" size="sm">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                      <div>
                        <Input
                          placeholder="Search contacts..."
                          value={contactSearchTerm}
                          onChange={(e) => {
                            setContactSearchTerm(e.target.value);
                            searchContacts(e.target.value);
                          }}
                        />
                      </div>
                      
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {availableContacts.map((contact) => (
                          <div key={contact.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">{contact.first_name} {contact.last_name}</h4>
                                <p className="text-sm text-gray-600">{contact.email}</p>
                                {contact.company && (
                                  <p className="text-sm text-gray-500">{contact.company}</p>
                                )}
                              </div>
                              <Button
                                onClick={() => handleLinkContact(contact)}
                                variant="outline"
                                size="sm"
                              >
                                Add
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="border-t pt-4">
                        <Button
                          onClick={() => setShowNewContactForm(true)}
                          variant="outline"
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create New Contact
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* New Contact Form */}
              {showNewContactForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
                    <div className="flex items-center justify-between p-4 border-b">
                      <h3 className="text-lg font-semibold">Create New Contact</h3>
                      <Button onClick={() => setShowNewContactForm(false)} variant="outline" size="sm">
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
                            Company
                          </label>
                          <Input
                            value={newContactData.company}
                            onChange={(e) => setNewContactData(prev => ({ ...prev, company: e.target.value }))}
                            placeholder="Enter company"
                          />
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
                          disabled={!newContactData.first_name || !newContactData.last_name}
                          className="flex-1"
                        >
                          Create & Link Contact
                        </Button>
                        <Button
                          onClick={() => setShowNewContactForm(false)}
                          variant="outline"
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
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
    </div>
  );
};
