'use client';

import React from 'react';
import { Listing } from '../../lib/types/listing';
import { ListingCard } from '../molecules/ListingCard';

interface ListingsCardGridProps {
  listings: Listing[];
  selectedListings?: Set<string>;
  onSelectListing?: (listingId: string, selected: boolean) => void;
  onNotify?: (vin: string) => void;
  onNotifySlack?: (vin: string) => void;
  onTriggerWorkflow?: (vin: string) => void;
  onLike?: (listingId: string) => void;
  likedListings?: Set<string>;
}

export const ListingsCardGrid: React.FC<ListingsCardGridProps> = ({
  listings,
  selectedListings = new Set(),
  onSelectListing,
  onNotify,
  onNotifySlack,
  onTriggerWorkflow,
  onLike,
  likedListings = new Set(),
}) => {
  if (listings.length === 0) {
    return (
      <div className="text-center py-12 text-claude-subtle dark:text-coal-400">
        <p className="text-lg">No listings found</p>
        <p className="text-sm mt-2">Try adjusting your filters or search criteria</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {listings.map((listing) => (
        <ListingCard
          key={listing.id}
          listing={listing}
          isSelected={selectedListings.has(listing.id)}
          onSelect={onSelectListing}
          onNotify={onNotify}
          onNotifySlack={onNotifySlack}
          onTriggerWorkflow={onTriggerWorkflow}
          onLike={onLike}
          isLiked={likedListings.has(listing.id)}
        />
      ))}
    </div>
  );
};

