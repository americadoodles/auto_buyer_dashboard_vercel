'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Icon } from '../atoms/Icon';
import { Badge } from '../atoms/Badge';
import { X } from 'lucide-react';
import { getContacts } from '../../lib/services/listingManagementApi';
import { leadsApi } from '../../lib/services/leadsApi';
import { Contact, Listing } from '../../lib/types/listing';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../app/auth/useAuth';
import { useLeadStatuses } from '../../lib/hooks/useLeads';
import { useListings } from '../../lib/hooks/useListings';

interface LeadCreateWithSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const LeadCreateWithSelectionModal: React.FC<LeadCreateWithSelectionModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { showSuccess, showError } = useToast();
  const { user } = useAuth();
  const { statuses: leadStatuses } = useLeadStatuses();
  const { data: listings, loading: listingsLoading } = useListings();
  
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string | undefined>(undefined);
  const [selectedListingId, setSelectedListingId] = useState<string | undefined>(undefined);
  const [contactSearch, setContactSearch] = useState<string>('');
  const [listingSearch, setListingSearch] = useState<string>('');
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [creatingLead, setCreatingLead] = useState(false);
  const [activeTab, setActiveTab] = useState<'contact' | 'listing'>('contact');

  // Load contacts when modal opens
  useEffect(() => {
    if (!isOpen) return;
    
    const loadContacts = async () => {
      setLoadingContacts(true);
      try {
        const contactsData = await getContacts({ limit: 1000, is_active: true });
        setContacts(contactsData);
      } catch (error) {
        console.error('Error loading contacts:', error);
        showError('Failed to load contacts', 'Please try again.');
      } finally {
        setLoadingContacts(false);
      }
    };
    
    loadContacts();
  }, [isOpen, showError]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedContactId(undefined);
      setSelectedListingId(undefined);
      setContactSearch('');
      setListingSearch('');
      setActiveTab('contact');
    }
  }, [isOpen]);

  // Filter contacts based on search
  const filteredContacts = contacts.filter(contact => {
    if (!contactSearch.trim()) return true;
    const searchLower = contactSearch.toLowerCase();
    return (
      contact.first_name.toLowerCase().includes(searchLower) ||
      contact.last_name.toLowerCase().includes(searchLower) ||
      contact.email?.toLowerCase().includes(searchLower) ||
      contact.phone?.includes(searchLower) ||
      contact.company?.toLowerCase().includes(searchLower)
    );
  });

  // Filter listings based on search and exclude listings with contact_id
  const filteredListings = listings.filter(listing => {
    // Exclude listings that already have a contact_id
    if (listing.contact_id) return false;
    
    if (!listingSearch.trim()) return true;
    const searchLower = listingSearch.toLowerCase();
    return (
      listing.vin?.toLowerCase().includes(searchLower) ||
      listing.make?.toLowerCase().includes(searchLower) ||
      listing.model?.toLowerCase().includes(searchLower) ||
      listing.year?.toString().includes(searchLower) ||
      listing.location?.toLowerCase().includes(searchLower)
    );
  });

  // Create lead from selected contact and listing
  const handleCreateLead = async () => {
    if (!selectedContactId) {
      showError('Validation Error', 'Please select a contact');
      return;
    }

    if (!selectedListingId) {
      showError('Validation Error', 'Please select a listing');
      return;
    }

    try {
      setCreatingLead(true);
      
      // Find the "new" status
      const newStatus = leadStatuses.find(
        status => status.name.toLowerCase() === 'new'
      );
      
      await leadsApi.createLead({
        contact_id: selectedContactId,
        listing_id: selectedListingId ? parseInt(selectedListingId) : undefined,
        status_id: newStatus?.id,
        lead_score: 0,
        vehicle_interest: {},
        budget_range: {},
        assigned_to: user?.id ?? '',
        created_by: user?.id ?? '',
      });

      showSuccess('Lead Created', 'Lead has been successfully created');

      // Reset state
      setSelectedContactId(undefined);
      setSelectedListingId(undefined);
      setContactSearch('');
      setListingSearch('');
      
      // Call success callback
      if (onSuccess) {
        onSuccess();
      }
      
      // Close modal
      onClose();
    } catch (error) {
      console.error('Error creating lead:', error);
      showError('Failed to create lead', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setCreatingLead(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-5xl w-full max-h-[85vh] flex flex-col border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-black dark:text-gray-100">
            Create New Lead
          </h3>
          <Button 
            onClick={onClose} 
            variant="outline" 
            size="sm"
            className="border-gray-300 dark:border-gray-600 text-black dark:text-gray-300 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('contact')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'contact'
                  ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Select Contact
              {selectedContactId && (
                <Badge color="blue" className="ml-2 bg-blue-500 dark:bg-blue-600 text-white">Selected</Badge>
              )}
            </button>
            <button
              onClick={() => setActiveTab('listing')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'listing'
                  ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Select Listing
              {selectedListingId && (
                <Badge color="blue" className="ml-2 bg-blue-500 dark:bg-blue-600 text-white">Selected</Badge>
              )}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'contact' ? (
              <>
                {/* Contact Search */}
                <div className="mb-4">
                  <Input
                    type="text"
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    placeholder="Search contacts by name, email, phone, or company..."
                    className="w-full border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-black dark:text-gray-100"
                  />
                </div>

                {/* Contacts List */}
                {loadingContacts ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
                    <span className="ml-3 text-black dark:text-gray-200 font-medium">Loading contacts...</span>
                  </div>
                ) : filteredContacts.length === 0 ? (
                  <div className="text-center py-8 text-black dark:text-gray-400 text-sm font-medium">
                    {contactSearch ? 'No contacts found matching your search' : 'No contacts available'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredContacts.map((contact) => (
                      <div
                        key={contact.id}
                        onClick={() => setSelectedContactId(contact.id)}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedContactId === contact.id
                            ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30'
                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-black dark:text-gray-100">
                                {contact.first_name} {contact.last_name}
                              </span>
                              {selectedContactId === contact.id && (
                                <Badge color="blue" className="bg-blue-500 dark:bg-blue-600 text-white">Selected</Badge>
                              )}
                            </div>
                            <div className="text-sm text-black dark:text-gray-400 space-y-1">
                              {contact.email && (
                                <div className="flex items-center gap-1">
                                  <Icon name="mail" className="w-3 h-3" />
                                  <span>{contact.email}</span>
                                </div>
                              )}
                              {(contact.phone || contact.mobile) && (
                                <div className="flex items-center gap-1">
                                  <Icon name="phone" className="w-3 h-3" />
                                  <span>{contact.phone || contact.mobile}</span>
                                </div>
                              )}
                              {contact.company && (
                                <div className="flex items-center gap-1">
                                  <Icon name="briefcase" className="w-3 h-3" />
                                  <span>{contact.company}</span>
                                </div>
                              )}
                              {contact.job_title && (
                                <div className="text-xs text-black dark:text-gray-500">
                                  {contact.job_title}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Listing Search */}
                <div className="mb-4">
                  <Input
                    type="text"
                    value={listingSearch}
                    onChange={(e) => setListingSearch(e.target.value)}
                    placeholder="Search listings by VIN, make, model, year, or location..."
                    className="w-full border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-black dark:text-gray-100"
                  />
                </div>

                {/* Listings List */}
                {listingsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
                    <span className="ml-3 text-black dark:text-gray-200 font-medium">Loading listings...</span>
                  </div>
                ) : filteredListings.length === 0 ? (
                  <div className="text-center py-8 text-black dark:text-gray-400 text-sm font-medium">
                    {listingSearch ? 'No listings found matching your search' : 'No listings available'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredListings.map((listing) => (
                      <div
                        key={listing.id}
                        onClick={() => setSelectedListingId(listing.id)}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedListingId === listing.id
                            ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30'
                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-black dark:text-gray-100">
                                {listing.year} {listing.make} {listing.model} {listing.trim ? `- ${listing.trim}` : ''}
                              </span>
                              {selectedListingId === listing.id && (
                                <Badge color="blue" className="bg-blue-500 dark:bg-blue-600 text-white">Selected</Badge>
                              )}
                            </div>
                            <div className="text-sm text-black dark:text-gray-400 space-y-1">
                              {listing.vin && (
                                <div className="flex items-center gap-1">
                                  <Icon name="car" className="w-3 h-3" />
                                  <span className="uppercase">{listing.vin}</span>
                                </div>
                              )}
                              {listing.location && (
                                <div className="flex items-center gap-1">
                                  <Icon name="map-pin" className="w-3 h-3" />
                                  <span>{listing.location}</span>
                                </div>
                              )}
                              {listing.price && (
                                <div className="flex items-center gap-1">
                                  <Icon name="dollar-sign" className="w-3 h-3" />
                                  <span>${listing.price.toLocaleString()}</span>
                                </div>
                              )}
                              {listing.miles && (
                                <div className="text-xs text-black dark:text-gray-500">
                                  {listing.miles.toLocaleString()} miles
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Footer */}
          <div className="flex gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 border-gray-300 dark:border-gray-600 text-black dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
              disabled={creatingLead}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateLead}
              disabled={!selectedContactId || !selectedListingId || creatingLead}
              className="flex-1 bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600 text-white font-medium cursor-pointer"
            >
              {creatingLead ? 'Creating...' : 'Create Lead'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

