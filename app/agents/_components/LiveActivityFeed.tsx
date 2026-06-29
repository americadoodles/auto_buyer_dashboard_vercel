import React from 'react';
import { useAgentEvents } from '../../../lib/agents/useAgents';
import { domainChipClass } from '../_helpers';

const MAX_ROWS = 7;

export const LiveActivityFeed: React.FC = () => {
  const { events, connected } = useAgentEvents();

  return (
    <div className="bg-claude-surface dark:bg-coal-850 border border-claude-border dark:border-coal-700 rounded-xl p-3.5 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <span className={connected ? 'status-dot running' : 'status-dot idle'} />
        <span className="text-[14px] font-medium text-claude-ink dark:text-coal-100">Live activity</span>
        <span className="ml-auto text-[11.5px] text-claude-subtle dark:text-coal-400">
          {connected ? 'Streaming · /api/agents/events' : 'Connecting…'}
        </span>
      </div>
      <div>
        {events.slice(0, MAX_ROWS).map((e, i) => (
          <div
            key={`${e.t}-${i}`}
            className="log-roll flex items-start gap-2.5 py-1.5 border-b border-claude-border/60 dark:border-coal-700/60 last:border-b-0"
            style={{ animationDelay: `${i * 0.04}s` }}
          >
            <span className="font-mono text-[11px] text-claude-subtle dark:text-coal-400 whitespace-nowrap pt-px shrink-0">
              {e.t}
            </span>
            <span className={domainChipClass(e.d)}>{e.d}</span>
            <span className="text-[12px] text-claude-subtle dark:text-coal-400 whitespace-nowrap shrink-0">{e.a}</span>
            <span className={`text-[12px] leading-snug ${e.err ? 'text-claude-danger' : 'text-claude-muted dark:text-coal-300'}`}>
              {e.msg}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
