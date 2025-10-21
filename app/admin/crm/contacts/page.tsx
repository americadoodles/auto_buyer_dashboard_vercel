'use client';

import React from 'react';
import { ContactManagement } from '../../../../components/organisms/ContactManagement';
import { AdminLayout } from '../../../../components/templates/AdminLayout';

// Mock data for contacts
const mockContacts = [
  {
    id: '1',
    first_name: 'John',
    last_name: 'Smith',
    email: 'john.smith@email.com',
    phone: '+1-555-0123',
    mobile: '+1-555-0123',
    company: 'Smith Industries',
    job_title: 'CEO',
    contact_type: {
      id: 1,
      name: 'Customer',
      color: 'blue'
    },
    assigned_to: {
      id: '1',
      username: 'sales_rep_1'
    },
    is_active: true,
    created_at: '2024-01-10T09:00:00Z',
    updated_at: '2024-01-15T10:30:00Z',
    last_contact: '2024-01-15T10:30:00Z'
  },
  {
    id: '2',
    first_name: 'Sarah',
    last_name: 'Johnson',
    email: 'sarah.j@email.com',
    phone: '+1-555-0124',
    mobile: '+1-555-0124',
    company: 'Johnson Corp',
    job_title: 'CFO',
    contact_type: {
      id: 2,
      name: 'Prospect',
      color: 'green'
    },
    assigned_to: {
      id: '2',
      username: 'sales_rep_2'
    },
    is_active: true,
    created_at: '2024-01-08T11:15:00Z',
    updated_at: '2024-01-14T14:20:00Z',
    last_contact: '2024-01-14T14:20:00Z'
  },
  {
    id: '3',
    first_name: 'Mike',
    last_name: 'Davis',
    email: 'mike.davis@email.com',
    phone: '+1-555-0125',
    mobile: '+1-555-0125',
    company: 'Davis Enterprises',
    job_title: 'CTO',
    contact_type: {
      id: 3,
      name: 'Lead',
      color: 'yellow'
    },
    assigned_to: {
      id: '1',
      username: 'sales_rep_1'
    },
    is_active: false,
    created_at: '2024-01-01T08:30:00Z',
    updated_at: '2024-01-05T16:45:00Z',
    last_contact: '2024-01-05T16:45:00Z'
  }
];

export default function ContactsPage() {
  const handlePageChange = (page: number) => {
    console.log('Page changed to:', page);
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

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Contact Management</h1>
          <p className="text-gray-600 mt-1">Manage your customer contacts and relationships</p>
        </div>
        <ContactManagement 
          contacts={mockContacts}
          totalContacts={mockContacts.length}
          currentPage={1}
          totalPages={1}
          onPageChange={handlePageChange}
          onContactClick={handleContactClick}
          onCreateContact={handleCreateContact}
          onExportContacts={handleExportContacts}
        />
      </div>
    </AdminLayout>
  );
}
