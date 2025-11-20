'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Icon } from '../atoms/Icon';
import { dealsApi, DealCategory, DealStage } from '../../lib/services/dealsApi';
import { getContacts } from '../../lib/services/listingManagementApi';
import { useAuth } from '../../app/auth/useAuth';

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  company?: string;
}

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
  const [categories, setCategories] = useState<DealCategory[]>([]);
  const [stages, setStages] = useState<DealStage[]>([]);
  const [selectedStageId, setSelectedStageId] = useState<number | undefined>(stageId);

  useEffect(() => {
    if (!isOpen) return;
    
    const loadData = async () => {
      try {
        const [contactsData, categoriesData, stagesData] = await Promise.all([
          getContacts({ limit: 1000 }).catch(() => []),
          dealsApi.getDealCategories().catch(() => []),
          dealsApi.getDealStages().catch(() => [])
        ]);
        setContacts(contactsData);
        setCategories(categoriesData);
        setStages(stagesData);
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
        deal_stage_id: selectedStageId,
        deal_category_id: dealCategoryId || undefined,
        expected_close_date: expectedCloseDate || undefined,
        deal_value: dealValue ? parseFloat(dealValue) : undefined,
        probability: probability ? parseInt(probability) : 0,
        notes: notes.trim() || undefined,
        assigned_to: user?.id,
        is_active: true
      });

      onCreated && onCreated();
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
              Deal Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., 2024 Toyota Camry Purchase"
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
              <option value="">Select stage</option>
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
              <select
                className="w-full border rounded-md h-10 px-3"
                value={contactId || ''}
                onChange={(e) => setContactId(e.target.value || undefined)}
              >
                <option value="">Select contact</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.first_name} {contact.last_name}
                    {contact.company ? ` - ${contact.company}` : ''}
                    {contact.email ? ` (${contact.email})` : ''}
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
                <option value="">Select category</option>
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

