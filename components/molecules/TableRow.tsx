import React from "react";
import { Gauge, DollarSign, Clock, ExternalLink } from "lucide-react";
import { Listing } from "../../lib/types/listing";
import { Badge } from "../atoms/Badge";
import { formatCurrency, formatNumber } from "../../lib/utils/formatters";

interface TableRowProps {
  listing: Listing;
  onNotify: (vin: string) => void;
}

// Small helper to safely parse URLs and extract a clean host
function parseSourceUrl(src?: string) {
  if (!src) return null;
  try {
    const u = new URL(src);
    const host = u.hostname.replace(/^www\./, "");
    return { href: u.href, host };
  } catch {
    return null;
  }
}

export const TableRow: React.FC<TableRowProps> = ({ listing, onNotify }) => {
  const parsedSource = parseSourceUrl(listing.source);
  
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
      {/* Source column — clean host + external link icon */}
      <div className="col-span-1 truncate min-w-0">
        {parsedSource ? (
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="truncate text-xs text-slate-600"
              title={parsedSource.href}
            >
              {parsedSource.host}
            </span>
            <a
              href={parsedSource.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open source link"
              className="shrink-0 text-slate-500 hover:text-blue-600"
              title="Open source"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        ) : (
          <span
            className="truncate text-xs text-slate-600"
            title={listing.source || ""}
          >
            {listing.source || "—"}
          </span>
        )}
      </div>
      <div className="col-span-1">{listing.radius} mi</div>
      <div className="col-span-1 font-medium">
        {listing.buyMax != null ? formatCurrency(listing.buyMax) : "—"}
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
