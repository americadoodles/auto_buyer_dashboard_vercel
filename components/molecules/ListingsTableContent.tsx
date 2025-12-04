import React from "react";
import { Gauge, DollarSign, Clock, ExternalLink, Bell, Send, Workflow, Edit, ArrowUpDown } from "lucide-react";
import { Listing, SortConfig } from "../../lib/types/listing";
import { Badge } from "../atoms/Badge";
import { formatCurrency, formatNumber } from "../../lib/utils/formatters";
import { LISTINGS_TABLE_COLUMNS } from "../../lib/constants/table";

interface ListingsTableContentProps {
  listings: Listing[];
  sort?: SortConfig;
  onSort?: (key: keyof Listing | 'decision_status' | 'decision_reasons') => void;
  onNotify?: (vin: string) => void;
  onNotifySlack?: (vin: string, customMessage?: string) => void;
  onTriggerWorkflow?: (vin: string, customMessage?: string) => void;
  onEdit?: (listing: Listing) => void;
  selectedListings?: Set<string>;
  onSelectListing?: (listingId: string, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
  isAllSelected?: boolean;
  isIndeterminate?: boolean;
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

export const ListingsTableContent: React.FC<ListingsTableContentProps> = ({
  listings,
  sort,
  onSort,
  onNotify,
  onNotifySlack,
  onTriggerWorkflow,
  onEdit,
  selectedListings = new Set(),
  onSelectListing,
  onSelectAll,
  isAllSelected = false,
  isIndeterminate = false,
}) => {
  const listingsColumns = LISTINGS_TABLE_COLUMNS;

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="bg-slate-50 dark:bg-gray-700/50 border-b-2 border-slate-200 dark:border-gray-600">
          {listingsColumns.map(col => {
            const isActionColumn = ['notify', 'slack', 'workflow', 'edit'].includes(col.key);
            const visibilityClass = col.priority === 'low' ? 'hidden lg:table-cell' : 
                                    col.priority === 'medium' ? 'hidden md:table-cell' : '';
            
            if (col.key === 'select') {
              return (
                <th
                  key={col.key}
                  className="px-4 py-2 text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-gray-300 dark:text-gray-300 text-center"
                >
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
                </th>
              );
            }

            return (
              <th
                key={col.key}
                className={`px-4 py-2 text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-gray-300 dark:text-gray-300 ${visibilityClass} ${
                  isActionColumn ? 'text-center' : 'text-left'
                }`}
              >
                {!isActionColumn ? (
                  <button
                    className="flex items-center gap-1 hover:text-slate-800 dark:hover:text-gray-100 transition-colors"
                    onClick={() => onSort?.(col.key as keyof Listing | 'decision_status' | 'decision_reasons')}
                  >
                    <span className="truncate">{col.label}</span>
                    <ArrowUpDown className="h-3 w-3 flex-shrink-0" />
                  </button>
                ) : (
                  <span>{col.label}</span>
                )}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {listings.map(listing => {
          const parsedSource = parseSourceUrl(listing.source);
          
          return (
            <tr
              key={listing.id}
              className="border-t border-slate-200 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              {/* Select checkbox */}
              <td className="px-4 py-3 text-center">
                <input
                  type="checkbox"
                  checked={selectedListings.has(listing.id)}
                  onChange={(e) => onSelectListing?.(listing.id, e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </td>
              
              {/* Score */}
              <td className="px-4 py-3">
                <Badge variant="default">{listing.score}</Badge>
              </td>
              
              {/* VIN */}
              <td className="px-4 py-3 text-xs text-slate-600 dark:text-gray-300 dark:text-gray-300 font-mono max-w-[120px]">
                <span title={listing.vin} className="truncate block">{listing.vin}</span>
              </td>
              
              {/* Year */}
              <td className="px-4 py-3 hidden md:table-cell">
                {listing.year}
              </td>
              
              {/* Make */}
              <td className="px-4 py-3 hidden md:table-cell">
                {listing.make}
              </td>
              
              {/* Model */}
              <td className="px-4 py-3 max-w-[150px]">
                <span title={listing.model} className="truncate block">{listing.model}</span>
              </td>
              
              {/* Miles */}
              <td className="px-4 py-3 hidden md:table-cell">
                <div className="flex items-center gap-1">
                  <Gauge className="h-3 w-3 flex-shrink-0" />
                  <span>{formatNumber(listing.miles)}</span>
                </div>
              </td>
              
              {/* Price */}
              <td className="px-4 py-3 font-medium">
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3 flex-shrink-0" />
                  <span>{formatCurrency(listing.price)}</span>
                </div>
              </td>
              
              {/* DOM */}
              <td className="px-4 py-3 hidden md:table-cell">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 flex-shrink-0" />
                  <span>{listing.dom}d</span>
                </div>
              </td>
              
              {/* Source */}
              <td className="px-4 py-3 hidden lg:table-cell">
                {parsedSource ? (
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs text-slate-600 dark:text-gray-300 truncate"
                      title={parsedSource.href}
                    >
                      {parsedSource.host}
                    </span>
                    <a
                      href={parsedSource.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Open source link"
                      className="shrink-0 text-slate-500 dark:text-gray-400 hover:text-blue-600"
                      title="Open source"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                ) : (
                  <span className="text-xs text-slate-600 dark:text-gray-300 truncate" title={listing.source || ""}>
                    {listing.source || "—"}
                  </span>
                )}
              </td>
              
              {/* Location */}
              <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-600 dark:text-gray-300">
                <span title={listing.location} className="truncate block">{listing.location}</span>
              </td>
              
              {/* Buyer */}
              <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-600 dark:text-gray-300">
                <span title={listing.buyer_username || listing.buyer_id} className="truncate block">
                  {listing.buyer_username || listing.buyer_id}
                </span>
              </td>
              
              {/* Radius */}
              <td className="px-4 py-3 hidden lg:table-cell">
                {listing.radius} mi
              </td>
              
              {/* Buy Max */}
              <td className="px-4 py-3 hidden md:table-cell font-medium">
                {listing.buyMax != null ? formatCurrency(listing.buyMax) : "—"}
              </td>
              
              {/* Status */}
              <td className="px-4 py-3">
                {listing.status ? (
                  <Badge variant={listing.status === 'approved' ? 'success' : listing.status === 'rejected' ? 'destructive' : 'default'}>
                    {listing.status}
                  </Badge>
                ) : (
                  <span className="text-slate-400 dark:text-gray-500">—</span>
                )}
              </td>
              
              {/* Decision Reasons */}
              <td className="px-4 py-3 hidden lg:table-cell">
                {listing.decision?.reasons && listing.decision.reasons.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {listing.decision.reasons.slice(0, 2).map((reason, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {reason}
                      </Badge>
                    ))}
                    {listing.decision.reasons.length > 2 && (
                      <Badge variant="outline" className="text-xs flex-shrink-0">
                        +{listing.decision.reasons.length - 2}
                      </Badge>
                    )}
                  </div>
                ) : (
                  <span className="text-slate-400 dark:text-gray-500">—</span>
                )}
              </td>
              
              {/* Notify Action */}
              <td className="px-4 py-3 text-center">
                <button
                  className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => listing.vin && onNotify?.(listing.vin)}
                  disabled={!listing.vin}
                  title={listing.vin ? "Notify about this listing" : "VIN not available"}
                  aria-label={listing.vin ? "Notify about this listing" : "VIN not available"}
                >
                  <Bell className="h-3.5 w-3.5" />
                </button>
              </td>
              
              {/* Slack Action */}
              <td className="px-4 py-3 text-center">
                {onNotifySlack ? (
                  <button
                    className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => listing.vin && onNotifySlack?.(listing.vin)}
                    disabled={!listing.vin}
                    title={listing.vin ? "Send to Slack" : "VIN not available"}
                    aria-label={listing.vin ? "Send to Slack" : "VIN not available"}
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <span className="text-slate-400 dark:text-gray-500 text-xs">—</span>
                )}
              </td>
              
              {/* Workflow Action */}
              <td className="px-4 py-3 text-center">
                {onTriggerWorkflow ? (
                  <button
                    className="p-1.5 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => listing.vin && onTriggerWorkflow?.(listing.vin)}
                    disabled={!listing.vin}
                    title={listing.vin ? "Trigger Slack Workflow" : "VIN not available"}
                    aria-label={listing.vin ? "Trigger Slack Workflow" : "VIN not available"}
                  >
                    <Workflow className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <span className="text-slate-400 dark:text-gray-500 text-xs">—</span>
                )}
              </td>
              
              {/* Edit Action */}
              <td className="px-4 py-3 text-center">
                {onEdit ? (
                  <button
                    className="p-1.5 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-full transition-colors border border-orange-200"
                    onClick={() => onEdit(listing)}
                    title="Edit listing"
                    aria-label="Edit listing"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <span className="text-slate-400 dark:text-gray-500 text-xs">—</span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

