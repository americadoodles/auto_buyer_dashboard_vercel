'use client';

import React, { useMemo, useState } from 'react';
import type { AgentDomain } from '../_data';
import { useAgents } from '../../../lib/agents/useAgents';
import { AgentCard } from './AgentCard';
import { AgentDrawer } from './AgentDrawer';
import { LiveActivityFeed } from './LiveActivityFeed';

type Filter = 'all' | AgentDomain;
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all',         label: 'All' },
  { id: 'CRM',         label: 'CRM' },
  { id: 'Marketplace', label: 'Marketplace' },
  { id: 'Admin',       label: 'Admin' },
];

export const AgentFleetView: React.FC = () => {
  const { agents } = useAgents();
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const filtered = useMemo(
    () => (filter === 'all' ? agents : agents.filter((a) => a.d === filter)),
    [agents, filter]
  );

  const stats = useMemo(() => {
    const active = agents.filter((a) => a.s === 'RUNNING' || a.s === 'THINKING').length;
    const errors = agents.filter((a) => a.s === 'ERROR').length;
    const cost = agents.reduce((s, a) => s + a.cost, 0);
    const tokens = agents.reduce((s, a) => s + a.tu, 0);
    return { active, errors, cost, tokens, total: agents.length };
  }, [agents]);

  const selected = selectedId ? agents.find((a) => a.id === selectedId) ?? null : null;

  return (
    <>
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-4">
        <KpiCard label="Total agents" value={stats.total} />
        <KpiCard label="Active now"   value={stats.active} valueClass="text-claude-success" />
        <KpiCard label="Errors"       value={stats.errors} valueClass={stats.errors ? 'text-claude-danger' : ''} />
        <KpiCard label="Cost today"   value={`$${stats.cost.toFixed(2)}`} />
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-[12px] text-claude-subtle dark:text-coal-400">Domain:</span>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={[
              'px-3 py-1 rounded-full text-[12px] border transition-colors',
              filter === f.id
                ? 'bg-claude-accent/10 dark:bg-claude-accent/15 border-claude-accent/30 text-claude-accent'
                : 'border-claude-divider dark:border-coal-600 text-claude-muted dark:text-coal-400 hover:border-claude-subtle dark:hover:border-coal-500 hover:text-claude-ink dark:hover:text-coal-100',
            ].join(' ')}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-[12px] text-claude-subtle dark:text-coal-400">
          {(stats.tokens / 1_000_000).toFixed(2)}M tokens today
        </span>
      </div>

      {/* Grid + drawer */}
      <div className={`relative grid grid-cols-[repeat(auto-fill,minmax(195px,1fr))] gap-3 ${selected ? 'pr-[316px]' : ''}`}>
        {filtered.map((a, i) => (
          <AgentCard
            key={a.id}
            agent={a}
            delay={i * 0.05}
            selected={selectedId === a.id}
            onClick={() => setSelectedId(selectedId === a.id ? null : a.id)}
          />
        ))}
        {selected && (
          <AgentDrawer agent={selected} onClose={() => setSelectedId(null)} />
        )}
      </div>

      <LiveActivityFeed />
    </>
  );
};

const KpiCard: React.FC<{ label: string; value: React.ReactNode; valueClass?: string }> = ({
  label, value, valueClass,
}) => (
  <div className="bg-claude-surface dark:bg-coal-850 border border-claude-border dark:border-coal-700 rounded-xl px-3.5 py-3 fade-in">
    <div className="text-[11px] text-claude-subtle dark:text-coal-400 mb-1">{label}</div>
    <div className={`text-2xl font-bold leading-none text-claude-ink dark:text-coal-100 ${valueClass ?? ''}`}>
      {value}
    </div>
  </div>
);
