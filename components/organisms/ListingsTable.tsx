import React from 'react';
import { Listing } from '../../lib/types/listing';
import { TableHeader } from '../molecules/TableHeader';
import { TableRow } from '../molecules/TableRow';
import { Pagination } from '../molecules/Pagination';

interface ListingsTableProps {
  listings: Listing[];
  sort: { key: keyof Listing | 'decision_status' | 'decision_reasons'; dir: 'asc' | 'desc' };
  onSort: (key: keyof Listing | 'decision_status' | 'decision_reasons') => void;
  onNotify: (vin: string) => void;
  onNotifySlack?: (vin: string, customMessage?: string) => void;
  currentPage: number;
  totalPages: number;
  rowsPerPage: number;
  totalRows: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  selectedListings?: Set<string>;
  onSelectListing?: (listingId: string, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
  isAllSelected?: boolean;
  isIndeterminate?: boolean;
}

export const ListingsTable: React.FC<ListingsTableProps> = ({
  listings,
  sort,
  onSort,
  onNotify,
  onNotifySlack,
  currentPage,
  totalPages,
  rowsPerPage,
  totalRows,
  onPageChange,
  onRowsPerPageChange,
  selectedListings = new Set(),
  onSelectListing,
  onSelectAll,
  isAllSelected = false,
  isIndeterminate = false
}) => {
  const handleSort = (key: keyof Listing | 'decision_status' | 'decision_reasons') => {
    onSort(key);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <TableHeader 
        sort={sort} 
        onSort={handleSort}
        onSelectAll={onSelectAll}
        isAllSelected={isAllSelected}
        isIndeterminate={isIndeterminate}
      />
      {listings.map(listing => (
        <TableRow
          key={listing.id}
          listing={listing}
          onNotify={onNotify}
          onNotifySlack={onNotifySlack}
          isSelected={selectedListings.has(listing.id)}
          onSelect={onSelectListing}
        />
      ))}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        rowsPerPage={rowsPerPage}
        totalRows={totalRows}
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
      />
    </div>
  );
};
