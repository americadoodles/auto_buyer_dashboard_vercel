'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { X, Save } from 'lucide-react';
import { createContact, updateContact } from '../../lib/services/listingManagementApi';
import { Contact } from '../../lib/types/listing';
import { useToast } from '../../hooks/useToast';

interface ContactEditModalProps {
  contact?: Contact | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (contact: Contact) => void;
}

export const ContactEditModal: React.FC<ContactEditModalProps> = ({
  contact,
  isOpen,
  onClose,
  onSave
}) => {
  const { showSuccess, showError } = useToast();
  const isEditMode = !!contact;
  
  // Contact information (editable)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [mobile, setMobile] = useState('');
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  
  const [saving, setSaving] = useState(false);

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen) {
      if (contact) {
        // Edit mode - populate with existing contact data
        setFirstName(contact.first_name || '');
        setLastName(contact.last_name || '');
        setEmail(contact.email || '');
        setPhone(contact.phone || '');
        setMobile(contact.mobile || '');
        setCompany(contact.company || '');
        setJobTitle(contact.job_title || '');
        setNotes(contact.notes || '');
        setIsActive(contact.is_active ?? true);
      } else {
        // Create mode - reset to empty
        setFirstName('');
        setLastName('');
        setEmail('');
        setPhone('');
        setMobile('');
        setCompany('');
        setJobTitle('');
        setNotes('');
        setIsActive(true);
      }
    }
  }, [isOpen, contact]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  // Save changes
  const handleSave = async () => {
    if (!firstName || !lastName) {
      showError('Validation Error', 'First name and last name are required');
      return;
    }

    try {
      setSaving(true);
      
      let savedContact: Contact;
      
      if (isEditMode && contact) {
        // Update existing contact
        savedContact = await updateContact(contact.id, {
          first_name: firstName,
          last_name: lastName,
          email: email || undefined,
          phone: phone || undefined,
          mobile: mobile || undefined,
          company: company || undefined,
          job_title: jobTitle || undefined,
          notes: notes || undefined,
          is_active: isActive
        });
        showSuccess('Contact Updated', 'Contact has been successfully updated');
      } else {
        // Create new contact
        savedContact = await createContact({
          first_name: firstName,
          last_name: lastName,
          email: email || undefined,
          phone: phone || undefined,
          mobile: mobile || undefined,
          company: company || undefined,
          job_title: jobTitle || undefined,
          notes: notes || undefined,
          is_active: isActive
        });
        showSuccess('Contact Created', 'Contact has been successfully created');
      }
      
      onSave(savedContact);
      onClose();
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} contact:`, error);
      showError(`Failed to ${isEditMode ? 'update' : 'create'} contact`, error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-claude-surface dark:bg-coal-850 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-claude-border dark:border-coal-700 sticky top-0 bg-claude-surface dark:bg-coal-850 z-10">
          <h2 className="text-xl font-semibold text-claude-ink dark:text-coal-100">
            {isEditMode ? 'Edit Contact' : 'Create New Contact'}
          </h2>
          <button
            onClick={onClose}
            className="text-claude-subtle dark:text-coal-300 hover:text-claude-muted dark:hover:text-coal-200 transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-semibold text-claude-ink dark:text-coal-100 mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-claude-text dark:text-coal-300 mb-2">
                  First Name <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <Input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter first name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-claude-text dark:text-coal-300 mb-2">
                  Last Name <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <Input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter last name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-claude-text dark:text-coal-300 mb-2">
                  Email
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-claude-text dark:text-coal-300 mb-2">
                  Phone
                </label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-claude-text dark:text-coal-300 mb-2">
                  Mobile
                </label>
                <Input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="Enter mobile number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-claude-text dark:text-coal-300 mb-2">
                  Company
                </label>
                <Input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Enter company"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-claude-text dark:text-coal-300 mb-2">
                  Job Title
                </label>
                <Input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="Enter job title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-claude-text dark:text-coal-300 mb-2">
                  Status
                </label>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400 border-claude-divider dark:border-coal-600 rounded bg-claude-surface dark:bg-coal-700"
                  />
                  <label className="ml-2 text-sm text-claude-text dark:text-coal-300">Active</label>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-claude-text dark:text-coal-300 mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter notes"
              rows={4}
              className="w-full px-3 py-2 border border-claude-divider dark:border-coal-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-claude-surface dark:bg-coal-700 text-claude-ink dark:text-coal-100"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-claude-border dark:border-coal-700">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !firstName || !lastName}
              className="flex items-center"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isEditMode ? 'Saving...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {isEditMode ? 'Save Changes' : 'Create Contact'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

