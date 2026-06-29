'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Icon } from '../atoms/Icon';
import { Badge } from '../atoms/Badge';
import { X } from 'lucide-react';
import { leadsApi } from '../../lib/services/leadsApi';
import { Listing } from '../../lib/types/listing';
import { useToast } from '../../hooks/useToast';
import { useListings } from '../../lib/hooks/useListings';

interface ListingSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  onSuccess?: () => void;
}

export const ListingSelectModal: React.FC<ListingSelectModalProps> = ({
  isOpen,
  onClose,
  leadId,
  onSuccess
}) => {
  const { showSuccess, showError } = useToast();
  const { data: listings, loading: listingsLoading } = useListings();
  
  const [selectedListingId, setSelectedListingId] = useState<string | undefined>(undefined);
  const [listingSearch, setListingSearch] = useState<string>('');
  const [updatingLead, setUpdatingLead] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedListingId(undefined);
      setListingSearch('');
    }
  }, [isOpen]);

  // Filter listings based on search and exclude listings with contact_id
  const filteredListings = listings.filter(listing => {
    // Exclude listings that already have a contact_id
    if (listing.contact_id) return false;
    
    if (!listingSearch.trim()) return true;
    const searchLower = listingSearch.toLowerCase();
    return (
      listing.vin?.toLowerCase().includes(searchLower) ||
      listing.lpn?.toLowerCase().includes(searchLower) ||
      listing.make?.toLowerCase().includes(searchLower) ||
      listing.model?.toLowerCase().includes(searchLower) ||
      listing.year?.toString().includes(searchLower) ||
      listing.location?.toLowerCase().includes(searchLower)
    );
  });

  // Update lead with selected listing
  const handleUpdateLead = async () => {
    if (!selectedListingId) {
      showError('Validation Error', 'Please select a listing');
      return;
    }

    try {
      setUpdatingLead(true);
      
      await leadsApi.updateLead(leadId, {
        listing_id: parseInt(selectedListingId),
      });

      showSuccess('Lead Updated', 'Lead has been successfully updated with listing information');

      // Reset state
      setSelectedListingId(undefined);
      setListingSearch('');
      
      // Call success callback
      if (onSuccess) {
        onSuccess();
      }
      
      // Close modal
      onClose();
    } catch (error) {
      console.error('Error updating lead:', error);
      showError('Failed to update lead', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setUpdatingLead(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-claude-surface dark:bg-coal-850 rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col border border-claude-border dark:border-coal-700">
        <div className="flex items-center justify-between p-4 border-b border-claude-border dark:border-coal-700">
          <h3 className="text-lg font-semibold text-black dark:text-coal-100">
            Update Lead - Select Listing
          </h3>
          <Button 
            onClick={onClose} 
            variant="outline" 
            size="sm"
            className="border-claude-divider dark:border-coal-600 text-black dark:text-coal-300 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto flex flex-col">
          {/* Search */}
          <div className="mb-4">
            <Input
              type="text"
              value={listingSearch}
              onChange={(e) => setListingSearch(e.target.value)}
              placeholder="Search listings by VIN, make, model, year, or location..."
              className="w-full border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-300 dark:focus:ring-blue-700 text-black dark:text-coal-100"
            />
          </div>

          {/* Listings List */}
          {listingsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
              <span className="ml-3 text-black dark:text-coal-200 font-medium">Loading listings...</span>
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="text-center py-8 text-black dark:text-coal-400 text-sm font-medium">
              {listingSearch ? 'No listings found matching your search' : 'No listings available'}
            </div>
          ) : (
            <div className="space-y-2 flex-1 overflow-y-auto">
              {filteredListings.map((listing) => (
                <div
                  key={listing.id}
                  onClick={() => setSelectedListingId(listing.id)}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedListingId === listing.id
                      ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-claude-border dark:border-coal-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-claude-cream dark:hover:bg-coal-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-black dark:text-coal-100">
                          {listing.year} {listing.make} {listing.model} {listing.trim ? `- ${listing.trim}` : ''}
                        </span>
                        {selectedListingId === listing.id && (
                          <Badge color="blue" className="bg-blue-500 dark:bg-blue-600 text-coal-100">Selected</Badge>
                        )}
                      </div>
                      <div className="text-sm text-black dark:text-coal-400 space-y-1">
                        {listing.vin && (
                          <div className="flex items-center gap-1">
                            <Icon name="car" className="w-3 h-3" />
                            <span className="uppercase">VIN: {listing.vin}</span>
                          </div>
                        )}
                        {listing.lpn && (
                          <div className="flex items-center gap-1">
                            <Icon name="car" className="w-3 h-3" />
                            <span className="uppercase">LPN: {listing.lpn}</span>
                          </div>
                        )}
                        {listing.location && (
                          <div className="flex items-center gap-1">
                            <Icon name="map-pin" className="w-3 h-3" />
                            <span>{listing.location}</span>
                          </div>
                        )}
                        {listing.price && (
                          <div className="flex items-center gap-1">
                            <Icon name="dollar-sign" className="w-3 h-3" />
                            <span>${listing.price.toLocaleString()}</span>
                          </div>
                        )}
                        {listing.miles && (
                          <div className="text-xs text-black dark:text-coal-500">
                            {listing.miles.toLocaleString()} miles
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Footer */}
          <div className="flex gap-2 pt-4 border-t border-claude-border dark:border-coal-700 mt-4">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 border-claude-divider dark:border-coal-600 text-black dark:text-coal-300 hover:bg-claude-cream dark:hover:bg-coal-700 cursor-pointer"
              disabled={updatingLead}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateLead}
              disabled={!selectedListingId || updatingLead}
              className="flex-1 bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600 text-coal-100 font-medium cursor-pointer"
            >
              {updatingLead ? 'Updating...' : 'Update Lead'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

