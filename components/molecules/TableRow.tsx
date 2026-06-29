import React from "react";
import { Gauge, DollarSign, Clock, ExternalLink, Bell, Send, Workflow, Edit, User, Phone, Mail, Building } from "lucide-react";
import { Listing } from "../../lib/types/listing";
import { Badge } from "../atoms/Badge";
import { formatCurrency, formatNumber } from "../../lib/utils/formatters";
import { LISTINGS_TABLE_GRID_CLASS, LISTINGS_TABLE_GRID_STYLE, LISTINGS_TABLE_COLUMNS } from "../../lib/constants/table";


interface TableRowProps {
  // Legacy props for listings table
  listing?: Listing;
  onNotify?: (vin: string) => void;
  onNotifySlack?: (vin: string, customMessage?: string) => void;
  onTriggerWorkflow?: (vin: string, customMessage?: string) => void;
  onEdit?: (listing: Listing) => void;
  isSelected?: boolean;
  onSelect?: (listingId: string, selected: boolean) => void;
  
  // New props for generic table usage
  children?: React.ReactNode;
  onClick?: () => void;
  className?: string;
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

export const TableRow: React.FC<TableRowProps> = ({ 
  listing, 
  onNotify, 
  onNotifySlack, 
  onTriggerWorkflow,
  onEdit,
  isSelected = false, 
  onSelect,
  children,
  onClick,
  className
}) => {
  // If children prop is provided, use generic table row
  if (children) {
    return (
      <tr 
        className={`${className || ''} ${onClick ? 'cursor-pointer hover:bg-claude-cream dark:hover:bg-coal-700/50' : ''}`}
        onClick={onClick}
      >
        {children}
      </tr>
    );
  }

  // Legacy listings table row
  if (!listing) {
    return null;
  }

  const parsedSource = parseSourceUrl(listing.source);
  
  // Helper function to get column configuration
  const getColumnConfig = (key: string) => {
    return LISTINGS_TABLE_COLUMNS.find(col => col.key === key);
  };
  
  // Helper function to get column span style
  const getColSpanStyle = (key: string) => {
    const config = getColumnConfig(key);
    return { gridColumn: `span ${config?.colSpan || 1} / span ${config?.colSpan || 1}` };
  };
  
  return (
    <div 
      className={`grid ${LISTINGS_TABLE_GRID_CLASS} gap-2 items-center border-t px-4 py-3 text-sm hover:bg-slate-50 transition-colors`}
      style={{
        ...LISTINGS_TABLE_GRID_STYLE,
        gridTemplateRows: 'auto',
        gridAutoRows: 'auto'
      }}
    >
      {/* Select checkbox */}
      <div style={getColSpanStyle('select')} className="flex items-center justify-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect?.(listing.id, e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-claude-divider rounded"
        />
      </div>
      
      {/* Score */}
      <div style={getColSpanStyle('score')} className="flex items-center">
        <Badge variant="default">{listing.score}</Badge>
      </div>
      
      {/* VIN - Wider column */}
      <div style={getColSpanStyle('vin')} className="truncate text-xs text-slate-600 font-mono">
        <span title={listing.vin}>{listing.vin}</span>
      </div>
      
      {/* LPN */}
      <div style={getColSpanStyle('lpn')} className="truncate text-xs text-slate-600 font-mono">
        <span title={listing.lpn}>{listing.lpn || '—'}</span>
      </div>
      
      {/* Year */}
      <div style={getColSpanStyle('year')} className="invisible md:visible flex items-center">
        {listing.year}
      </div>
      
      {/* Make */}
      <div style={getColSpanStyle('make')} className="invisible md:visible flex items-center">
        {listing.make}
      </div>
      
      {/* Model - Wider column */}
      <div style={getColSpanStyle('model')} className="truncate">
        <span title={listing.model}>{listing.model}</span>
      </div>
      
      {/* Miles */}
      <div style={getColSpanStyle('miles')} className="invisible md:visible flex items-center gap-1">
        <Gauge className="h-3 w-3 flex-shrink-0" />
        <span className="truncate">{formatNumber(listing.miles)}</span>
      </div>
      
      {/* Price */}
      <div style={getColSpanStyle('price')} className="flex items-center gap-1 font-medium">
        <DollarSign className="h-3 w-3 flex-shrink-0" />
        <span className="truncate">{formatCurrency(listing.price)}</span>
      </div>
      
      {/* DOM */}
      <div style={getColSpanStyle('dom')} className="invisible md:visible flex items-center gap-1">
        <Clock className="h-3 w-3 flex-shrink-0" />
        <span>{listing.dom}d</span>
      </div>
      
      {/* Source - Hidden on smaller screens */}
      <div style={getColSpanStyle('source')} className="invisible lg:visible flex truncate min-w-0">
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
      
      {/* Location - Wider column, hidden on mobile */}
      <div style={getColSpanStyle('location')} className="invisible md:visible flex truncate text-xs text-slate-600">
        <span title={listing.location}>{listing.location}</span>
      </div>
      
      {/* Buyer - Hidden on smaller screens */}
      <div style={getColSpanStyle('buyer_username')} className="invisible lg:visible flex truncate text-xs text-slate-600">
        <span title={listing.buyer_username || listing.buyer_id}>
          {listing.buyer_username || listing.buyer_id}
        </span>
      </div>
      
      {/* Radius - Hidden on smaller screens */}
      <div style={getColSpanStyle('radius')} className="invisible lg:visible flex items-center">
        {listing.radius} mi
      </div>
      
      {/* Buy Max */}
      <div style={getColSpanStyle('buyMax')} className="invisible md:visible flex items-center font-medium">
        {listing.buyMax != null ? formatCurrency(listing.buyMax) : "—"}
      </div>
      
      {/* Status */}
      <div style={getColSpanStyle('decision_status')} className="flex items-center">
        {listing.status ? (
          <Badge variant={listing.status === 'approved' ? 'success' : listing.status === 'rejected' ? 'destructive' : 'default'}>
            {listing.status}
          </Badge>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </div>
      
      {/* Decision Reasons - Wider column, hidden on smaller screens */}
      <div style={getColSpanStyle('decision_reasons')} className="invisible lg:visible flex min-w-0">
        {listing.decision?.reasons && listing.decision.reasons.length > 0 ? (
          <div className="flex flex-wrap gap-1 min-w-0 w-full">
            {listing.decision.reasons.slice(0, 2).map((reason, index) => (
              <Badge key={index} variant="outline" className="text-xs max-w-full truncate">
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
          <span className="text-slate-400">—</span>
        )}
      </div>
      
      {/* Notify Action */}
      <div style={getColSpanStyle('notify')} className="flex items-center justify-center">
        <button
          className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => listing.vin && onNotify?.(listing.vin)}
          disabled={!listing.vin}
          title={listing.vin ? "Notify about this listing" : "VIN not available"}
          aria-label={listing.vin ? "Notify about this listing" : "VIN not available"}
        >
          <Bell className="h-3.5 w-3.5" />
        </button>
      </div>
      
      {/* Slack Action */}
      <div style={getColSpanStyle('slack')} className="flex items-center justify-center">
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
          <span className="text-slate-400 text-xs">—</span>
        )}
      </div>
      
      {/* Workflow Action */}
      <div style={getColSpanStyle('workflow')} className="flex items-center justify-center">
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
          <span className="text-slate-400 text-xs">—</span>
        )}
      </div>
      
      {/* Edit Action */}
      <div style={getColSpanStyle('edit')} className="flex items-center justify-center">
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
          <span className="text-slate-400 text-xs">—</span>
        )}
      </div>
    </div>
  );
};
