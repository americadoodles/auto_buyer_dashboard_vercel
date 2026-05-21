import React from 'react';
import { Cpu, Check } from 'lucide-react';
import type { AgentRecord } from '../_data';
import { pct, barColor, costColor, srTone, domainChipClass } from '../_helpers';
import { StatusDot, StatusLabel } from './StatusIndicator';
import { MeterBar } from './MeterBar';

interface AgentCardProps {
  agent: AgentRecord;
  selected: boolean;
  delay: number;
  onClick: () => void;
}

const srToneClass: Record<'good' | 'warn' | 'bad', string> = {
  good: 'text-claude-success',
  warn: 'text-claude-warning',
  bad: 'text-claude-danger',
};

export const AgentCard: React.FC<AgentCardProps> = ({ agent, selected, delay, onClick }) => {
  const isErr = agent.s === 'ERROR';
  const tp = pct(agent.tu, agent.tc);
  const cp = pct(agent.cost, agent.cc);

  return (
    <div
      onClick={onClick}
      style={{ animationDelay: `${delay}s` }}
      className={[
        'fade-in cursor-pointer rounded-xl p-3.5 transition-all duration-150',
        'bg-claude-surface dark:bg-coal-850 border',
        selected
          ? 'border-claude-accent shadow-[0_0_0_3px_rgba(204,120,92,0.12)]'
          : isErr
            ? 'border-claude-danger/40 hover:border-claude-danger'
            : 'border-claude-border dark:border-coal-700 hover:border-claude-divider dark:hover:border-coal-600',
        'hover:-translate-y-px',
      ].join(' ')}
    >
      <div className="flex justify-between items-start mb-2 gap-1.5">
        <span className="text-[13px] font-semibold text-claude-ink dark:text-coal-100 truncate flex-1 min-w-0">
          {agent.n}
        </span>
        <span className={domainChipClass(agent.d)}>{agent.d}</span>
      </div>

      <div className="flex items-center gap-1.5 mb-1.5">
        <StatusDot status={agent.s} />
        <StatusLabel status={agent.s} />
        {agent.cf != null && (
          <span className="text-[11px] text-claude-subtle dark:text-coal-400 ml-1">
            · {agent.cf}% conf
          </span>
        )}
      </div>

      <p className={`text-[12px] leading-snug mb-2.5 line-clamp-2 ${isErr ? 'text-claude-danger' : 'text-claude-muted dark:text-coal-300'}`}>
        {agent.task}
      </p>

      <div className="flex gap-1.5 flex-wrap mb-2.5">
        <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-md bg-claude-sand dark:bg-coal-800 border border-claude-border dark:border-coal-700 text-claude-muted dark:text-coal-300">
          <Check className="w-3 h-3" /> {agent.td}
        </span>
        <span className={`text-[11px] px-1.5 py-0.5 rounded-md bg-claude-sand dark:bg-coal-800 border border-claude-border dark:border-coal-700 ${srToneClass[srTone(agent.sr)]}`}>
          {agent.sr}%
        </span>
        <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-claude-sand dark:bg-coal-800 border border-claude-border dark:border-coal-700 text-claude-muted dark:text-coal-300">
          {agent.turns.toLocaleString()} turns
        </span>
      </div>

      <MeterBar
        label="Context window"
        valueText={`${(agent.tu / 1000).toFixed(0)}k / ${(agent.tc / 1000).toFixed(0)}k`}
        pct={tp}
        color={barColor(tp)}
      />
      <MeterBar
        label="Daily budget"
        valueText={`$${agent.cost.toFixed(2)} / $${agent.cc}`}
        pct={cp}
        color={costColor(cp)}
      />

      <div className="flex justify-between items-center pt-2 mt-0.5 border-t border-claude-border dark:border-coal-700">
        <span className="inline-flex items-center gap-1 text-[11px] text-claude-subtle dark:text-coal-400">
          <Cpu className="w-3 h-3" /> {agent.model}
        </span>
        <span className="text-[11px] text-claude-subtle dark:text-coal-400">{agent.age}</span>
      </div>
    </div>
  );
};
