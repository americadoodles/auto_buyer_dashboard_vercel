import React from 'react';
import { Bot, Hand, Check } from 'lucide-react';
import type { KbCard } from '../_data';
import { lqiTone } from '../_helpers';

const lqiClass: Record<'high' | 'mid' | 'low', string> = {
  high: 'bg-claude-success/15 text-claude-success',
  mid:  'bg-claude-info/15 text-claude-info',
  low:  'bg-claude-warning/15 text-claude-warning',
};

interface KanbanCardProps {
  card: KbCard;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({ card }) => {
  const hitlBorder =
    card.hitl === 'warn' ? 'border-claude-warning/40'
    : card.hitl === 'ok' ? 'border-claude-success/40'
    : 'border-claude-border dark:border-coal-700';

  return (
    <div
      onClick={() => alert(`Lead ${card.id}: ${card.v}`)}
      className={`bg-claude-sand dark:bg-coal-800 border ${hitlBorder} rounded-md p-2.5 mb-2 last:mb-0 cursor-pointer hover:-translate-y-px transition-all hover:border-claude-divider dark:hover:border-coal-600`}
    >
      <div className="flex justify-between items-start gap-1 mb-1">
        <span className="text-[11.5px] font-medium text-claude-ink dark:text-coal-100 truncate flex-1 min-w-0">
          {card.v}
        </span>
        <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${lqiClass[lqiTone(card.lqi)]}`}>
          {card.lqi}
        </span>
      </div>

      <div className="text-[12.5px] font-semibold text-claude-ink dark:text-coal-100 mb-0.5">{card.p}</div>
      {card.mi && <div className="text-[11px] text-claude-subtle dark:text-coal-400 mb-1">{card.mi}</div>}

      {card.pr !== undefined && (
        <div className="mb-1.5">
          <div className="h-[2px] bg-claude-divider/60 dark:bg-coal-700 rounded-sm overflow-hidden mb-0.5">
            <div className="h-full bg-claude-info rounded-sm" style={{ width: `${card.pr}%` }} />
          </div>
          <div className="text-[11px] text-claude-info">{card.pr}% scored</div>
        </div>
      )}

      {card.rep && <div className="text-[11px] text-claude-muted dark:text-coal-300 mb-1 truncate">{card.rep}</div>}
      {card.offer && <div className="text-[11px] text-claude-warning mb-1">{card.offer}</div>}

      {card.hitl === 'warn' && (
        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-claude-warning/10 text-claude-warning border border-claude-warning/30 mb-1">
          <Hand className="w-3 h-3" /> Needs approval
        </div>
      )}
      {card.hitl === 'ok' && (
        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-claude-success/10 text-claude-success border border-claude-success/30 mb-1">
          <Check className="w-3 h-3" /> Approved
        </div>
      )}

      <div className="flex justify-between items-center pt-1.5 border-t border-claude-border/60 dark:border-coal-700/60">
        <span className="inline-flex items-center gap-1 text-[11px] text-claude-subtle dark:text-coal-400">
          <Bot className="w-3 h-3" /> {card.ag}
        </span>
        <span className="text-[11px] text-claude-subtle dark:text-coal-400">{card.age}</span>
      </div>
    </div>
  );
};
