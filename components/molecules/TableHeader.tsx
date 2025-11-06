import React from 'react';
import { ArrowUpDown } from 'lucide-react';
import { Listing, SortConfig } from '../../lib/types/listing';
import { LISTINGS_TABLE_GRID_CLASS, LISTINGS_TABLE_GRID_STYLE, LISTINGS_TABLE_COLUMNS } from '../../lib/constants/table';

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
}

interface TableHeaderProps {
  // Legacy props for listings table
  sort?: SortConfig;
  onSort?: (key: keyof Listing | 'decision_status' | 'decision_reasons') => void;
  onSelectAll?: (selected: boolean) => void;
  isAllSelected?: boolean;
  isIndeterminate?: boolean;
  
  // New props for generic table usage
  columns?: Column[];
  onColumnSort?: (key: string) => void;
}

export const TableHeader: React.FC<TableHeaderProps> = ({ 
  sort, 
  onSort, 
  onSelectAll, 
  isAllSelected = false, 
  isIndeterminate = false,
  columns,
  onColumnSort
}) => {
  // If columns prop is provided, use generic table header
  if (columns) {
    return (
      <thead className="bg-gray-50">
        <tr>
          {columns.map((column) => (
            <th
              key={column.key}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              {column.sortable ? (
                <button
                  className="flex items-center space-x-1 hover:text-gray-700"
                  onClick={() => onColumnSort?.(column.key)}
                >
                  <span>{column.label}</span>
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              ) : (
                column.label
              )}
            </th>
          ))}
        </tr>
      </thead>
    );
  }

  // Legacy listings table header
  const listingsColumns = LISTINGS_TABLE_COLUMNS;
  
  return (
    <div 
      className={`grid ${LISTINGS_TABLE_GRID_CLASS} bg-slate-50 px-4 py-2 text-xs font-medium uppercase tracking-wide text-slate-600`}
      style={LISTINGS_TABLE_GRID_STYLE}
    >
      {listingsColumns.map(col => {
        if (col.key === 'select') {
          return (
            <div key={col.key} className={`col-span-${col.colSpan} flex items-center justify-center`}>
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
            className={`col-span-${col.colSpan} flex items-center gap-1 hover:text-slate-800 transition-colors ${
              col.priority === 'low' ? 'hidden lg:flex' : 
              col.priority === 'medium' ? 'hidden md:flex' : 'flex'
            }`}
            onClick={() => !['notify', 'slack', 'workflow', 'edit', 'contacts'].includes(col.key) && onSort?.(col.key as keyof Listing | 'decision_status' | 'decision_reasons')}
            disabled={['notify', 'slack', 'workflow', 'edit', 'contacts'].includes(col.key)}
          >
            <span className="truncate">{col.label}</span>
            {!['notify', 'slack', 'workflow', 'edit', 'contacts'].includes(col.key) && (
              <ArrowUpDown className="h-3 w-3 flex-shrink-0" />
            )}
          </button>
        );
      })}
    </div>
  );
};
