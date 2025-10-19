'use client';

import React, { useState } from 'react';
import { Card } from '../molecules/Card';
import { TableHeader } from '../molecules/TableHeader';
import { TableRow } from '../molecules/TableRow';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Icon } from '../atoms/Icon';
import { Pagination } from '../molecules/Pagination';

interface Deal {
  id: string;
  name: string;
  description: string;
  contact: {
    id: string;
    first_name: string;
    last_name: string;
  };
  deal_value: number;
  probability: number;
  expected_close_date: string;
  deal_stage: {
    id: number;
    name: string;
    color: string;
  };
  deal_category: {
    id: number;
    name: string;
  };
  assigned_to: {
    id: string;
    username: string;
  };
  is_won: boolean;
  is_lost: boolean;
  created_at: string;
  updated_at: string;
}

interface DealStage {
  id: number;
  name: string;
  count: number;
  value: number;
  color: string;
}

interface DealPipelineProps {
  deals: Deal[];
  dealStages: DealStage[];
  totalDeals: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onDealClick: (dealId: string) => void;
  onCreateDeal: () => void;
  onExportDeals: () => void;
}

export const DealPipeline: React.FC<DealPipelineProps> = ({
  deals,
  dealStages,
  totalDeals,
  currentPage,
  totalPages,
  onPageChange,
  onDealClick,
  onCreateDeal,
  onExportDeals
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [assignedFilter, setAssignedFilter] = useState('all');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getStageColor = (stageName: string) => {
    switch (stageName.toLowerCase()) {
      case 'prospecting': return 'blue';
      case 'qualification': return 'green';
      case 'proposal': return 'yellow';
      case 'negotiation': return 'purple';
      case 'closed won': return 'green';
      case 'closed lost': return 'red';
      default: return 'gray';
    }
  };

  const totalPipelineValue = dealStages.reduce((sum, stage) => sum + stage.value, 0);
  const wonDealsValue = deals.filter(deal => deal.is_won).reduce((sum, deal) => sum + deal.deal_value, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Deal Pipeline</h1>
          <p className="text-gray-600 mt-1">
            Manage your sales opportunities ({totalDeals} total)
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={onExportDeals}>
            <Icon name="download" className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={onCreateDeal}>
            <Icon name="plus" className="w-4 h-4 mr-2" />
            New Deal
          </Button>
        </div>
      </div>

      {/* Pipeline Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Stages */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Pipeline Stages</h2>
          <div className="space-y-4">
            {dealStages.map((stage) => (
              <div key={stage.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: stage.color }}></div>
                  <span className="text-sm font-medium text-gray-900">{stage.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">{stage.count} deals</div>
                  <div className="text-xs text-gray-500">{formatCurrency(stage.value)}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-900">Total Pipeline</span>
              <span className="text-sm font-semibold text-gray-900">{formatCurrency(totalPipelineValue)}</span>
            </div>
          </div>
        </Card>

        {/* Revenue Summary */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Revenue Summary</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Won Deals</span>
              <span className="text-sm font-medium text-green-600">{formatCurrency(wonDealsValue)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Pipeline Value</span>
              <span className="text-sm font-medium text-blue-600">{formatCurrency(totalPipelineValue)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Win Rate</span>
              <span className="text-sm font-medium text-gray-900">
                {totalDeals > 0 ? Math.round((deals.filter(deal => deal.is_won).length / totalDeals) * 100) : 0}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Avg Deal Size</span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(totalPipelineValue / Math.max(totalDeals, 1))}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <Input
              type="text"
              placeholder="Search deals..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stage
            </label>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Stages</option>
              {dealStages.map((stage) => (
                <option key={stage.id} value={stage.name.toLowerCase()}>
                  {stage.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              <option value="new_vehicle">New Vehicle Sale</option>
              <option value="used_vehicle">Used Vehicle Sale</option>
              <option value="trade_in">Trade-In</option>
              <option value="financing">Financing</option>
              <option value="service">Service</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assigned To
            </label>
            <select
              value={assignedFilter}
              onChange={(e) => setAssignedFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Users</option>
              <option value="me">Me</option>
              <option value="john">John Doe</option>
              <option value="jane">Jane Smith</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Deal List */}
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <TableHeader
              columns={[
                { key: 'name', label: 'Deal Name', sortable: true },
                { key: 'contact', label: 'Contact', sortable: true },
                { key: 'value', label: 'Value', sortable: true },
                { key: 'stage', label: 'Stage', sortable: true },
                { key: 'probability', label: 'Probability', sortable: true },
                { key: 'expected_close', label: 'Expected Close', sortable: true },
                { key: 'assigned', label: 'Assigned To', sortable: true },
                { key: 'actions', label: 'Actions', sortable: false }
              ]}
            />
            <tbody className="bg-white divide-y divide-gray-200">
              {deals.map((deal) => (
                <TableRow key={deal.id} onClick={() => onDealClick(deal.id)} className="cursor-pointer hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{deal.name}</div>
                      {deal.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">{deal.description}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {deal.contact.first_name} {deal.contact.last_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(deal.deal_value)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge color={getStageColor(deal.deal_stage.name)}>
                      {deal.deal_stage.name}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${deal.probability}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600">{deal.probability}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(deal.expected_close_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {deal.assigned_to.username}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm">
                        <Icon name="eye" className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Icon name="edit" className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Icon name="phone" className="w-4 h-4" />
                      </Button>
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
      </Card>
    </div>
  );
};
