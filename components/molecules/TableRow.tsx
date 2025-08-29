import React from 'react';
import { Gauge, DollarSign, Clock } from 'lucide-react';
import { Listing } from '../../lib/types/listing';
import { Badge } from '../atoms/Badge';
import { formatCurrency, formatNumber } from '../../lib/utils/formatters';

interface TableRowProps {
  listing: Listing;
  onNotify: (vin: string) => void;
}

export const TableRow: React.FC<TableRowProps> = ({ listing, onNotify }) => {
  return (
    <div className="grid grid-cols-12 items-center border-t px-4 py-3 text-sm hover:bg-slate-50 transition-colors">
      <div className="col-span-1">
        <Badge variant="default">{listing.score}</Badge>
      </div>
      <div className="col-span-1 truncate text-xs text-slate-600">
        {listing.vehicle_key}
      </div>
      <div className="col-span-1 truncate text-xs text-slate-600">
        {listing.vin}
      </div>
      <div className="col-span-1">{listing.year}</div>
      <div className="col-span-1">{listing.make}</div>
      <div className="col-span-1">{listing.model}</div>
      <div className="col-span-1 flex items-center gap-1">
        <Gauge className="h-3 w-3" />
        {formatNumber(listing.miles)}
      </div>
      <div className="col-span-1 flex items-center gap-1">
        <DollarSign className="h-3 w-3" />
        {formatCurrency(listing.price)}
      </div>
      <div className="col-span-1 flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {listing.dom}d
      </div>
      <div className="col-span-1">{listing.source}</div>
      <div className="col-span-1">{listing.radius} mi</div>
      <div className="col-span-1 font-medium">
        {listing.buyMax != null ? formatCurrency(listing.buyMax) : '—'}
      </div>
      <div className="col-span-1 flex gap-2">
        <button
          className="text-blue-600 hover:underline transition-colors"
          onClick={() => onNotify(listing.vin)}
        >
          Notify
        </button>
      </div>
    </div>
  );
};
