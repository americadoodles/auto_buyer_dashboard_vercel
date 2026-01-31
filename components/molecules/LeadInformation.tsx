'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Lead, LeadStatus, LeadSource } from '../../lib/types/lead';
import { formatDateTime } from '../../lib/utils/formatters';
import { Check, X, Edit2, Save, ChevronRight } from 'lucide-react';

interface LeadInformationProps {
  lead: Lead;
  statuses: LeadStatus[];
  sources: LeadSource[];
  onFieldSave: (field: string, value: any) => Promise<void>;
  onSaveAll: () => Promise<void>;
  saving?: boolean;
}

export const LeadInformation: React.FC<LeadInformationProps> = ({
  lead,
  statuses,
  sources,
  onFieldSave,
  onSaveAll,
  saving = false,
}) => {
  const router = useRouter();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [savingField, setSavingField] = useState<string | null>(null);

  const PANEL_ANIMATION_MS = 300;
  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsPanelOpen(false);
      setIsClosing(false);
    }, PANEL_ANIMATION_MS);
  };

  // Handle Escape key to close panel
  useEffect(() => {
    if (!isPanelOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose();
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isPanelOpen]);

  // Start editing a field
  const startEditing = (field: string, currentValue: any) => {
    setEditingField(field);
    if (typeof currentValue === 'number') {
      setEditValue(currentValue.toString());
    } else {
      setEditValue(currentValue || '');
    }
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingField(null);
    setEditValue('');
  };

  // Save a single field
  const saveField = async (field: string) => {
    try {
      setSavingField(field);
      
      let value: any = editValue;

      // Parse value based on field type
      switch (field) {
        case 'lead_score':
          value = value ? parseInt(value, 10) : undefined;
          if (isNaN(value)) value = undefined;
          break;
        case 'status_id':
        case 'source_id':
          value = value ? parseInt(value, 10) : undefined;
          break;
        default:
          value = value || undefined;
      }

      await onFieldSave(field, value);
      setEditingField(null);
      setEditValue('');
    } catch (error) {
      console.error('Error updating field:', error);
    } finally {
      setSavingField(null);
    }
  };

  return (
    <>
      {/* Clickable Title Card */}
      <div 
        className="bg-white dark:bg-[#1a1d29] rounded-lg shadow-sm border border-gray-200 dark:border-gray-700/50 px-6 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        onClick={() => setIsPanelOpen(true)}
      >
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-bold text-black dark:text-white">Lead Information</h4>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>
      </div>

      {/* Slide-in Panel from Right */}
      {isPanelOpen && (
        <>
          {/* Backdrop */}
          <div 
            className={`fixed inset-0 bg-black/50 z-40 ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}
            onClick={handleClose}
          />
          
          {/* Panel */}
          <div className={`fixed top-0 right-0 h-full w-[30%] min-w-[320px] bg-white dark:bg-[#1a1d29] shadow-xl z-50 overflow-y-auto ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}>
            {/* Panel Header */}
            <div className="sticky top-0 bg-white dark:bg-[#1a1d29] border-b border-gray-200 dark:border-gray-700/50 px-6 py-4 flex items-center justify-between">
              <h4 className="text-lg font-bold text-black dark:text-white">Lead Information</h4>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Panel Content */}
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 gap-x-8 gap-y-2">
                {/* Status */}
                <div className="flex items-center w-full group">
                  <span className="text-sm font-semibold text-black dark:text-gray-300 w-32 flex-shrink-0">Status:</span>
                  {editingField === 'status_id' ? (
                    <div className="flex items-center gap-2 flex-1">
                      <select
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 text-black dark:text-white flex-1 w-full min-w-0 h-8 py-0.5 px-2 text-sm rounded-md bg-white dark:bg-gray-800"
                        autoFocus
                      >
                        <option value="">Select status</option>
                        {statuses.map((status) => (
                          <option key={status.id} value={status.id}>
                            {status.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => saveField('status_id')}
                        disabled={savingField === 'status_id'}
                        className="p-1 text-green-400 hover:bg-green-900/30 rounded"
                        title="Save"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={cancelEditing}
                        disabled={savingField === 'status_id'}
                        className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                        title="Cancel"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span 
                        onClick={() => startEditing('status_id', lead.status_id || '')}
                        className="text-sm text-black dark:text-gray-300 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        {lead.status?.name || ''}
                      </span>
                      <button
                        onClick={() => startEditing('status_id', lead.status_id || '')}
                        className="p-1 text-gray-400 hover:text-blue-400 rounded transition-all opacity-0 group-hover:opacity-100"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Source */}
                <div className="flex items-center w-full group">
                  <span className="text-sm font-semibold text-black dark:text-gray-300 w-32 flex-shrink-0">Source:</span>
                  {editingField === 'source_id' ? (
                    <div className="flex items-center gap-2 flex-1">
                      <select
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 text-black dark:text-white flex-1 w-full min-w-0 h-8 py-0.5 px-2 text-sm rounded-md bg-white dark:bg-gray-800"
                        autoFocus
                      >
                        <option value="">Select source</option>
                        {sources.map((source) => (
                          <option key={source.id} value={source.id}>
                            {source.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => saveField('source_id')}
                        disabled={savingField === 'source_id'}
                        className="p-1 text-green-400 hover:bg-green-900/30 rounded"
                        title="Save"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={cancelEditing}
                        disabled={savingField === 'source_id'}
                        className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                        title="Cancel"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span 
                        onClick={() => startEditing('source_id', lead.source_id || '')}
                        className="text-sm text-black dark:text-gray-300 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        {lead.source?.name || ''}
                      </span>
                      <button
                        onClick={() => startEditing('source_id', lead.source_id || '')}
                        className="p-1 text-gray-400 hover:text-blue-400 rounded transition-all opacity-0 group-hover:opacity-100"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Lead Score */}
                <div className="flex items-center w-full group">
                  <span className="text-sm font-semibold text-black dark:text-gray-300 w-32 flex-shrink-0">Lead Score:</span>
                  {editingField === 'lead_score' ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="border-gray-600 focus:border-blue-500 focus:ring-blue-500 text-white flex-1 w-full min-w-0 h-8 py-0.5 px-2 text-sm bg-gray-800"
                        autoFocus
                      />
                      <button
                        onClick={() => saveField('lead_score')}
                        disabled={savingField === 'lead_score'}
                        className="p-1 text-green-400 hover:bg-green-900/30 rounded"
                        title="Save"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={cancelEditing}
                        disabled={savingField === 'lead_score'}
                        className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                        title="Cancel"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span 
                        onClick={() => startEditing('lead_score', lead.lead_score !== undefined ? lead.lead_score.toString() : '')}
                        className="text-sm text-black dark:text-gray-300 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        {lead.lead_score !== undefined ? lead.lead_score.toString() : ''}
                      </span>
                      <button
                        onClick={() => startEditing('lead_score', lead.lead_score !== undefined ? lead.lead_score.toString() : '')}
                        className="p-1 text-gray-400 hover:text-blue-400 rounded transition-all opacity-0 group-hover:opacity-100"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Assigned To */}
                <div className="flex items-center w-full group">
                  <span className="text-sm font-semibold text-black dark:text-gray-300 w-32 flex-shrink-0">Assigned To:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-300">
                      {lead.assigned_to_user?.username || 'Unassigned'}
                    </span>
                  </div>
                </div>

                {/* Contact Information */}
                {lead.contact && (
                  <>
                    {/* First Name */}
                    <div className="flex items-center w-full group">
                      <span className="text-sm font-semibold text-black dark:text-gray-300 w-32 flex-shrink-0">First Name:</span>
                      {editingField === 'first_name' ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="border-gray-600 focus:border-blue-500 focus:ring-blue-500 text-white flex-1 w-full min-w-0 h-8 py-0.5 px-2 text-sm bg-gray-800"
                            autoFocus
                          />
                          <button
                            onClick={() => saveField('first_name')}
                            disabled={savingField === 'first_name'}
                            className="p-1 text-green-400 hover:bg-green-900/30 rounded"
                            title="Save"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={cancelEditing}
                            disabled={savingField === 'first_name'}
                            className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                            title="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span 
                            onClick={() => startEditing('first_name', lead.contact?.first_name || '')}
                            className="text-sm text-black dark:text-gray-300 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          >
                            {lead.contact.first_name || ''}
                          </span>
                          <button
                            onClick={() => startEditing('first_name', lead.contact?.first_name || '')}
                            className="p-1 text-gray-400 hover:text-blue-400 rounded transition-all opacity-0 group-hover:opacity-100"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Last Name */}
                    <div className="flex items-center w-full group">
                      <span className="text-sm font-semibold text-black dark:text-gray-300 w-32 flex-shrink-0">Last Name:</span>
                      {editingField === 'last_name' ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="border-gray-600 focus:border-blue-500 focus:ring-blue-500 text-white flex-1 w-full min-w-0 h-8 py-0.5 px-2 text-sm bg-gray-800"
                            autoFocus
                          />
                          <button
                            onClick={() => saveField('last_name')}
                            disabled={savingField === 'last_name'}
                            className="p-1 text-green-400 hover:bg-green-900/30 rounded"
                            title="Save"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={cancelEditing}
                            disabled={savingField === 'last_name'}
                            className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                            title="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span 
                            onClick={() => startEditing('last_name', lead.contact?.last_name || '')}
                            className="text-sm text-black dark:text-gray-300 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          >
                            {lead.contact.last_name || ''}
                          </span>
                          <button
                            onClick={() => startEditing('last_name', lead.contact?.last_name || '')}
                            className="p-1 text-gray-400 hover:text-blue-400 rounded transition-all opacity-0 group-hover:opacity-100"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Email */}
                    <div className="flex items-center w-full group">
                      <span className="text-sm font-semibold text-black dark:text-gray-300 w-32 flex-shrink-0">Email:</span>
                      {editingField === 'email' ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            type="email"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="border-gray-600 focus:border-blue-500 focus:ring-blue-500 text-white flex-1 w-full min-w-0 h-8 py-0.5 px-2 text-sm bg-gray-800"
                            autoFocus
                          />
                          <button
                            onClick={() => saveField('email')}
                            disabled={savingField === 'email'}
                            className="p-1 text-green-400 hover:bg-green-900/30 rounded"
                            title="Save"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={cancelEditing}
                            disabled={savingField === 'email'}
                            className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                            title="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span 
                            onClick={() => startEditing('email', lead.contact?.email || '')}
                            className="text-sm text-black dark:text-gray-300 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          >
                            {lead.contact.email || ''}
                          </span>
                          <button
                            onClick={() => startEditing('email', lead.contact?.email || '')}
                            className="p-1 text-gray-400 hover:text-blue-400 rounded transition-all opacity-0 group-hover:opacity-100"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Phone */}
                    <div className="flex items-center w-full group">
                      <span className="text-sm font-semibold text-black dark:text-gray-300 w-32 flex-shrink-0">Phone:</span>
                      {editingField === 'phone' ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            type="tel"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="border-gray-600 focus:border-blue-500 focus:ring-blue-500 text-white flex-1 w-full min-w-0 h-8 py-0.5 px-2 text-sm bg-gray-800"
                            autoFocus
                          />
                          <button
                            onClick={() => saveField('phone')}
                            disabled={savingField === 'phone'}
                            className="p-1 text-green-400 hover:bg-green-900/30 rounded"
                            title="Save"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={cancelEditing}
                            disabled={savingField === 'phone'}
                            className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                            title="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span 
                            onClick={() => startEditing('phone', lead.contact?.phone || '')}
                            className="text-sm text-black dark:text-gray-300 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          >
                            {lead.contact.phone || ''}
                          </span>
                          <button
                            onClick={() => startEditing('phone', lead.contact?.phone || '')}
                            className="p-1 text-gray-400 hover:text-blue-400 rounded transition-all opacity-0 group-hover:opacity-100"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Notes */}
                <div className="flex items-start w-full group">
                  <span className="text-sm font-semibold text-gray-300 w-32 flex-shrink-0 pt-1">Notes:</span>
                  {editingField === 'notes' ? (
                    <div className="flex items-start gap-2 flex-1">
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="flex-1 px-3 py-1 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-800 text-white"
                        rows={3}
                        autoFocus
                      />
                      <div className="flex flex-col gap-1 pt-1">
                        <button
                          onClick={() => saveField('notes')}
                          disabled={savingField === 'notes'}
                          className="p-1 text-green-400 hover:bg-green-900/30 rounded"
                          title="Save"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={cancelEditing}
                          disabled={savingField === 'notes'}
                          className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                          title="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <span 
                        onClick={() => startEditing('notes', lead.notes || '')}
                        className="text-sm text-black dark:text-gray-300 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        {lead.notes || ''}
                      </span>
                      <button
                        onClick={() => startEditing('notes', lead.notes || '')}
                        className="p-1 text-gray-400 hover:text-blue-400 rounded transition-all opacity-0 group-hover:opacity-100 mt-1"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Created Date */}
                {lead.created_at && (
                  <div className="flex items-center w-full group">
                    <span className="text-sm font-semibold text-black dark:text-gray-300 w-32 flex-shrink-0">Created:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-300">
                        {formatDateTime(lead.created_at)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700/50">
                <Button 
                  variant="outline" 
                  onClick={handleClose} 
                  disabled={saving} 
                  className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Close
                </Button>
                <Button onClick={onSaveAll} disabled={saving} className="bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white flex items-center gap-2 font-medium">
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Animation styles */}
      <style jsx global>{`
        @keyframes slide-in-right { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes slide-out-right { from { transform: translateX(0); } to { transform: translateX(100%); } }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fade-out { from { opacity: 1; } to { opacity: 0; } }
        .animate-slide-in-right { animation: slide-in-right 0.3s ease-out forwards; }
        .animate-slide-out-right { animation: slide-out-right 0.3s ease-in forwards; }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
        .animate-fade-out { animation: fade-out 0.3s ease-in forwards; }
      `}</style>
    </>
  );
};
