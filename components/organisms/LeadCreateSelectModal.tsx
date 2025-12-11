'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Icon } from '../atoms/Icon';
import { Badge } from '../atoms/Badge';
import { X } from 'lucide-react';
import { getContacts } from '../../lib/services/listingManagementApi';
import { leadsApi } from '../../lib/services/leadsApi';
import { Contact } from '../../lib/types/listing';
import { Lead } from '../../lib/types/lead';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../app/auth/useAuth';
import { useLeadStatuses } from '../../lib/hooks/useLeads';

interface LeadCreateSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: number;
  existingLead?: Lead | null;
  onSuccess?: () => void;
}

export const LeadCreateSelectModal: React.FC<LeadCreateSelectModalProps> = ({
  isOpen,
  onClose,
  listingId,
  existingLead,
  onSuccess
}) => {
  const { showSuccess, showError } = useToast();
  const { user } = useAuth();
  const { statuses: leadStatuses } = useLeadStatuses();
  
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string | undefined>(undefined);
  const [contactSearch, setContactSearch] = useState<string>('');
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [creatingLead, setCreatingLead] = useState(false);

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
      setContactSearch('');
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

  // Create or update lead from selected contact
  const handleCreateLeadFromContact = async () => {
    if (!selectedContactId) {
      showError('Validation Error', 'Please select a contact');
      return;
    }

    try {
      setCreatingLead(true);
      
      const isUpdating = existingLead && existingLead.contact;
      
      if (isUpdating && existingLead.id) {
        // Update existing lead with new contact
        await leadsApi.updateLead(existingLead.id.toString(), {
          contact_id: selectedContactId,
        });

        showSuccess('Lead Updated', 'Lead has been successfully updated');
      } else {
        // Create new lead
        // Find the "new" status
        const newStatus = leadStatuses.find(
          status => status.name.toLowerCase() === 'new'
        );
        
        await leadsApi.createLead({
          contact_id: selectedContactId,
          listing_id: listingId,
          status_id: newStatus?.id,
          lead_score: 0,
          vehicle_interest: {},
          budget_range: {},
          assigned_to: user?.id ?? '',
          created_by: user?.id ?? '',
        });

        showSuccess('Lead Created', 'Lead has been successfully created');
      }

      // Reset state
      setSelectedContactId(undefined);
      setContactSearch('');
      
      // Call success callback
      if (onSuccess) {
        onSuccess();
      }
      
      // Close modal
      onClose();
    } catch (error) {
      console.error('Error creating/updating lead:', error);
      const action = existingLead && existingLead.contact ? 'update' : 'create';
      showError(`Failed to ${action} lead`, error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setCreatingLead(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-black dark:text-gray-100">
            {existingLead && existingLead.contact ? 'Update Lead - Select Contact' : 'Create Lead - Select Contact'}
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
        
        <div className="p-4 flex-1 overflow-y-auto flex flex-col">
          {/* Search */}
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
            <div className="space-y-2 flex-1 overflow-y-auto">
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
          
          {/* Footer */}
          <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 border-gray-300 dark:border-gray-600 text-black dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
              disabled={creatingLead}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateLeadFromContact}
              disabled={!selectedContactId || creatingLead}
              className="flex-1 bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600 text-black font-medium cursor-pointer"
            >
              {creatingLead 
                ? (existingLead && existingLead.contact ? 'Updating...' : 'Creating...') 
                : (existingLead && existingLead.contact ? 'Update Lead' : 'Create Lead')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

