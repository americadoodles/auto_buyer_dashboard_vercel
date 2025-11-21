'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Icon } from '../atoms/Icon';
import { tasksApi } from '../../lib/services/tasksApi';
import { getContacts } from '../../lib/services/listingManagementApi';
import { leadsApi } from '../../lib/services/leadsApi';
import { dealsApi } from '../../lib/services/dealsApi';
import { Lead } from '../../lib/types/lead';
import { Contact } from '../../lib/types/listing';
import { User } from '../../lib/types/user';
import { useAuth } from '../../app/auth/useAuth';
import { useTaskStatuses, useTaskPriorities } from '../../lib/hooks/useTasks';
import { ApiService } from '../../lib/services/api';

interface TaskCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
  statusId?: number;
  statusName?: string;
}

export const TaskCreateModal: React.FC<TaskCreateModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  statusId,
  statusName
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedToId, setAssignedToId] = useState<string | undefined>(user?.id);
  const [priorityId, setPriorityId] = useState<number | undefined>(undefined);
  const [selectedStatusId, setSelectedStatusId] = useState<number | undefined>(statusId);
  const [dueDate, setDueDate] = useState('');
  const [relatedLeadId, setRelatedLeadId] = useState<string | undefined>(undefined);
  const [relatedContactId, setRelatedContactId] = useState<string | undefined>(undefined);
  const [relatedDealId, setRelatedDealId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | undefined>(undefined);
  
  // Use hooks for statuses and priorities
  const { statuses, loading: statusesLoading } = useTaskStatuses();
  const { priorities, loading: prioritiesLoading } = useTaskPriorities();

  useEffect(() => {
    if (!isOpen) return;
    
    const loadData = async () => {
      try {
        const [contactsData, leadsData, dealsData, usersData] = await Promise.all([
          getContacts({ limit: 1000 }).catch(() => []),
          leadsApi.getLeads({ limit: 1000 }).catch(() => []),
          dealsApi.getDeals({ limit: 1000 }).catch(() => []),
          ApiService.getUsers().catch(() => [])
        ]);
        setContacts(contactsData);
        setLeads(leadsData);
        setDeals(dealsData);
        setUsers(usersData);
      } catch (e) {
        console.error('Error loading data:', e);
      }
    };
    loadData();
  }, [isOpen]);

  // Update selected status when statusId prop changes
  useEffect(() => {
    if (statusId !== undefined) {
      setSelectedStatusId(statusId);
    }
  }, [statusId]);

  // Handle lead selection - set selected lead and auto-populate contact
  useEffect(() => {
    if (relatedLeadId) {
      const lead = leads.find(l => l.id === relatedLeadId);
      if (lead) {
        setSelectedLead(lead);
        // Auto-populate contact_id from lead
        if (lead.contact_id) {
          setRelatedContactId(lead.contact_id);
        }
      }
    } else {
      setSelectedLead(undefined);
    }
  }, [relatedLeadId, leads]);

  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setDescription('');
      setAssignedToId(user?.id);
      setPriorityId(undefined);
      setSelectedStatusId(statusId);
      setDueDate('');
      setRelatedLeadId(undefined);
      setRelatedContactId(undefined);
      setRelatedDealId(undefined);
      setError(null);
      setLoading(false);
      setSelectedLead(undefined);
    }
  }, [isOpen, statusId, user]);

  const canSubmit = title.trim().length > 0 && selectedStatusId !== undefined && !loading;

  const handleCreate = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      await tasksApi.createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        assigned_to: assignedToId || undefined,
        priority_id: priorityId || undefined,
        status_id: selectedStatusId,
        due_date: dueDate || undefined,
        related_lead_id: relatedLeadId || undefined,
        related_contact_id: relatedContactId || undefined,
        related_deal_id: relatedDealId || undefined,
      });

      if (onCreated) {
        onCreated();
      }
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Calculate default date (7 days from now)
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 7);
  const defaultDateString = defaultDate.toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
          <h3 className="text-lg font-semibold">Create New Task{statusName ? ` - ${statusName}` : ''}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <Icon name="x" className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Task Title <span className="text-red-500">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Follow up with client"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="w-full border rounded-md px-3 py-2"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the task..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full border rounded-md h-10 px-3"
                value={selectedStatusId || ''}
                onChange={(e) => setSelectedStatusId(e.target.value ? Number(e.target.value) : undefined)}
                required
                disabled={statusesLoading}
              >
                <option value="">Select status</option>
                {statuses.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                className="w-full border rounded-md h-10 px-3"
                value={priorityId || ''}
                onChange={(e) => setPriorityId(e.target.value ? Number(e.target.value) : undefined)}
                disabled={prioritiesLoading}
              >
                <option value="">Select priority</option>
                {[...priorities]
                  .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                  .map((priority) => (
                    <option key={priority.id} value={priority.id}>
                      {priority.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
              <select
                className="w-full border rounded-md h-10 px-3"
                value={assignedToId || ''}
                onChange={(e) => setAssignedToId(e.target.value || undefined)}
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <Input
                type="date"
                value={dueDate || defaultDateString}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Related Lead (Optional)
            </label>
            <select
              className="w-full border rounded-md h-10 px-3 mb-2"
              value={relatedLeadId || ''}
              onChange={(e) => setRelatedLeadId(e.target.value || undefined)}
            >
              <option value="">No lead selected</option>
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.contact 
                    ? `${lead.contact.first_name} ${lead.contact.last_name} - ${lead.listing ? `${lead.listing.year} ${lead.listing.make} ${lead.listing.model}` : 'No vehicle'}`
                    : `Lead ${lead.id} - ${lead.listing ? `${lead.listing.year} ${lead.listing.make} ${lead.listing.model}` : 'No vehicle'}`
                  }
                </option>
              ))}
            </select>
            {selectedLead && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                {/* Vehicle Information */}
                {selectedLead.listing && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <div className="text-sm font-medium text-blue-900 mb-2">Vehicle Information</div>
                    <div className="text-sm text-blue-700 space-y-1">
                      <div><span className="font-medium">Year:</span> {selectedLead.listing.year}</div>
                      <div><span className="font-medium">Make:</span> {selectedLead.listing.make}</div>
                      <div><span className="font-medium">Model:</span> {selectedLead.listing.model}</div>
                      {selectedLead.listing.trim && (
                        <div><span className="font-medium">Trim:</span> {selectedLead.listing.trim}</div>
                      )}
                      {selectedLead.listing.vin && (
                        <div><span className="font-medium">VIN:</span> {selectedLead.listing.vin}</div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Contact Information */}
                {selectedLead.contact && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-3">
                    <div className="text-sm font-medium text-green-900 mb-2">Contact Information</div>
                    <div className="text-sm text-green-700 space-y-1">
                      <div>
                        <span className="font-medium">Name:</span> {selectedLead.contact.first_name} {selectedLead.contact.last_name}
                      </div>
                      {selectedLead.contact.company && (
                        <div><span className="font-medium">Company:</span> {selectedLead.contact.company}</div>
                      )}
                      {selectedLead.contact.email && (
                        <div><span className="font-medium">Email:</span> {selectedLead.contact.email}</div>
                      )}
                      {selectedLead.contact.phone && (
                        <div><span className="font-medium">Phone:</span> {selectedLead.contact.phone}</div>
                      )}
                      {selectedLead.contact.mobile && !selectedLead.contact.phone && (
                        <div><span className="font-medium">Mobile:</span> {selectedLead.contact.mobile}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Related Contact</label>
              <select
                className="w-full border rounded-md h-10 px-3"
                value={relatedContactId || ''}
                onChange={(e) => setRelatedContactId(e.target.value || undefined)}
              >
                <option value="">No contact selected</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.first_name} {contact.last_name} {contact.company ? `(${contact.company})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Related Deal</label>
              <select
                className="w-full border rounded-md h-10 px-3"
                value={relatedDealId || ''}
                onChange={(e) => setRelatedDealId(e.target.value || undefined)}
              >
                <option value="">No deal selected</option>
                {deals.map((deal) => (
                  <option key={deal.id} value={deal.id}>
                    {deal.name || deal.title || `Deal ${deal.id}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

        </div>

        <div className="px-6 py-4 border-t flex justify-end space-x-2 sticky bottom-0 bg-white">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!canSubmit}>
            {loading ? 'Creating...' : 'Create Task'}
          </Button>
        </div>
      </div>
    </div>
  );
};

