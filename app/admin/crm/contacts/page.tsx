'use client';

import React, { useState, useMemo } from 'react';
import { ContactManagement } from '../../../../components/organisms/ContactManagement';
import { AdminLayout } from '../../../../components/templates/AdminLayout';
import { useLeads, useLeadStatuses } from '../../../../lib/hooks/useLeads';

export default function ContactsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // Fetch all leads to filter for converted ones with contact_id
  const { leads, loading, error, refreshLeads } = useLeads({
    skip: 0,
    limit: 1000, // Fetch a large number to get all converted leads
  });

  const { statuses } = useLeadStatuses();

  // Find the "Converted" status ID
  const convertedStatusId = useMemo(() => {
    const convertedStatus = statuses.find(
      status => status.name.toLowerCase() === 'converted'
    );
    return convertedStatus?.id;
  }, [statuses]);

  // Filter leads: must have contact_id and status must be "Converted"
  const convertedLeadsWithContacts = useMemo(() => {
    return leads.filter(lead => {
      // Must have contact_id
      if (!lead.contact_id) return false;
      
      // Check if status is "Converted" - check both status object and status_id
      const isConverted = 
        lead.status?.name?.toLowerCase() === 'converted' ||
        (convertedStatusId && lead.status_id === convertedStatusId);
      
      return isConverted;
    });
  }, [leads, convertedStatusId]);

  // Transform leads to contacts format
  const contacts = useMemo(() => {
    return convertedLeadsWithContacts.map(lead => {
      const contact = lead.contact;
      if (!contact) return null;

      return {
        id: lead.contact_id || lead.id,
        first_name: contact.first_name || '',
        last_name: contact.last_name || '',
        email: contact.email || '',
        phone: contact.phone || contact.mobile || '',
        mobile: contact.mobile || contact.phone || '',
        company: contact.company || '',
        job_title: contact.job_title || '',
        notes: contact.notes || '',
        contact_type: contact.contact_type ? {
          id: contact.contact_type.id || 0,
          name: contact.contact_type.name || 'Contact',
          color: contact.contact_type.color || 'blue'
        } : {
          id: 0,
          name: 'Contact',
          color: 'blue'
        },
        assigned_to: lead.assigned_to_user ? {
          id: lead.assigned_to_user.id,
          username: lead.assigned_to_user.username || 'Unknown'
        } : {
          id: '',
          username: 'Unassigned'
        },
        is_active: contact.is_active ?? true,
        created_at: lead.created_at,
        updated_at: lead.updated_at,
        last_contact: lead.updated_at,
        // Add status from lead
        status: lead.status ? {
          id: lead.status.id,
          name: lead.status.name,
          color: lead.status.color_code
        } : undefined,
        // Add listing/vehicle information
        listing: lead.listing
      };
    }).filter((contact): contact is NonNullable<typeof contact> => contact !== null);
  }, [convertedLeadsWithContacts]);

  // Paginate contacts
  const paginatedContacts = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return contacts.slice(startIndex, endIndex);
  }, [contacts, currentPage, pageSize]);

  const totalPages = Math.ceil(contacts.length / pageSize);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleContactClick = (contactId: string) => {
    console.log('Contact clicked:', contactId);
  };

  const handleCreateContact = () => {
    console.log('Create contact clicked');
  };

  const handleExportContacts = () => {
    console.log('Export contacts clicked');
  };

  // Show loading state
  if (loading && contacts.length === 0) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Show error state
  if (error) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Error loading contacts
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={refreshLeads}
                    className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Contact Management</h1>
          <p className="text-gray-600 mt-1">Manage your customer contacts and relationships</p>
        </div>
        <ContactManagement 
          contacts={paginatedContacts}
          totalContacts={contacts.length}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          onContactClick={handleContactClick}
          onCreateContact={handleCreateContact}
          onExportContacts={handleExportContacts}
          onContactUpdated={refreshLeads}
        />
      </div>
    </AdminLayout>
  );
}
