'use client';

import React from 'react';
import { Lead as BaseLead } from '../../lib/types/lead';
import { LeadCard } from '../molecules/LeadCard';

// Extended Lead type matching LeadManagement's transformed type
type Lead = Omit<BaseLead, 'status' | 'assigned_to' | 'source'> & {
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

interface LeadsCardGridProps {
  leads: Lead[];
  selectedLeads?: Set<string>;
  onSelectLead?: (leadId: string, selected: boolean) => void;
  onLike?: (leadId: string) => void;
  likedLeads?: Set<string>;
}

export const LeadsCardGrid: React.FC<LeadsCardGridProps> = ({
  leads,
  selectedLeads = new Set(),
  onSelectLead,
  onLike,
  likedLeads = new Set(),
}) => {
  if (leads.length === 0) {
    return (
      <div className="text-center py-12 text-claude-subtle dark:text-coal-400">
        <p className="text-lg">No leads found</p>
        <p className="text-sm mt-2">Try adjusting your filters or search criteria</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {leads.map((lead) => (
        <LeadCard
          key={lead.id}
          lead={lead}
          isSelected={selectedLeads.has(lead.id)}
          onSelect={onSelectLead}
          onLike={onLike}
          isLiked={likedLeads.has(lead.id)}
        />
      ))}
    </div>
  );
};

