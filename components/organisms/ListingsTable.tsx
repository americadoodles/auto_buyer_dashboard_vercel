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
  currentPage: number;
  totalPages: number;
  rowsPerPage: number;
  totalRows: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
}

export const ListingsTable: React.FC<ListingsTableProps> = ({
  listings,
  sort,
  onSort,
  onNotify,
  currentPage,
  totalPages,
  rowsPerPage,
  totalRows,
  onPageChange,
  onRowsPerPageChange
}) => {
  const handleSort = (key: keyof Listing | 'decision_status' | 'decision_reasons') => {
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
