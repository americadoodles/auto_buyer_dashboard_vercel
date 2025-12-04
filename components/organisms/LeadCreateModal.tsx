'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Icon } from '../atoms/Icon';
import { leadsApi } from '../../lib/services/leadsApi';
import { LeadSource, LeadStatus, Lead } from '../../lib/types/lead';
import { createContact } from '../../lib/services/listingManagementApi';
import { useAuth } from '../../app/auth/useAuth';
type LeadCreateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (leadId: string) => void;
  // Optional: preselect a listing to link the created contact to
  listingId?: number;
};

export const LeadCreateModal: React.FC<LeadCreateModalProps> = ({ isOpen, onClose, onCreated, listingId }) => {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [sourceId, setSourceId] = useState<number | undefined>(undefined);
  const [statusId, setStatusId] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [statuses, setStatuses] = useState<LeadStatus[]>([]);
  const [hasExistingContact, setHasExistingContact] = useState(false);
  useEffect(() => {
    if (!isOpen) return;
    const loadMeta = async () => {
      try {
        const [srcs, stats] = await Promise.all([
          leadsApi.getLeadSources().catch(() => []),
          leadsApi.getLeadStatuses().catch(() => []),
        ]);
        setSources(srcs);
        setStatuses(stats);
      } catch (e) {
        // ignore
      }
    };
    loadMeta();
  }, [isOpen]);

  // Load contact information from existing leads for this listing
  useEffect(() => {
    if (!isOpen || !listingId) return;
    
    const loadListingContact = async () => {
      try {
        // Fetch leads and find one associated with this listing
        const leads = await leadsApi.getLeads({ limit: 1000 });
        const listingLead = leads.find((lead: Lead) => lead.listing_id === listingId);
        
        if (listingLead && listingLead.contact) {
          const contact = listingLead.contact;
          // Pre-populate form fields with contact information
          if (contact.first_name) setFirstName(contact.first_name);
          if (contact.last_name) setLastName(contact.last_name);
          if (contact.email) setEmail(contact.email);
          if (contact.phone) setPhone(contact.phone);
          if (contact.mobile && !contact.phone) setPhone(contact.mobile);
          if (contact.company) setCompany(contact.company);
          if (contact.job_title) setJobTitle(contact.job_title);
          if (contact.notes) setNotes(contact.notes);
          // Pre-select source and status if available
          if (listingLead.source_id) setSourceId(listingLead.source_id);
          if (listingLead.status_id) setStatusId(listingLead.status_id);
          setHasExistingContact(true);
        } else {
          setHasExistingContact(false);
        }
      } catch (e) {
        // Silently fail - it's okay if we can't load existing contact info
        console.debug('Could not load listing contact information:', e);
      }
    };
    
    loadListingContact();
  }, [isOpen, listingId]);

  useEffect(() => {
    if (!isOpen) {
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setCompany('');
      setJobTitle('');
      setSourceId(undefined);
      setStatusId(undefined);
      setNotes('');
      setError(null);
      setLoading(false);
      setHasExistingContact(false);
    }
  }, [isOpen]);

  const canSubmit = useMemo(() => {
    return firstName.trim().length > 0 && lastName.trim().length > 0 && !loading;
  }, [firstName, lastName, loading]);

  const handleCreate = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
   

      // First create a Contact to store contact information
      const contact = await createContact({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        company: company.trim() || undefined,
        job_title: jobTitle.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      
      // Then create a Lead that references the contact and listing
      const lead = await leadsApi.createLead({
        contact_id: contact.id,
        listing_id: listingId,
        source_id: sourceId,
        status_id: statusId,
        notes: notes.trim() || undefined,
        lead_score: 0,
        vehicle_interest: {},
        budget_range: {},
        assigned_to: user?.id ?? '',
        created_by: user?.id ?? '',
      });

      onCreated && onCreated(lead.id);
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to create lead');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{hasExistingContact ? 'Update Contact' : 'New Contact'}</h3>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
            <Icon name="x" className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="text-red-600 dark:text-red-400 text-sm bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 p-3 rounded-md font-medium">{error}</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">First name</label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="John" className="border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Last name</label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" className="border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" className="border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Phone</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 555-5555" className="border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Company</label>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company Inc." className="border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Job title</label>
              <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Owner" className="border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-gray-900 dark:text-gray-100" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Source</label>
              <select className="w-full border border-gray-300 dark:border-gray-600 rounded-md h-10 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400" value={sourceId ?? ''} onChange={(e) => setSourceId(e.target.value ? Number(e.target.value) : undefined)}>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Status</label>
              <select className="w-full border border-gray-300 dark:border-gray-600 rounded-md h-10 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400" value={statusId ?? ''} onChange={(e) => setStatusId(e.target.value ? Number(e.target.value) : undefined)}>
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Notes</label>
            <textarea className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Context about this lead..." />
          </div>

          {listingId ? (
            <div className="text-sm text-gray-700 dark:text-gray-300 font-medium">
              {hasExistingContact ? (
                <span className="text-blue-600 dark:text-blue-400">✓ Contact information loaded from existing lead for listing #{listingId}</span>
              ) : (
                <span>This lead will be linked to listing #{listingId} as a seller contact.</span>
              )}
            </div>
          ) : null}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose} disabled={loading} className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</Button>
          <Button onClick={handleCreate} disabled={!canSubmit} className="bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white font-medium">
            {loading ? (hasExistingContact ? 'Updating...' : 'Creating...') : (hasExistingContact ? 'Update Contact' : 'Create Contact')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LeadCreateModal;


