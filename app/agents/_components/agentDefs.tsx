// UI definitions for every controllable AI agent shown on /agents.
// Adding a new agent = register it in the backend registry + add an entry here.

import React from 'react';
import {
  ScanSearch, Target, ShieldAlert, MessageSquareText, ListTodo,
} from 'lucide-react';
import type { AgentReport } from '../../../lib/agents/agentControl';

export interface AgentDef {
  id: string;                 // must match the backend registry key
  title: string;
  description: string;        // one line under the title
  icon: React.ReactNode;
  /** One-line summary of a completed report (console + recent-reports list). */
  summarize: (r: AgentReport) => string;
}

const rep = (r: AgentReport) => (r.report ?? {}) as Record<string, any>;

export const AGENT_DEFS: AgentDef[] = [
  {
    id: 'damage-detection',
    title: 'Damage Detection Agent',
    description: 'Vision analysis of listing photos — passenger + light commercial only',
    icon: <ScanSearch className="w-4 h-4 text-claude-accent" />,
    summarize: (r) => {
      const p = rep(r);
      return `${p.damage_count ?? 0} damage(s) · ${p.overall_condition ?? '—'} · ${r.images_analyzed ?? 0} img`;
    },
  },
  {
    id: 'lead-scoring',
    title: 'Lead Scoring Agent',
    description: 'Scores unconverted CRM leads 0–100 with reasoning and next action',
    icon: <Target className="w-4 h-4 text-claude-accent" />,
    summarize: (r) => {
      const p = rep(r);
      return `score ${p.score ?? '—'} · ${p.tier ?? '—'}`;
    },
  },
  {
    id: 'deal-risk',
    title: 'Deal Risk Agent',
    description: 'Flags open deals at risk of stalling, with recommended actions',
    icon: <ShieldAlert className="w-4 h-4 text-claude-accent" />,
    summarize: (r) => {
      const p = rep(r);
      return `${p.risk_level ?? '—'} risk (${p.risk_score ?? '—'}/100)`;
    },
  },
  {
    id: 'followup-drafter',
    title: 'Follow-up Drafter Agent',
    description: 'Drafts follow-ups for sellers who went quiet after our last message (drafts only — nothing is sent)',
    icon: <MessageSquareText className="w-4 h-4 text-claude-accent" />,
    summarize: (r) => {
      const p = rep(r);
      return `${p.channel ?? '—'} draft · ${p.tone ?? '—'}`;
    },
  },
  {
    id: 'task-generator',
    title: 'Task Generator Agent',
    description: 'Proposes follow-up tasks for stale leads/deals with no open task (proposals only — no tasks created)',
    icon: <ListTodo className="w-4 h-4 text-claude-accent" />,
    summarize: (r) => {
      const p = rep(r);
      return `${p.task_count ?? 0} task(s) proposed`;
    },
  },
];
