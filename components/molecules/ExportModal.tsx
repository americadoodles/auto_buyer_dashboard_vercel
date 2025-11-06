'use client';

import React, { useState } from 'react';
import { ExportType, ExportRequest } from '../../lib/types/export';
import { exportApi } from '../../lib/services/exportApi';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { useToast } from '../../hooks/useToast';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  exportType: 'listings' | 'users';
  userRole: string;
  buyerId?: string;  // For exporting specific buyer's data
  selectedListings?: Set<string>;  // For selective export
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  exportType,
  userRole,
  buyerId,
  selectedListings,
}) => {
  const [selectedExportType, setSelectedExportType] = useState<ExportType>(
    selectedListings && selectedListings.size > 0 ? 'selected' : 'all'
  );
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const { showSuccess, showError, showWarning } = useToast();

  const validateDateRange = (): boolean => {
    if (selectedExportType === 'range' && (!startDate || !endDate)) {
      showWarning('Date Range Required', 'Please select both start and end dates for range export');
      return false;
    }
    if (selectedExportType === 'selected' && (!selectedListings || selectedListings.size === 0)) {
      showWarning('No Listings Selected', 'Please select at least one listing to export');
      return false;
    }
    return true;
  };

  const handleExport = async () => {
    if (!validateDateRange()) {
      return;
    }

    setIsLoading(true);
    try {
      const request: ExportRequest = {
        export_type: selectedExportType,
        start_date: selectedExportType === 'range' ? startDate : undefined,
        end_date: selectedExportType === 'range' ? endDate : undefined,
        format: 'csv',
        buyer_id: buyerId,
        selected_listing_ids: selectedExportType === 'selected' ? Array.from(selectedListings || []) : undefined,
      };

      const blob = exportType === 'listings' 
        ? await exportApi.exportListings(request)
        : await exportApi.exportUsers(request);

      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `${exportType}_export_${timestamp}.csv`;
      
      exportApi.downloadBlob(blob, filename);
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      showError('Export Failed', `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreview = async () => {
    if (!validateDateRange()) {
      return;
    }

    try {
      const previewData = await exportApi.previewListingsExport(
        selectedExportType,
        selectedExportType === 'range' ? startDate : undefined,
        selectedExportType === 'range' ? endDate : undefined,
        buyerId
      );
      setPreview(previewData);
      setShowPreview(true);
    } catch (error) {
      console.error('Preview failed:', error);
      showError('Preview Failed', `Preview failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const resetForm = () => {
    setSelectedExportType('all');
    setStartDate('');
    setEndDate('');
    setPreview(null);
    setShowPreview(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            Export {exportType === 'listings' ? 'Listings' : 'Users'} to CSV
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Export Type
            </label>
            <div className="space-y-2">
              {selectedListings && selectedListings.size > 0 && (
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="selected"
                    checked={selectedExportType === 'selected'}
                    onChange={(e) => setSelectedExportType(e.target.value as ExportType)}
                    className="mr-2"
                  />
                  Export Selected Listings ({selectedListings.size} items)
                </label>
              )}
              <label className="flex items-center">
                <input
                  type="radio"
                  value="all"
                  checked={selectedExportType === 'all'}
                  onChange={(e) => setSelectedExportType(e.target.value as ExportType)}
                  className="mr-2"
                />
                Export All Data
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="daily"
                  checked={selectedExportType === 'daily'}
                  onChange={(e) => setSelectedExportType(e.target.value as ExportType)}
                  className="mr-2"
                />
                Export Today's Data
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="range"
                  checked={selectedExportType === 'range'}
                  onChange={(e) => setSelectedExportType(e.target.value as ExportType)}
                  className="mr-2"
                />
                Export Date Range
              </label>
            </div>
          </div>

          {selectedExportType === 'range' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {exportType === 'listings' && (
            <div className="text-sm text-gray-600">
              <p>
                {selectedExportType === 'selected' 
                  ? `You will export ${selectedListings?.size || 0} selected listings.`
                  : userRole === 'admin' 
                    ? 'You will export all listings data based on your selection.'
                    : 'You will export only your own listings data based on your selection.'
                }
              </p>
            </div>
          )}

          {exportType === 'users' && userRole !== 'admin' && (
            <div className="text-sm text-red-600">
              <p>Only administrators can export user data.</p>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <Button
              onClick={handleExport}
              disabled={isLoading || (exportType === 'users' && userRole !== 'admin')}
              className="flex-1"
            >
              {isLoading ? 'Exporting...' : 'Export CSV'}
            </Button>
            
            {exportType === 'listings' && (
              <Button
                onClick={handlePreview}
                variant="outline"
                className="flex-1"
              >
                Preview
              </Button>
            )}
          </div>

          {showPreview && preview && (
            <div className="mt-4 p-3 bg-gray-50 rounded">
              <h3 className="font-medium mb-2">Preview ({preview.record_count} records)</h3>
              <pre className="text-xs overflow-auto max-h-32 whitespace-pre-wrap">
                {preview.preview_data}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
