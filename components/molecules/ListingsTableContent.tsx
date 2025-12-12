import React from "react";
import Link from "next/link";
import { Gauge, DollarSign, Clock, ExternalLink, Bell, Send, Workflow, Edit, ArrowUpDown } from "lucide-react";
import { Listing, SortConfig } from "../../lib/types/listing";
import { Badge } from "../atoms/Badge";
import { formatCurrency, formatNumber } from "../../lib/utils/formatters";
import { LISTINGS_TABLE_COLUMNS } from "../../lib/constants/table";
import { formatDateTime } from "../../lib/utils/formatters";
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
            const isActionColumn = ['notify', 'slack', 'workflow'].includes(col.key);
            
            return (
              <th
                key={col.key}
                className={`px-4 py-2 text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-gray-300 ${
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
              className="border-t border-slate-200 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
              onClick={() => onEdit?.(listing)}
            >
              {/* Score */}
              <td className="px-4 py-3">
                <Badge variant="default">{listing.score}</Badge>
              </td>
              
              {/* VIN */}
              <td className="px-4 py-3 text-xs text-slate-600 dark:text-gray-300 font-mono max-w-[120px]">
                <span title={listing.vin} className="truncate block">{listing.vin}</span>
              </td>
              
              {/* LPN */}
              <td className="px-4 py-3 text-xs text-slate-600 dark:text-gray-300 font-mono max-w-[120px]">
                <span title={listing.lpn} className="truncate block">{listing.lpn || '—'}</span>
              </td>
              
              {/* Price */}
              <td className="px-4 py-3 font-medium">
                <div className="flex items-center gap-1">
                  <span>{formatCurrency(listing.price)}</span>
                </div>
              </td>
              
              {/* Year */}
              <td className="px-4 py-3">
                {listing.year}
              </td>
              
              {/* Make */}
              <td className="px-4 py-3">
                {listing.make}
              </td>
              
              {/* Model */}
              <td className="px-4 py-3 max-w-[150px]">
                <span title={listing.model} className="truncate block">{listing.model}</span>
              </td>
              
              {/* Miles */}
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <Gauge className="h-3 w-3 flex-shrink-0" />
                  <span>{formatNumber(listing.miles)}</span>
                </div>
              </td>
              
              {/* Source */}
              <td className="px-4 py-3">
                {parsedSource ? (
                  <div className="flex items-center gap-2">
                    <Link
                      href={parsedSource.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-slate-600 dark:text-gray-300 truncate inline-flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400"
                      title={parsedSource.href}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span>{parsedSource.host}</span>
                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    </Link>
                  </div>
                ) : (
                  <span className="text-xs text-slate-600 dark:text-gray-300 truncate" title={listing.source || ""}>
                    {listing.source || "—"}
                  </span>
                )}
              </td>
              
              {/* Notify Action */}
              <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
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
              <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
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
              <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
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
              
              {/* Updated */}
              <td className="px-4 py-3 text-xs text-slate-600 dark:text-gray-300">
                <span title={formatDateTime(listing.updated_at)} className="truncate block">
                  {formatDateTime(listing.updated_at)}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

