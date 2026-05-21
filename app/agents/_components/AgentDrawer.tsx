import React from 'react';
import Link from 'next/link';
import { X, ArrowLeft, Terminal, Settings, Clock, Cpu } from 'lucide-react';
import type { AgentRecord } from '../_data';
import { domainChipClass, srTone } from '../_helpers';

interface AgentDrawerProps {
  agent: AgentRecord;
  onClose: () => void;
}

const srValClass: Record<'good' | 'warn' | 'bad', string> = {
  good: 'text-claude-success',
  warn: 'text-claude-warning',
  bad: 'text-claude-danger',
};

export const AgentDrawer: React.FC<AgentDrawerProps> = ({ agent, onClose }) => {
  return (
    <div className="slide-in absolute right-0 top-0 w-[300px] bg-claude-surface dark:bg-coal-850 border border-claude-divider dark:border-coal-600 rounded-xl p-4 shadow-sm">
      <div className="flex justify-between items-start mb-3.5">
        <div>
          <div className="text-[15px] font-semibold text-claude-ink dark:text-coal-100 mb-1">{agent.n}</div>
          <span className={domainChipClass(agent.d)}>{agent.d}</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="p-1 text-claude-subtle hover:text-claude-ink dark:hover:text-coal-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-claude-sand dark:bg-coal-800 border border-claude-border dark:border-coal-700 rounded-md p-2.5 mb-3">
        <div className="text-[11px] text-claude-subtle dark:text-coal-400 mb-1">Current task</div>
        <div className="text-[12.5px] leading-snug text-claude-text dark:text-coal-200">{agent.task}</div>
      </div>

      {agent.from && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-claude-sand dark:bg-coal-800 border border-claude-border dark:border-coal-700 rounded-md mb-3 text-[12px] text-claude-muted dark:text-coal-300">
          <ArrowLeft className="w-3 h-3 text-claude-subtle" />
          Handoff from{' '}
          <strong className="text-claude-ink dark:text-coal-100 ml-1">{agent.from}</strong>
        </div>
      )}

      <div className="grid grid-cols-2 gap-1.5 mb-3.5">
        <DrawerKpi label="Tasks today"   value={String(agent.td)} />
        <DrawerKpi label="Success rate"  value={`${agent.sr}%`} valueClass={srValClass[srTone(agent.sr)]} />
        <DrawerKpi label="Cost today"    value={`$${agent.cost.toFixed(2)}`} />
        <DrawerKpi label="Conv. turns"   value={agent.turns.toLocaleString()} />
      </div>

      <div className="flex items-center gap-2 mb-3 text-[11px] text-claude-subtle dark:text-coal-400">
        <Cpu className="w-3 h-3" /> {agent.model}
        <span className="mx-1">·</span>
        <Clock className="w-3 h-3" /> {agent.uptimeHrs}h uptime
      </div>

      <div className="text-[12px] font-medium text-claude-muted dark:text-coal-300 mb-1.5">
        Agent log
      </div>
      <div className="bg-claude-sand dark:bg-coal-800 border border-claude-border dark:border-coal-700 rounded-md p-2">
        {agent.logs.map((l, i) => (
          <div
            key={i}
            className="log-roll font-mono text-[11px] text-claude-muted dark:text-coal-300 py-0.5 leading-snug border-b border-claude-border/60 dark:border-coal-700/60 last:border-b-0"
            style={{ animationDelay: `${i * 0.07}s` }}
          >
            {l}
          </div>
        ))}
      </div>

      <div className="flex gap-1.5 mt-3">
        <button
          type="button"
          className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-md border border-claude-divider dark:border-coal-600 text-claude-muted dark:text-coal-300 hover:text-claude-ink dark:hover:text-coal-100 hover:border-claude-subtle dark:hover:border-coal-500 transition-colors text-[11.5px]"
        >
          <Terminal className="w-3.5 h-3.5" /> Console
        </button>
        <Link
          href="/agents/builder"
          className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-md border border-claude-divider dark:border-coal-600 text-claude-muted dark:text-coal-300 hover:text-claude-ink dark:hover:text-coal-100 hover:border-claude-subtle dark:hover:border-coal-500 transition-colors text-[11.5px]"
        >
          <Settings className="w-3.5 h-3.5" /> Config
        </Link>
      </div>
    </div>
  );
};

const DrawerKpi: React.FC<{ label: string; value: string; valueClass?: string }> = ({ label, value, valueClass }) => (
  <div className="bg-claude-sand dark:bg-coal-800 border border-claude-border dark:border-coal-700 rounded-md px-2.5 py-2">
    <div className="text-[11px] text-claude-subtle dark:text-coal-400 mb-0.5">{label}</div>
    <div className={`text-[19px] font-bold text-claude-ink dark:text-coal-100 ${valueClass ?? ''}`}>{value}</div>
  </div>
);
