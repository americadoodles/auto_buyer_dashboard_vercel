import React from 'react';
import { ArrowUpDown } from 'lucide-react';
import { Listing, SortConfig } from '../../lib/types/listing';
import { LISTINGS_TABLE_GRID_CLASS, LISTINGS_TABLE_GRID_STYLE, LISTINGS_TABLE_COLUMNS } from '../../lib/constants/table';

interface TableHeaderProps {
  sort: SortConfig;
  onSort: (key: keyof Listing | 'decision_status' | 'decision_reasons') => void;
  onSelectAll?: (selected: boolean) => void;
  isAllSelected?: boolean;
  isIndeterminate?: boolean;
}

// Use the columns configuration from constants
const columns = LISTINGS_TABLE_COLUMNS;

export const TableHeader: React.FC<TableHeaderProps> = ({ sort, onSort, onSelectAll, isAllSelected = false, isIndeterminate = false }) => {
  return (
    <div 
      className={`grid ${LISTINGS_TABLE_GRID_CLASS} bg-slate-50 px-4 py-2 text-xs font-medium uppercase tracking-wide text-slate-600`}
      style={LISTINGS_TABLE_GRID_STYLE}
    >
      {columns.map(col => {
        if (col.key === 'select') {
          return (
            <div key={col.key} className="col-span-1 flex items-center justify-center">
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={(input) => {
                  if (input) input.indeterminate = isIndeterminate;
                }}
                onChange={(e) => onSelectAll?.(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                title={isAllSelected ? "Deselect all" : "Select all"}
              />
            </div>
          );
        }
        
        return (
          <button
            key={col.key}
            className="col-span-1 flex items-center gap-1 hover:text-slate-800 transition-colors"
            onClick={() => col.key !== 'actions' && onSort(col.key as keyof Listing | 'decision_status' | 'decision_reasons')}
            disabled={col.key === 'actions'}
          >
            <span>{col.label}</span>
            {col.key !== 'actions' && (
              <ArrowUpDown className="h-3 w-3" />
            )}
          </button>
        );
      })}
    </div>
  );
};
