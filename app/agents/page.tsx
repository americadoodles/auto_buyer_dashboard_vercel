'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { LayoutGrid, LayoutDashboard, Settings2 } from 'lucide-react';
import { useAgents } from '../../lib/agents/useAgents';
import { AgentFleetView } from './_components/AgentFleetView';
import { AiPipelineView } from './_components/AiPipelineView';
import { AgentControlPanel } from './_components/AgentControlPanel';
import { FbScraperPanel } from './_components/FbScraperPanel';
import { AGENT_DEFS } from './_components/agentDefs';

type Tab = 'fleet' | 'pipeline';

export default function AgentsPage() {
  const [tab, setTab] = useState<Tab>('fleet');
  const { agents } = useAgents();

  const active = agents.filter((a) => a.s === 'RUNNING' || a.s === 'THINKING').length;
  const totalCost = agents.reduce((s, a) => s + a.cost, 0);
  const totalTasks = agents.reduce((s, a) => s + a.td, 0);

  return (
    <div className="px-6 py-5 max-w-[1280px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5 pb-4 border-b border-claude-border dark:border-coal-700 flex-wrap">
        <div className="flex items-center gap-2.5 flex-1 min-w-[240px]">
          <span className="status-dot running" />
          <h1 className="text-[17px] font-semibold tracking-tight text-claude-ink dark:text-coal-100">
            Agent Command Center
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <HeaderStat label="active agents" value={active} />
          <HeaderStat label="cost today" value={`$${totalCost.toFixed(2)}`} />
          <HeaderStat label="tasks today" value={totalTasks.toLocaleString()} />
          <Link
            href="/agents/builder"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] text-white bg-claude-accent hover:bg-claude-accent/90 transition-colors"
          >
            <Settings2 className="w-3.5 h-3.5" /> Agent Builder
          </Link>
        </div>
      </div>

      {/* Live agent control panels (first panel expanded by default).
          fb-scraper gets a custom panel with the rich filter form; other
          agents use the generic control panel. */}
      <div className="space-y-3 mb-5">
        {AGENT_DEFS.map((def, i) => {
          const defaultOpen = i === 0;
          if (def.id === 'fb-scraper') {
            return <FbScraperPanel key={def.id} def={def} defaultOpen={defaultOpen} />;
          }
          return <AgentControlPanel key={def.id} def={def} defaultOpen={defaultOpen} />;
        })}
      </div>

      {/* Tabs */}
      <div className="inline-flex gap-1 bg-claude-surface dark:bg-coal-850 border border-claude-border dark:border-coal-700 rounded-xl p-1 mb-5">
        <TabBtn
          icon={<LayoutGrid className="w-3.5 h-3.5" />}
          label="Agent Fleet"
          active={tab === 'fleet'}
          onClick={() => setTab('fleet')}
        />
        <TabBtn
          icon={<LayoutDashboard className="w-3.5 h-3.5" />}
          label="AI Pipeline"
          active={tab === 'pipeline'}
          onClick={() => setTab('pipeline')}
        />
      </div>

      {tab === 'fleet' ? <AgentFleetView /> : <AiPipelineView />}
    </div>
  );
}

const HeaderStat: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="text-[12px] text-claude-subtle dark:text-coal-400 px-2.5 py-1 rounded-md bg-claude-surface dark:bg-coal-850 border border-claude-border dark:border-coal-700">
    <strong className="text-claude-muted dark:text-coal-300">{value}</strong> {label}
  </div>
);

const TabBtn: React.FC<{
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={[
      'inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[13px] transition-colors',
      active
        ? 'bg-claude-sand dark:bg-coal-800 border border-claude-divider dark:border-coal-600 text-claude-ink dark:text-coal-100 font-medium'
        : 'border border-transparent text-claude-muted dark:text-coal-400 hover:bg-claude-sand dark:hover:bg-coal-800 hover:text-claude-ink dark:hover:text-coal-100',
    ].join(' ')}
  >
    {icon} {label}
  </button>
);
