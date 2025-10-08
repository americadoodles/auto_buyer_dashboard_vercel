import React from 'react';
import { Listing } from '../../lib/types/listing';
import { TableHeader } from '../molecules/TableHeader';
import { TableRow } from '../molecules/TableRow';
import { Pagination } from '../molecules/Pagination';
import { Badge } from '../atoms/Badge';
import { formatCurrency, formatNumber } from '../../lib/utils/formatters';
import { Gauge, Clock, Bell, Send, Workflow } from 'lucide-react';

interface ListingsTableProps {
  listings: Listing[];
  sort: { key: keyof Listing | 'decision_status' | 'decision_reasons'; dir: 'asc' | 'desc' };
  onSort: (key: keyof Listing | 'decision_status' | 'decision_reasons') => void;
  onNotify: (vin: string) => void;
  onNotifySlack?: (vin: string, customMessage?: string) => void;
  onTriggerWorkflow?: (vin: string, customMessage?: string) => void;
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
  onTriggerWorkflow,
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
      {/* Desktop/Tablet Table View */}
      <div className="hidden md:block">
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
            onTriggerWorkflow={onTriggerWorkflow}
            isSelected={selectedListings.has(listing.id)}
            onSelect={onSelectListing}
          />
        ))}
      </div>
      
      {/* Mobile Card View */}
      <div className="md:hidden">
        {listings.map(listing => (
          <div key={listing.id} className="border-b border-slate-200 p-4 last:border-b-0">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedListings.has(listing.id)}
                  onChange={(e) => onSelectListing?.(listing.id, e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <Badge variant="default">{listing.score}</Badge>
                {listing.status && (
                  <Badge variant={listing.status === 'approved' ? 'success' : listing.status === 'rejected' ? 'destructive' : 'default'}>
                    {listing.status}
                  </Badge>
                )}
              </div>
              <div className="flex gap-1">
                {/* Notify Button */}
                <button
                  className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => listing.vin && onNotify(listing.vin)}
                  disabled={!listing.vin}
                  title={listing.vin ? "Notify about this listing" : "VIN not available"}
                >
                  <Bell className="h-4 w-4" />
                </button>
                
                {/* Slack Button */}
                {onNotifySlack && (
                  <button
                    className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => listing.vin && onNotifySlack(listing.vin)}
                    disabled={!listing.vin}
                    title={listing.vin ? "Send to Slack" : "VIN not available"}
                  >
                    <Send className="h-4 w-4" />
                  </button>
                )}
                
                {/* Workflow Button */}
                {onTriggerWorkflow && (
                  <button
                    className="p-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => listing.vin && onTriggerWorkflow(listing.vin)}
                    disabled={!listing.vin}
                    title={listing.vin ? "Trigger Slack Workflow" : "VIN not available"}
                  >
                    <Workflow className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">{listing.year} {listing.make} {listing.model}</span>
                <span className="text-lg font-bold text-green-600">{formatCurrency(listing.price)}</span>
              </div>
              
              <div className="text-sm text-slate-600 font-mono">{listing.vin}</div>
              
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <span className="flex items-center gap-1">
                  <Gauge className="h-3 w-3" />
                  {formatNumber(listing.miles)} miles
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {listing.dom} days
                </span>
              </div>
              
              {listing.buyMax != null && (
                <div className="text-sm">
                  <span className="text-slate-500">Buy Max: </span>
                  <span className="font-medium">{formatCurrency(listing.buyMax)}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
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
