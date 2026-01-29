'use client';

import React, { useState, useMemo } from 'react';
import { ContactChatInterface } from '../../../components/organisms/ContactChatInterface';
import { ContactEditModal } from '../../../components/organisms/ContactEditModal';
import { useLeads } from '../../../lib/hooks/useLeads';
import { useContacts } from '../../../lib/hooks/useContacts';

export default function ContactsPage() {
  const [isNewContactModalOpen, setIsNewContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Fetch contacts from contacts table
  const { contacts: fetchedContacts, loading: contactsLoading, error: contactsError, refreshContacts } = useContacts({
    skip: 0,
    limit: 1000, // Fetch a large number to get all contacts
  });

  // Fetch leads to get status information
  const { leads, loading: leadsLoading, error: leadsError, refreshLeads } = useLeads({
    skip: 0,
    limit: 1000, // Fetch a large number to get all leads
  });

  // Merge contacts with status from leads
  const contacts = useMemo(() => {
    // Create a map of contact_id to the most recent lead's status
    const leadStatusMap = new Map<string, { id: number; name: string; color_code: string }>();
    // Create a map of contact_id to assigned user info from leads
    const assignedUserMap = new Map<string, { id: string; username: string }>();
    // Create a map of contact_id to most recent lead's listing and last_contact date
    const leadInfoMap = new Map<string, { listing?: any; last_contact: string }>();
    
    // Sort leads by updated_at descending to get the most recent lead for each contact
    const sortedLeads = [...leads].sort((a, b) => {
      const dateA = new Date(a.updated_at).getTime();
      const dateB = new Date(b.updated_at).getTime();
      return dateB - dateA;
    });

    // Map each contact_id to its most recent lead's status, assigned user, and other info
    sortedLeads.forEach(lead => {
      if (lead.contact_id) {
        // Map status if available and not already set
        if (lead.status && !leadStatusMap.has(lead.contact_id)) {
          leadStatusMap.set(lead.contact_id, {
            id: lead.status.id,
            name: lead.status.name,
            color_code: lead.status.color_code || '#3B82F6'
          });
        }
        // Map assigned user if available and not already set
        if (lead.assigned_to_user && !assignedUserMap.has(lead.contact_id)) {
          assignedUserMap.set(lead.contact_id, {
            id: lead.assigned_to_user.id,
            username: lead.assigned_to_user.username || 'Unknown'
          });
        }
        // Map listing and last_contact if available and not already set
        if (!leadInfoMap.has(lead.contact_id)) {
          leadInfoMap.set(lead.contact_id, {
            listing: lead.listing,
            last_contact: lead.updated_at
          });
        }
      }
    });

    // Enrich contacts with status from leads
    return fetchedContacts.map(contact => {
      const status = leadStatusMap.get(contact.id);
      const assignedUser = assignedUserMap.get(contact.id);
      const leadInfo = leadInfoMap.get(contact.id);
      
      return {
        id: contact.id,
        first_name: contact.first_name,
        last_name: contact.last_name,
        email: contact.email || '',
        phone: contact.phone || '',
        mobile: contact.mobile || '',
        company: contact.company || '',
        job_title: contact.job_title || '',
        notes: contact.notes,
        // Map contact_type - use existing if available, otherwise provide default
        contact_type: contact.contact_type || {
          id: contact.contact_type_id || 0,
          name: 'Contact',
          color: 'blue'
        },
        // Map assigned_to to the expected format
        // Use user info from leads if available, otherwise use contact's assigned_to
        assigned_to: assignedUser || (contact.assigned_to ? {
          id: contact.assigned_to,
          username: 'User' // Fallback if user details not available from leads
        } : {
          id: '',
          username: 'Unassigned'
        }),
        is_active: contact.is_active,
        created_at: contact.created_at,
        updated_at: contact.updated_at,
        // Add status from lead if available
        status: status ? {
          id: status.id,
          name: status.name,
          color: status.color_code
        } : undefined,
        // Add last_contact and listing from leads if available
        last_contact: leadInfo?.last_contact || contact.updated_at,
        listing: leadInfo?.listing
      };
    }) as any; // Type assertion since ContactManagement has its own Contact interface
  }, [fetchedContacts, leads]);

  const loading = contactsLoading || leadsLoading;
  const error = contactsError || leadsError;

  const refreshData = () => {
    refreshContacts();
    refreshLeads();
  };

  const handleUpdateContact = (contact: any) => {
    setEditingContact(contact);
    setIsEditModalOpen(true);
  };

  // Show loading state
  if (loading && fetchedContacts.length === 0) {
    return (
    fe  <div className="p-4 bg-gray-50 dark:bg-gray-900 h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-900 h-full flex items-center justify-center">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 max-w-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400 dark:text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                Error loading contacts
              </h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={refreshData}
                  className="bg-red-100 dark:bg-red-900/30 px-3 py-2 rounded-md text-sm font-medium text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-900/50"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 h-full flex flex-col p-4">
      {/* Chat Interface */}
      <div className="flex-1 min-h-0">
        <ContactChatInterface
          contacts={contacts}
          onContactUpdated={refreshData}
          onNewContact={() => setIsNewContactModalOpen(true)}
          onUpdateContact={handleUpdateContact}
        />
      </div>

      {/* New Contact Modal */}
      <ContactEditModal
        contact={null}
        isOpen={isNewContactModalOpen}
        onClose={() => setIsNewContactModalOpen(false)}
        onSave={() => {
          setIsNewContactModalOpen(false);
          refreshData();
        }}
      />

      {/* Edit Contact Modal */}
      <ContactEditModal
        contact={editingContact}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingContact(null);
        }}
        onSave={() => {
          setIsEditModalOpen(false);
          setEditingContact(null);
          refreshData();
        }}
      />
    </div>
  );
}

