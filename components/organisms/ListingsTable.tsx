import React from 'react';
import { Listing } from '../../lib/types/listing';
import { TableHeader } from '../molecules/TableHeader';
import { TableRow } from '../molecules/TableRow';

interface ListingsTableProps {
  listings: Listing[];
  sort: { key: keyof Listing; dir: 'asc' | 'desc' };
  onSort: (key: keyof Listing) => void;
  onNotify: (vin: string) => void;
}

export const ListingsTable: React.FC<ListingsTableProps> = ({
  listings,
  sort,
  onSort,
  onNotify
}) => {
  const handleSort = (key: keyof Listing) => {
    onSort(key);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <TableHeader sort={sort} onSort={handleSort} />
      {listings.map(listing => (
        <TableRow
          key={listing.id}
          listing={listing}
          onNotify={onNotify}
        />
      ))}
    </div>
  );
};
