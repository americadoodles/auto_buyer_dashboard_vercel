import React from "react";
import { Gauge, DollarSign, Clock, ExternalLink, Bell } from "lucide-react";
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
    <div className="grid grid-cols-16 items-center border-t px-4 py-3 text-sm hover:bg-slate-50 transition-colors">
      <div className="col-span-1">
        <Badge variant="default">{listing.score}</Badge>
      </div>
      {/* <div className="col-span-1 truncate text-xs text-slate-600">
        {listing.vehicle_key}
      </div> */}
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
      <div className="col-span-1 truncate text-xs text-slate-600">
        {listing.location}
      </div>
      <div className="col-span-1 truncate text-xs text-slate-600">
        {listing.buyer_username || listing.buyer_id}
      </div>
      <div className="col-span-1">{listing.radius} mi</div>
      <div className="col-span-1 font-medium">
        {listing.buyMax != null ? formatCurrency(listing.buyMax) : "—"}
      </div>
      <div className="col-span-1">
        {listing.status ? (
          <Badge variant={listing.status === 'approved' ? 'success' : listing.status === 'rejected' ? 'destructive' : 'default'}>
            {listing.status}
          </Badge>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </div>
      <div className="col-span-1">
        {listing.decision?.reasons && listing.decision.reasons.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {listing.decision.reasons.slice(0, 2).map((reason, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {reason}
              </Badge>
            ))}
            {listing.decision.reasons.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{listing.decision.reasons.length - 2}
              </Badge>
            )}
          </div>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </div>
      <div className="col-span-1 flex gap-2">
        <button
          className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => listing.vin && onNotify(listing.vin)}
          disabled={!listing.vin}
          title={listing.vin ? "Notify about this listing" : "VIN not available"}
          aria-label={listing.vin ? "Notify about this listing" : "VIN not available"}
        >
          <Bell className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
