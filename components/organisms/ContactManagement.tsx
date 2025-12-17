'use client';

import React, { useState } from 'react';
import { Card } from '../molecules/Card';
import { TableHeader } from '../molecules/TableHeader';
import { TableRow } from '../molecules/TableRow';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Icon } from '../atoms/Icon';
import { Pagination } from '../molecules/Pagination';
import { ContactEditModal } from './ContactEditModal';
import { ConfirmationModal } from './ConfirmationModal';
import { Listing } from '../../lib/types/listing';
import { deleteContact } from 'lib/services/listingManagementApi';
import { leadsApi } from '../../lib/services/leadsApi';
import { dealsApi } from '../../lib/services/dealsApi';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../app/auth/useAuth';

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  mobile: string;
  company: string;
  job_title: string;
  notes?: string;
  contact_type: {
    id: number;
    name: string;
    color: string;
  };
  assigned_to: {
    id: string;
    username: string;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_contact: string;
  status?: {
    id: number;
    name: string;
    color: string;
  };
  listing?: Listing;
}

interface ContactManagementProps {
  contacts: Contact[];
  totalContacts: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onContactClick: (contactId: string) => void;
  onExportContacts: () => void;
  onContactUpdated?: () => void;
}

export const ContactManagement: React.FC<ContactManagementProps> = ({
  contacts,
  totalContacts,
  currentPage,
  totalPages,
  onPageChange,
  onContactClick,
  onExportContacts,
  onContactUpdated
}) => {
  const { showSuccess, showError } = useToast();
  const { user } = useAuth();
  const isBuyer = user?.role?.toLowerCase() === 'buyer';
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assignedFilter, setAssignedFilter] = useState('all');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | undefined>(undefined);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | undefined>(undefined);
  const [deleting, setDeleting] = useState(false);

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'customer': return 'green';
      case 'prospect': return 'blue';
      case 'vendor': return 'purple';
      case 'partner': return 'orange';
      default: return 'gray';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const formatCalendarDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleRowClick = (contact: Contact) => {
    // Buyers cannot edit contacts
    if (isBuyer) return;
    setSelectedContact(contact);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedContact(undefined);
  };

  const handleContactSaved = (updatedContact: any) => {
    handleCloseEditModal();
    // Notify parent to refresh the contacts list
    if (onContactUpdated) {
      onContactUpdated();
    }
  };

  const handleRemoveContact = (e: React.MouseEvent, contact: Contact) => {
    e.stopPropagation(); // Prevent row click
    setContactToDelete(contact);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!contactToDelete) return;
    
    setDeleting(true);
    try {
      // Now delete the contact
      await deleteContact(contactToDelete.id);
      
      // Show success toast
      const contactName = `${contactToDelete.first_name} ${contactToDelete.last_name}`;
      showSuccess('Contact Deleted', `${contactName} has been successfully deleted`);
      
      // Notify parent to refresh the contacts list
      if (onContactUpdated) {
        onContactUpdated();
      }
      setShowDeleteConfirm(false);
      setContactToDelete(undefined);
    } catch (error) {
      console.error('Error deleting contact:', error);
      const contactName = contactToDelete ? `${contactToDelete.first_name} ${contactToDelete.last_name}` : 'Contact';
      showError('Failed to Delete Contact', `Failed to delete ${contactName}. ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Contact Management</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Manage your contacts and customer relationships ({totalContacts} total)
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onExportContacts}>
              <Icon name="download" className="w-4 h-4 mr-2" />
              Export
            </Button>
              <Button onClick={() => {
                setSelectedContact(undefined);
                setIsEditModalOpen(true);
              }}>
                <Icon name="plus" className="w-4 h-4 mr-2" />
                New Contact
              </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search
              </label>
              <Input
                type="text"
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Types</option>
                <option value="customer">Customer</option>
                <option value="prospect">Prospect</option>
                <option value="vendor">Vendor</option>
                <option value="partner">Partner</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Assigned To
              </label>
              <select
                value={assignedFilter}
                onChange={(e) => setAssignedFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Users</option>
                <option value="me">Me</option>
                <option value="john">John Doe</option>
                <option value="jane">Jane Smith</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Contact Analytics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <Icon name="users" className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Contacts</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{totalContacts}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <Icon name="user-check" className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Customers</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {contacts.filter(contact => contact.contact_type.name === 'Customer').length}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                  <Icon name="user-plus" className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Prospects</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {contacts.filter(contact => contact.contact_type.name === 'Prospect').length}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                  <Icon name="activity" className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {contacts.filter(contact => contact.is_active).length}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Contact List */}
        <Card className="p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <TableHeader
                columns={[
                  { key: 'name', label: 'Name', sortable: true },
                  { key: 'company', label: 'Company', sortable: true },
                  { key: 'email', label: 'Email', sortable: true },
                  { key: 'phone', label: 'Phone', sortable: true },
                  { key: 'mobile', label: 'Mobile', sortable: true },
                  { key: 'assigned', label: 'Assigned To', sortable: true },
                  { key: 'status', label: 'Status', sortable: true },
                  { key: 'updated_at', label: 'Updated At', sortable: true },
                  { key: 'actions', label: 'Actions', sortable: false }
                ]}
              />
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {contacts.map((contact) => (
                  <TableRow key={contact.id} onClick={() => handleRowClick(contact)} className={isBuyer ? "group hover:bg-gray-50 dark:hover:bg-gray-700/50" : "cursor-pointer group hover:bg-gray-50 dark:hover:bg-gray-700/50"}>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 group-hover:bg-blue-500 dark:group-hover:bg-blue-600 transition-colors duration-150 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-white transition-colors duration-150">
                              {contact.first_name?.[0] || ''}{contact.last_name?.[0] || ''}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-150">
                            {contact.first_name} {contact.last_name}
                          </div>
                          {contact.job_title && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">{contact.job_title}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {contact.company || '-'}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {contact.email || '-'}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {contact.phone || '-'}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {contact.mobile || '-'}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {contact.assigned_to?.username || 'Unassigned'}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-center">
                      {contact.status ? (
                        <Badge color={contact.status.color || 'blue'}>
                          {contact.status.name}
                        </Badge>
                      ) : (
                        <Badge color={contact.is_active ? 'green' : 'gray'}>
                          {contact.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      )}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatCalendarDate(contact.updated_at)}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm">
                          <Icon name="phone" className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Icon name="mail" className="w-4 h-4" />
                        </Button>
                        {!isBuyer && (
                          <Button 
                            variant="outline" 
                            onClick={(e) => handleRemoveContact(e, contact)}
                            className="text-red-600 dark:text-red-400 border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center"
                            size="sm"
                          >
                            <Icon name="trash-2" className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </TableRow>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-6">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={onPageChange}
            />
          </div>
        </Card>

      </div>

      {/* Contact Edit Modal */}
      <ContactEditModal
        contact={selectedContact ? {
          id: selectedContact.id,
          first_name: selectedContact.first_name,
          last_name: selectedContact.last_name,
          email: selectedContact.email,
          phone: selectedContact.phone,
          mobile: selectedContact.mobile,
          company: selectedContact.company,
          job_title: selectedContact.job_title,
          notes: selectedContact.notes || '',
          is_active: selectedContact.is_active,
          created_at: selectedContact.created_at,
          updated_at: selectedContact.updated_at
        } : null}
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onSave={handleContactSaved}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setContactToDelete(undefined);
        }}
        onConfirm={handleDeleteConfirm}
        title="Confirm Deletion"
        message={contactToDelete ? `Are you sure you want to delete ${contactToDelete.first_name} ${contactToDelete.last_name}? This action cannot be undone.` : ''}
        confirmText="Yes"
        cancelText="No"
        variant="danger"
        loading={deleting}
        loadingText="Deleting..."
      />
    </div>
  );
};
