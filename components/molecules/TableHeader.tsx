import React from 'react';
import { ArrowUpDown } from 'lucide-react';
import { Listing, SortConfig } from '../../lib/types/listing';

interface TableHeaderProps {
  sort: SortConfig;
  onSort: (key: keyof Listing) => void;
}

const columns = [
  { key: 'score', label: 'Score' },
  // { key: 'vehicle_key', label: 'Vehicle Key' },
  { key: 'vin', label: 'VIN' },
  { key: 'year', label: 'Year' },
  { key: 'make', label: 'Make' },
  { key: 'model', label: 'Model' },
  { key: 'miles', label: 'Miles' },
  { key: 'price', label: 'Price' },
  { key: 'dom', label: 'DOM' },
  { key: 'source', label: 'Source' },
  { key: 'location', label: 'Location' },
  { key: 'buyer_username', label: 'Buyer' },
  { key: 'radius', label: 'Radius' },
  { key: 'buyMax', label: 'Buy-Max' },
  { key: 'decision_status', label: 'Status' },
  { key: 'decision_reasons', label: 'Reasons' },
  { key: 'actions', label: '' }
];

export const TableHeader: React.FC<TableHeaderProps> = ({ sort, onSort }) => {
  return (
    <div className="grid grid-cols-16 bg-slate-50 px-4 py-2 text-xs font-medium uppercase tracking-wide text-slate-600">
      {columns.map(col => (
        <button
          key={col.key}
          className="col-span-1 flex items-center gap-1 hover:text-slate-800 transition-colors"
          onClick={() => col.key !== 'actions' && onSort(col.key as keyof Listing)}
          disabled={col.key === 'actions'}
        >
          <span>{col.label}</span>
          {col.key !== 'actions' && (
            <ArrowUpDown className="h-3 w-3" />
          )}
        </button>
      ))}
    </div>
  );
};
