// UI definitions for every controllable AI agent shown on /agents.
// Adding a new agent = register it in the backend registry + add an entry here.

import React from 'react';
import {
  ScanSearch, Target, ShieldAlert, MessageSquareText, ListTodo, ShoppingCart, MessageCircle,
} from 'lucide-react';
import type { AgentReport } from '../../../lib/agents/agentControl';

export interface AgentDef {
  id: string;                 // must match the backend registry key
  title: string;
  description: string;        // one line under the title
  icon: React.ReactNode;
  /** One-line summary of a completed report (console + recent-reports list). */
  summarize: (r: AgentReport) => string;
  /** Optional custom panel component. If omitted, the generic AgentControlPanel
   *  is used. Agents with a non-standard run config (e.g. fb-scraper's rich
   *  filter form) supply their own. */
  Panel?: React.ComponentType<{ def: AgentDef; defaultOpen?: boolean }>;
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
      const possible = p.possible_damage_count ? ` (+${p.possible_damage_count} possible)` : '';
      return `${p.damage_count ?? 0} damage(s)${possible} · ${p.overall_condition ?? '—'} · ${r.images_analyzed ?? 0} img`;
    },
  },
  {
    id: 'lead-scoring',
    title: 'Lead Scoring Agent',
    description: 'Scores scraped vehicles (listings) against a fixed-point buy/no-buy rubric (deterministic, not AI). Date filter selects vehicles by listing date.',
    icon: <Target className="w-4 h-4 text-claude-accent" />,
    summarize: (r) => {
      const p = rep(r);
      const pts = typeof p.total_points === 'number' ? `${p.total_points >= 0 ? '+' : ''}${p.total_points}` : '—';
      return `${pts} pts · ${p.verdict ?? '—'}`;
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
  {
    id: 'fb-scraper',
    title: 'FB Marketplace Scraper Agent',
    description: 'Drives a connected Chrome extension to scrape FB Marketplace via captured GraphQL templates',
    icon: <ShoppingCart className="w-4 h-4 text-claude-accent" />,
    summarize: (r) => {
      const p = rep(r);
      return `${p.processed ?? 0} listing(s) scraped`;
    },
    // Panel is wired in app/agents/_components/FbScraperPanel.tsx to avoid a
    // circular import (agentDefs is a pure data module).
  },
  {
    id: 'fb-messenger',
    title: 'FB Messenger Agent',
    description: 'Reads and replies to Facebook Marketplace seller messages in real time via the connected Chrome extension',
    icon: <MessageCircle className="w-4 h-4 text-claude-accent" />,
    summarize: (r) => {
      const p = rep(r);
      return `${p.message_count ?? 0} message(s)`;
    },
    // Panel is wired in app/agents/_components/FbMessengerPanel.tsx to avoid a
    // circular import (agentDefs is a pure data module).
  },
];
