"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Card } from "../molecules/Card";
import { TableHeader } from "../molecules/TableHeader";
import { TableRow } from "../molecules/TableRow";
import { Badge } from "../atoms/Badge";
import { Button } from "../atoms/Button";
import { Input } from "../atoms/Input";
import { Icon } from "../atoms/Icon";
import { Pagination } from "../molecules/Pagination";
import { ViewToggle, ViewMode } from "../molecules/ViewToggle";
import { LeadsCardGrid } from "./LeadsCardGrid";
import { LeadCreateWithSelectionModal } from "./LeadCreateWithSelectionModal";
import { Lead as BaseLead, LeadStatus, LeadSource } from "../../lib/types/lead";
import { useLeadSources, useLeadStatuses } from "../../lib/hooks/useLeads";
import { formatCurrency } from "../../lib/utils/formatters";

// Helper to parse URL and extract hostname
function parseSourceUrl(src?: string) {
  if (!src) return null;
  try {
    const u = new URL(src);
    const host = u.hostname.replace(/^(www|web)\./, "");
    return { href: u.href, host };
  } catch {
    return null;
  }
}

// Extended Lead type with transformed fields for UI display
type Lead = Omit<BaseLead, 'status' | 'assigned_to' | 'source'> & {
  // These fields are transformed in the parent component
  status: {
    id: number;
    name: string;
    color: string;
  };
  source?: {
    id: number;
    name: string;
  };
  assigned_to: {
    id: string;
    username: string;
  };
};

interface LeadManagementProps {
  leads: Lead[];
  totalLeads: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLeadClick: (leadId: string) => void;
  onExportLeads: () => void;
  onSearch?: (search: string) => void;
  onStatusFilter?: (statusId: number | undefined) => void;
  onSourceFilter?: (sourceId: number | undefined) => void;
  onAssignedToFilter?: (assignedTo: string | undefined) => void;
  onLocationFilter?: (location: string | undefined) => void;
  currentStatusFilter?: number | undefined;
  currentSourceFilter?: number | undefined;
  currentAssignedToFilter?: string | undefined;
  currentLocationFilter?: string | undefined;
  statuses?: LeadStatus[];
  sources?: LeadSource[];
  assignedToUsers?: Array<{ id: string; username: string }>;
  locations?: string[];
  loading?: boolean;
  onLeadUpdated?: () => void;
  isAdmin?: boolean;
}

export const LeadManagement: React.FC<LeadManagementProps> = ({
  leads,
  totalLeads,
  currentPage,
  totalPages,
  onPageChange,
  onLeadClick,
  onExportLeads,
  onSearch,
  onStatusFilter,
  onSourceFilter,
  onAssignedToFilter,
  onLocationFilter,
  currentStatusFilter,
  currentSourceFilter,
  currentAssignedToFilter,
  currentLocationFilter,
  statuses: statusesProp,
  sources: sourcesProp,
  assignedToUsers,
  locations,
  loading,
  onLeadUpdated,
  isAdmin = true,
}) => {
  // Fetch lead sources and statuses from database
  const { sources: dbSources, loading: sourcesLoading } = useLeadSources();
  const { statuses: dbStatuses, loading: statusesLoading } = useLeadStatuses();
  
  // Use database sources if available, otherwise fall back to prop
  const sources = dbSources.length > 0 ? dbSources : (sourcesProp || []);
  // Use database statuses if available, otherwise fall back to prop
  const statuses = dbStatuses.length > 0 ? dbStatuses : (statusesProp || []);
  
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateLeadModalOpen, setIsCreateLeadModalOpen] = useState(false);
  // View mode state - default to cards
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [viewModeInitialized, setViewModeInitialized] = useState(false);
  // Liked leads state (for card view)
  const [likedLeads, setLikedLeads] = useState<Set<string>>(new Set());
  // Selected leads state
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  
  // Initialize view mode from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return; // SSR check
    
    try {
      const savedViewMode = localStorage.getItem('leadsViewMode') as ViewMode | null;
      if (savedViewMode === 'table' || savedViewMode === 'cards') {
        setViewMode(savedViewMode);
      }
    } catch (error) {
      console.error('Failed to load view mode from localStorage:', error);
    } finally {
      setViewModeInitialized(true);
    }
  }, []); // Only run on mount

  // Save view mode to localStorage whenever it changes
  useEffect(() => {
    if (!viewModeInitialized || typeof window === 'undefined') return; // Don't save until initialized and client-side
    
    try {
      localStorage.setItem('leadsViewMode', viewMode);
    } catch (error) {
      console.error('Failed to save view mode to localStorage:', error);
    }
  }, [viewMode, viewModeInitialized]);

  // Derive filter values from parent props
  const statusFilter = currentStatusFilter === undefined ? "all" : currentStatusFilter.toString();
  const sourceFilter = currentSourceFilter === undefined ? "all" : currentSourceFilter.toString();
  const assignedFilter = currentAssignedToFilter === undefined ? "all" : currentAssignedToFilter;
  const locationFilter = currentLocationFilter === undefined ? "all" : currentLocationFilter;
  
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  const handleStatusFilterChange = (value: string) => {
    if (onStatusFilter) {
      const statusId = value === "all" ? undefined : parseInt(value, 10);
      onStatusFilter(statusId);
    }
  };

  const handleSourceFilterChange = (value: string) => {
    if (onSourceFilter) {
      const sourceId = value === "all" ? undefined : parseInt(value, 10);
      onSourceFilter(sourceId);
    }
  };

  const handleAssignedToFilterChange = (value: string) => {
    if (onAssignedToFilter) {
      const assignedTo = value === "all" ? undefined : value;
      onAssignedToFilter(assignedTo);
    }
  };

  const handleLocationFilterChange = (value: string) => {
    if (onLocationFilter) {
      const location = value === "all" ? undefined : value;
      onLocationFilter(location);
    }
  };

  const handleEditLead = (lead: Lead) => {
    router.push(`/crm/leads/${lead.id}`);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "green";
    if (score >= 80) return "blue";
    if (score >= 70) return "yellow";
    return "red";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "1 day ago";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  // Helper function to get verification icons for a lead
  const getVerificationIcons = (lead: Lead) => {
    const icons: string[] = [];
    const listing = lead.listing;
    if (!listing) {
      return icons;
    }
    icons.push('mmr');
    icons.push('accutrade');
    icons.push('autocheck');
    icons.push('carfax');
    return icons;
  };

  return (
    <div>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Lead Management
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Manage and track your leads ({totalLeads} total)
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onExportLeads}>
              <Icon name="download" className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button 
              onClick={() => setIsCreateLeadModalOpen(true)}
              className="bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600 text-black"
            >
              <Icon name="plus" className="w-4 h-4 mr-2" />
              Create New Lead
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search
              </label>
              <Input
                type="text"
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => handleStatusFilterChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                disabled={loading || statusesLoading}
              >
                <option value="all">All Status</option>
                {statuses && statuses.length > 0 && statuses.map((status) => (
                  <option key={status.id} value={status.id.toString()}>
                    {status.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Source
              </label>
              <select
                value={sourceFilter}
                onChange={(e) => handleSourceFilterChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                disabled={loading || sourcesLoading}
              >
                <option value="all">All Sources</option>
                {sources && sources.length > 0 && sources.map((source) => (
                  <option key={source.id} value={source.id.toString()}>
                    {source.name}
                  </option>
                ))}
              </select>
            </div>
            {isAdmin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Assigned To
                </label>
                <select
                  value={assignedFilter}
                  onChange={(e) => handleAssignedToFilterChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  disabled={loading}
                >
                  <option value="all">All Users</option>
                  {assignedToUsers ? (
                    assignedToUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.username}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="me">Me</option>
                      <option value="john">John Doe</option>
                      <option value="jane">Jane Smith</option>
                    </>
                  )}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Location
              </label>
              <select
                value={locationFilter}
                onChange={(e) => handleLocationFilterChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                disabled={loading}
              >
                <option value="all">All Locations</option>
                {locations && locations.length > 0 ? (
                  locations.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))
                ) : (
                  <option value="">No locations available</option>
                )}
              </select>
            </div>
          </div>
        </Card>

        {/* Lead Analytics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <Icon name="users" className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Leads</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {totalLeads}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <Icon
                    name="check-circle"
                    className="w-4 h-4 text-green-600 dark:text-green-400"
                  />
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Qualified</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {
                    leads.filter((lead) => lead.status.name === "Qualified")
                      .length
                  }
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                  <Icon name="clock" className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  New This Week
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {
                    leads.filter((lead) => {
                      const leadDate = new Date(lead.created_at);
                      const weekAgo = new Date();
                      weekAgo.setDate(weekAgo.getDate() - 7);
                      return leadDate > weekAgo;
                    }).length
                  }
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                  <Icon
                    name="trending-up"
                    className="w-4 h-4 text-purple-600 dark:text-purple-400"
                  />
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Score</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {Math.round(
                    leads.reduce((sum, lead) => sum + lead.lead_score, 0) /
                      leads.length
                  ) || 0}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Lead List */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Leads</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {leads.length} lead{leads.length !== 1 ? 's' : ''} showing
                {selectedLeads.size > 0 && (
                  <span className="ml-2 text-blue-600 dark:text-blue-400 font-medium">
                    • {selectedLeads.size} selected
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Page {currentPage} of {totalPages}
              </div>
            </div>
          </div>

          {viewMode === 'table' ? (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <TableHeader
                    columns={[
                      { key: "score", label: "Score", sortable: true },
                      { key: "vin", label: "VIN", sortable: true },
                      { key: "lpn", label: "LPN", sortable: true },
                      { key: "price", label: "Price", sortable: true },
                      { key: "year", label: "Year", sortable: true },
                      { key: "make", label: "Make", sortable: true },
                      { key: "model", label: "Model", sortable: true },
                      { key: "miles", label: "Miles", sortable: true },
                      { key: "listing_source", label: "Source", sortable: true },
                      { key: "status", label: "Status", sortable: true },
                      { key: "name", label: "Name", sortable: true },
                      { key: "email", label: "Email", sortable: true },
                      { key: "updated", label: "Updated", sortable: true },
                      { key: "verified", label: "Verified", sortable: false },
                    ]}
                  />
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {leads.map((lead) => (
                      <TableRow
                        key={lead.id}
                        onClick={() => handleEditLead(lead)}
                        className="cursor-pointer group transition-colors duration-150"
                      >
                        <td className="px-4 py-2 whitespace-nowrap">
                          <Badge color={getScoreColor(lead.lead_score)}>
                            {lead.lead_score}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {lead.listing?.vin || "-"}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {lead.listing?.lpn || "-"}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {lead.listing?.price ? formatCurrency(lead.listing.price) : "-"}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {lead.listing?.year || "-"}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {lead.listing?.make || "-"}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {lead.listing?.model ? (lead.listing.model.length > 10 ? lead.listing.model.substring(0, 10) + "..." : lead.listing.model) : "-"}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {formatCurrency(Number(lead.listing?.miles || 0))}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {(() => {
                            const parsedSource = parseSourceUrl(lead.listing?.source);
                            if (parsedSource) {
                              return (
                                <Link
                                  href={parsedSource.href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 dark:text-blue-400 inline-flex items-center gap-1 hover:text-blue-700 dark:hover:text-blue-300"
                                  title={parsedSource.href}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <span>{parsedSource.host}</span>
                                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                </Link>
                              );
                            }
                            return <span>{lead.listing?.source || "-"}</span>;
                          })()}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <Badge color={lead.status.color}>
                            {lead.status.name}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="flex items-center">
                      
                            <div className="ml-4">
                              <div className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-150">
                                {lead.contact?.first_name || "Unknown"}{" "}
                                {lead.contact?.last_name || ""}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {lead.contact?.email || "-"}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {lead.updated_at ? formatDate(lead.updated_at) : formatDate(lead.created_at)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {(() => {
                              const verificationIcons = getVerificationIcons(lead);
                              if (verificationIcons.length === 0) {
                                return <span className="text-gray-400 dark:text-gray-500">-</span>;
                              }
                              return (
                                <div className="flex items-center gap-1.5">
                                  {verificationIcons.map((iconName) => (
                                    <div
                                      key={iconName}
                                      title={iconName.charAt(0).toUpperCase() + iconName.slice(1)}
                                      className="inline-flex"
                                    >
                                      <Icon
                                        name={iconName}
                                        size={20}
                                        className="opacity-80 hover:opacity-100 transition-opacity rounded"
                                      />
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>
                        </td>
                      </TableRow>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="mt-6">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={onPageChange}
                />
              </div>
            </>
          ) : (
            <>
              <LeadsCardGrid
                leads={leads}
                selectedLeads={selectedLeads}
                onSelectLead={(leadId, selected) => {
                  setSelectedLeads(prev => {
                    const newSet = new Set(prev);
                    if (selected) {
                      newSet.add(leadId);
                    } else {
                      newSet.delete(leadId);
                    }
                    return newSet;
                  });
                }}
                onLike={(leadId) => {
                  setLikedLeads(prev => {
                    const newSet = new Set(prev);
                    if (newSet.has(leadId)) {
                      newSet.delete(leadId);
                    } else {
                      newSet.add(leadId);
                    }
                    return newSet;
                  });
                }}
                likedLeads={likedLeads}
              />
              <div className="mt-6">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={onPageChange}
                />
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Create New Lead Modal */}
      <LeadCreateWithSelectionModal
        isOpen={isCreateLeadModalOpen}
        onClose={() => setIsCreateLeadModalOpen(false)}
        onSuccess={() => {
          if (onLeadUpdated) {
            onLeadUpdated();
          }
        }}
      />
    </div>
  );
};
