'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Icon } from '../atoms/Icon';
import { dealsApi, DealCategory, DealStage } from '../../lib/services/dealsApi';
import { getContacts } from '../../lib/services/listingManagementApi';
import { leadsApi } from '../../lib/services/leadsApi';
import { Lead } from '../../lib/types/lead';
import { Contact } from '../../lib/types/listing';
import { useAuth } from '../../app/auth/useAuth';
import { useDealStages, useDealCategories } from '../../lib/hooks/useDeals';

interface DealCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
  stageId?: number;
  stageName?: string;
}

export const DealCreateModal: React.FC<DealCreateModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  stageId,
  stageName
}) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [contactId, setContactId] = useState<string | undefined>(undefined);
  const [dealCategoryId, setDealCategoryId] = useState<number | undefined>(undefined);
  const [expectedCloseDate, setExpectedCloseDate] = useState('');
  const [dealValue, setDealValue] = useState('');
  const [probability, setProbability] = useState('0');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | undefined>(undefined);
  const [selectedLead, setSelectedLead] = useState<Lead | undefined>(undefined);
  
  // Use hooks for stages and categories
  const { stages, loading: stagesLoading } = useDealStages();
  const { categories, loading: categoriesLoading } = useDealCategories();
  
  const [selectedStageId, setSelectedStageId] = useState<number | undefined>(stageId);

  useEffect(() => {
    if (!isOpen) return;
    
    const loadData = async () => {
      try {
        const [contactsData, leadsData] = await Promise.all([
          getContacts({ limit: 1000 }).catch(() => []),
          leadsApi.getLeads({ limit: 1000 }).catch(() => [])
        ]);
        setContacts(contactsData);
        setLeads(leadsData);
      } catch (e) {
        console.error('Error loading data:', e);
      }
    };
    loadData();
  }, [isOpen]);

  // Update selected stage when stageId prop changes
  useEffect(() => {
    if (stageId !== undefined) {
      setSelectedStageId(stageId);
    }
  }, [stageId]);

  // Handle lead selection - set selected lead and auto-populate contact
  useEffect(() => {
    if (selectedLeadId) {
      const lead = leads.find(l => l.id === selectedLeadId);
      if (lead) {
        setSelectedLead(lead);
        // Auto-populate contact_id from lead
        if (lead.contact_id) {
          setContactId(lead.contact_id);
        }
      }
    } else {
      setSelectedLead(undefined);
      // Clear contact when no lead is selected
      setContactId(undefined);
    }
  }, [selectedLeadId, leads]);

  useEffect(() => {
    if (!isOpen) {
      setName('');
      setDescription('');
      setContactId(undefined);
      setDealCategoryId(undefined);
      setExpectedCloseDate('');
      setDealValue('');
      setProbability('0');
      setNotes('');
      setError(null);
      setLoading(false);
      setSelectedStageId(stageId);
      setSelectedLeadId(undefined);
      setSelectedLead(undefined);
    }
  }, [isOpen, stageId]);

  const canSubmit = name.trim().length > 0 && selectedStageId !== undefined && !loading;

  const handleCreate = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      await dealsApi.createDeal({
        title: name.trim(), // API interface uses 'title' which maps to 'name' in database
        description: description.trim() || undefined,
        contact_id: contactId || undefined,
        lead_id: selectedLeadId || undefined,
        deal_stage_id: selectedStageId,
        deal_category_id: dealCategoryId || undefined,
        expected_close_date: expectedCloseDate || undefined,
        deal_value: dealValue ? parseFloat(dealValue) : undefined,
        probability: probability ? parseInt(probability) : 0,
        notes: notes.trim() || undefined,
        assigned_to: user?.id,
        is_active: true
      });

      if (onCreated) {
        onCreated();
      }
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to create deal');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Calculate default date (30 days from now)
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 30);
  const defaultDateString = defaultDate.toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
          <h3 className="text-lg font-semibold">Create New Deal{stageName ? ` - ${stageName}` : ''}</h3>
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
              Select Lead (Optional)
            </label>
            <select
              className="w-full border rounded-md h-10 px-3 mb-2"
              value={selectedLeadId || ''}
              onChange={(e) => setSelectedLeadId(e.target.value || undefined)}
            >
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
                      {selectedLead.listing.lpn && (
                        <div><span className="font-medium">LPN:</span> {selectedLead.listing.lpn}</div>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deal Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={selectedLead?.listing ? `${selectedLead.listing.year} ${selectedLead.listing.make} ${selectedLead.listing.model} Purchase` : "e.g., 2024 Toyota Camry Purchase"}
              onKeyDown={(e) => {
                if (e.key === 'Tab' && !name && selectedLead?.listing) {
                  e.preventDefault();
                  const placeholderValue = `${selectedLead.listing.year} ${selectedLead.listing.make} ${selectedLead.listing.model} Purchase`;
                  setName(placeholderValue);
                }
              }}
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
              placeholder="Describe the deal opportunity..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stage <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full border rounded-md h-10 px-3"
                value={selectedStageId || ''}
                onChange={(e) => setSelectedStageId(e.target.value ? Number(e.target.value) : undefined)}
                required
              >
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                className="w-full border rounded-md h-10 px-3"
                value={dealCategoryId || ''}
                onChange={(e) => setDealCategoryId(e.target.value ? Number(e.target.value) : undefined)}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deal Value ($)</label>
              <Input
                type="number"
                value={dealValue}
                onChange={(e) => setDealValue(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Probability (%)</label>
              <Input
                type="number"
                value={probability}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 100)) {
                    setProbability(val);
                  }
                }}
                placeholder="0"
                min="0"
                max="100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expected Close Date</label>
            <Input
              type="date"
              value={expectedCloseDate || defaultDateString}
              onChange={(e) => setExpectedCloseDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              className="w-full border rounded-md px-3 py-2"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about this deal..."
            />
          </div>

        </div>

        <div className="px-6 py-4 border-t flex justify-end space-x-2 sticky bottom-0 bg-white">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!canSubmit}>
            {loading ? 'Creating...' : 'Create Deal'}
          </Button>
        </div>
      </div>
    </div>
  );
};

