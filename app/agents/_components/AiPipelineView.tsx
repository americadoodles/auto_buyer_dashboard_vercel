'use client';

import React, { useMemo } from 'react';
import { Bot, Hand } from 'lucide-react';
import { KB_COLS, KB_CARDS, RA_ROWS } from '../_data';
import { KanbanCard } from './KanbanCard';

export const AiPipelineView: React.FC = () => {
  const { totalCards, totalVal } = useMemo(() => {
    const all = Object.values(KB_CARDS).flat();
    return {
      totalCards: all.length,
      totalVal: all.reduce((s, c) => s + parseFloat(c.p.replace(/[$,]/g, '')), 0),
    };
  }, []);

  return (
    <>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <span className="status-dot running" />
          <span className="inline-flex items-center gap-1.5 text-[12px] text-claude-muted dark:text-coal-300">
            <Bot className="w-3.5 h-3.5" />
            Agents autonomously create, score, and advance every card
          </span>
        </div>
        <div className="text-[13px] text-claude-muted dark:text-coal-300">
          <strong className="text-claude-ink dark:text-coal-100">{totalCards}</strong> active leads
          <span className="mx-1.5">·</span>
          <strong className="text-claude-ink dark:text-coal-100">${totalVal.toLocaleString()}</strong> pipeline value
        </div>
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-2 mb-4 kanban-scrollbar">
        {KB_COLS.map((col) => {
          const cards = KB_CARDS[col.id] ?? [];
          return (
            <div
              key={col.id}
              className="bg-claude-surface dark:bg-coal-850 border border-claude-border dark:border-coal-700 rounded-xl p-2.5 min-w-[170px] flex-1 max-w-[195px]"
            >
              <div className="flex gap-1.5 items-start mb-2.5 pb-2 border-b border-claude-border dark:border-coal-700">
                <div className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ background: col.dot }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-medium leading-tight mb-0.5" style={{ color: col.dot }}>
                    {col.label}
                  </div>
                  {col.ai && (
                    <div className="inline-flex items-center gap-1 text-[11px] text-claude-subtle dark:text-coal-400">
                      <Bot className="w-3 h-3" /> AI scoring
                    </div>
                  )}
                  {col.hitl && (
                    <div className="inline-flex items-center gap-1 text-[11px] text-claude-warning">
                      <Hand className="w-3 h-3" /> Human gate
                    </div>
                  )}
                </div>
                <div className="text-[11px] text-claude-subtle dark:text-coal-400 bg-claude-sand dark:bg-coal-800 border border-claude-border dark:border-coal-700 rounded-full px-1.5 py-0.5 shrink-0">
                  {cards.length}
                </div>
              </div>

              {cards.map((c) => <KanbanCard key={c.id} card={c} />)}

              {col.ai && (
                <div className="text-center py-2 border border-dashed border-claude-divider dark:border-coal-600 rounded-md mt-1">
                  <div className="flex justify-center gap-[3px] mb-1">
                    <span className="think-dot b1" />
                    <span className="think-dot b2" />
                    <span className="think-dot b3" />
                  </div>
                  <div className="text-[11px] text-claude-subtle dark:text-coal-400">5 in queue</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-claude-surface dark:bg-coal-850 border border-claude-border dark:border-coal-700 rounded-xl p-3.5">
        <div className="flex items-center gap-2 mb-3">
          <Bot className="w-4 h-4 text-claude-subtle dark:text-coal-400" />
          <span className="text-[14px] font-medium text-claude-ink dark:text-coal-100">Recent AI actions</span>
        </div>
        {RA_ROWS.map((r, i) => (
          <div
            key={i}
            className="log-roll flex items-start gap-2.5 py-1.5 border-b border-claude-border/60 dark:border-coal-700/60 last:border-b-0"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <span className="font-mono text-[11px] text-claude-subtle dark:text-coal-400 whitespace-nowrap pt-px shrink-0">
              {r.t}
            </span>
            <span className="text-[12px] text-claude-muted dark:text-coal-300 flex-1 leading-snug">{r.msg}</span>
            <span className="text-[11px] text-claude-subtle dark:text-coal-400 whitespace-nowrap shrink-0">
              {r.a}
            </span>
          </div>
        ))}
      </div>
    </>
  );
};
