"use client";

import React, { useState } from "react";
import { Card } from "../molecules/Card";
import { TableHeader } from "../molecules/TableHeader";
import { TableRow } from "../molecules/TableRow";
import { Badge } from "../atoms/Badge";
import { Button } from "../atoms/Button";
import { Input } from "../atoms/Input";
import { Icon } from "../atoms/Icon";
import { Pagination } from "../molecules/Pagination";
import { LeadEditModal } from "./LeadEditModal";
import { Lead as BaseLead, LeadStatus, LeadSource } from "../../lib/types/lead";

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
  onCreateLead: () => void;
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
}

export const LeadManagement: React.FC<LeadManagementProps> = ({
  leads,
  totalLeads,
  currentPage,
  totalPages,
  onPageChange,
  onLeadClick,
  onCreateLead,
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
  statuses,
  sources,
  assignedToUsers,
  locations,
  loading,
  onLeadUpdated,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  
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
    setEditingLead(lead);
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

  return (
    <div>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Lead Management
            </h1>
            <p className="text-gray-600 mt-1">
              Manage and track your leads ({totalLeads} total)
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onExportLeads}>
              <Icon name="download" className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button onClick={onCreateLead}>
              <Icon name="plus" className="w-4 h-4 mr-2" />
              New Lead
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => handleStatusFilterChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="all">All Status</option>
                {statuses ? (
                  statuses.map((status) => (
                    <option key={status.id} value={status.id.toString()}>
                      {status.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="converted">Converted</option>
                    <option value="lost">Lost</option>
                  </>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Source
              </label>
              <select
                value={sourceFilter}
                onChange={(e) => handleSourceFilterChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="all">All Sources</option>
                {sources ? (
                  sources.map((source) => (
                    <option key={source.id} value={source.id.toString()}>
                      {source.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="website">Website</option>
                    <option value="referral">Referral</option>
                    <option value="email">Email Campaign</option>
                    <option value="social">Social Media</option>
                    <option value="vehicle">Vehicle Listing</option>
                  </>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assigned To
              </label>
              <select
                value={assignedFilter}
                onChange={(e) => handleAssignedToFilterChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <select
                value={locationFilter}
                onChange={(e) => handleLocationFilterChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Icon name="users" className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total Leads</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {totalLeads}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Icon
                    name="check-circle"
                    className="w-4 h-4 text-green-600"
                  />
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Qualified</p>
                <p className="text-2xl font-semibold text-gray-900">
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
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Icon name="clock" className="w-4 h-4 text-yellow-600" />
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">
                  New This Week
                </p>
                <p className="text-2xl font-semibold text-gray-900">
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
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <Icon
                    name="trending-up"
                    className="w-4 h-4 text-purple-600"
                  />
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Avg Score</p>
                <p className="text-2xl font-semibold text-gray-900">
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
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <TableHeader
                columns={[
                  { key: "name", label: "Name", sortable: true },
                  { key: "email", label: "Email", sortable: true },
                  { key: "phone", label: "Phone", sortable: true },
                  { key: "status", label: "Status", sortable: true },
                  { key: "source", label: "Source", sortable: true },
                  { key: "assigned_to", label: "Assigned To", sortable: true },
                  { key: "location", label: "Location", sortable: true },
                  { key: "vin", label: "VIN", sortable: true },
                  { key: "year", label: "Year", sortable: true },
                  { key: "make", label: "Make", sortable: true },
                  { key: "model", label: "Model", sortable: true },
                  { key: "trim", label: "Trim", sortable: true },
                  { key: "miles", label: "Miles", sortable: true },
                  { key: "score", label: "Score", sortable: true },
                  { key: "created", label: "Created", sortable: true },
                ]}
              />
              <tbody className="bg-white divide-y divide-gray-200">
                {leads.map((lead) => (
                  <TableRow
                    key={lead.id}
                    onClick={() => handleEditLead(lead)}
                    className="cursor-pointer group transition-colors duration-150"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-300 group-hover:bg-blue-500 transition-colors duration-150 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700 group-hover:text-white transition-colors duration-150">
                              {lead.contact?.first_name?.[0] || "?"}
                              {lead.contact?.last_name?.[0] || "?"}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors duration-150">
                            {lead.contact?.first_name || "Unknown"}{" "}
                            {lead.contact?.last_name || ""}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {lead.contact?.email || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {lead.contact?.phone || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge color={lead.status.color}>
                        {lead.status.name}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {lead.source?.name || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {lead.assigned_to?.username || "Unassigned"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {lead.listing?.location || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {lead.listing?.vin || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {lead.listing?.year || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {lead.listing?.make || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {lead.listing?.model || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {lead.listing?.trim || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {lead.listing?.miles?.toLocaleString() || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge color={getScoreColor(lead.lead_score)}>
                        {lead.lead_score}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(lead.created_at)}
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
        </Card>
      </div>
      {/* Edit Lead Modal */}
      {editingLead && (
        <LeadEditModal
          lead={editingLead as any}
          isOpen={!!editingLead}
          onClose={() => setEditingLead(null)}
          onSave={(updatedLead) => {
            setEditingLead(null);
            // Call the parent callback to refresh leads
            if (onLeadUpdated) {
              onLeadUpdated();
            }
          }}
          statuses={statuses}
          sources={sources}
        />
      )}
    </div>
  );
};
