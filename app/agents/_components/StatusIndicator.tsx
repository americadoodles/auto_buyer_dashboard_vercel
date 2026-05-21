import React from 'react';
import type { AgentStatus } from '../_data';
import { statusLabel, statusTextClass } from '../_helpers';

export const StatusDot: React.FC<{ status: AgentStatus }> = ({ status }) => {
  if (status === 'THINKING') {
    return (
      <span className="inline-flex items-end gap-[3px] h-2">
        <span className="think-dot b1" />
        <span className="think-dot b2" />
        <span className="think-dot b3" />
      </span>
    );
  }
  const cls =
    status === 'RUNNING' ? 'status-dot running'
    : status === 'ERROR' ? 'status-dot error'
    : status === 'PAUSED' ? 'status-dot paused'
    : 'status-dot idle';
  return <span className={cls} />;
};

export const StatusLabel: React.FC<{ status: AgentStatus }> = ({ status }) => (
  <span className={`text-[11.5px] font-medium ${statusTextClass[status]}`}>
    {statusLabel[status]}
  </span>
);
