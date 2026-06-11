'use client';

// Generic control panel for one AI agent on the /agents page.
// Start / Pause / Resume / Stop, optional entity created-date range, live
// progress, recent reports. Full JSON reports stream to the browser console.

import React, { useState } from 'react';
import {
  Play, Pause, Square, RotateCcw, Terminal, AlertTriangle, CalendarRange,
  ChevronDown, ChevronRight,
} from 'lucide-react';
import { useAgentControl } from '../../../lib/agents/useAgentControl';
import type { AgentRunStatus, AgentReport } from '../../../lib/agents/agentControl';
import type { AgentDef } from './agentDefs';

const STATUS_META: Record<AgentRunStatus, { label: string; dot: string }> = {
  idle: { label: 'Idle', dot: 'bg-claude-subtle dark:bg-coal-500' },
  running: { label: 'Running', dot: 'bg-emerald-500 animate-pulse' },
  paused: { label: 'Paused', dot: 'bg-amber-500' },
  stopped: { label: 'Stopped', dot: 'bg-claude-subtle dark:bg-coal-500' },
  completed: { label: 'Completed', dot: 'bg-sky-500' },
  error: { label: 'Error', dot: 'bg-red-500' },
};

export function AgentControlPanel({ def, defaultOpen = false }: { def: AgentDef; defaultOpen?: boolean }) {
  const { status, reports, busy, error, start, pause, resume, stop, clearError } =
    useAgentControl(def.id, def.summarize);
  const [open, setOpen] = useState(defaultOpen);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const s: AgentRunStatus = status?.status ?? 'idle';
  const meta = STATUS_META[s];
  const running = s === 'running';
  const paused = s === 'paused';
  const canStart = !busy && !running && !paused;
  const pct = status?.progress_pct ?? 0;
  const activeRange = status?.run_config
    ? [status.run_config.date_from, status.run_config.date_to].filter(Boolean).join(' → ')
    : '';
  const startWithRange = (restart: boolean) =>
    start({ restart, dateFrom: dateFrom || null, dateTo: dateTo || null });

  return (
    <section className="rounded-xl border border-claude-border dark:border-coal-700 bg-claude-surface dark:bg-coal-850 p-4">
      {/* Header row (always visible; toggles the body) */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2.5 flex-1 min-w-[240px] text-left"
          aria-expanded={open}
        >
          {open
            ? <ChevronDown className="w-3.5 h-3.5 text-claude-subtle dark:text-coal-400" />
            : <ChevronRight className="w-3.5 h-3.5 text-claude-subtle dark:text-coal-400" />}
          {def.icon}
          <span className="text-[14px] font-semibold text-claude-ink dark:text-coal-100">{def.title}</span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] border border-claude-border dark:border-coal-700 text-claude-muted dark:text-coal-300">
            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
          </span>
          {(running || paused) && (
            <span className="text-[11px] text-claude-subtle dark:text-coal-400">
              {status?.processed ?? 0}/{status?.total ?? 0} · {pct}%
            </span>
          )}
        </button>

        {/* Controls */}
        <div className="flex items-center gap-1.5">
          <CtrlBtn label="Start" icon={<Play className="w-3.5 h-3.5" />} disabled={!canStart} onClick={() => startWithRange(false)} accent />
          <CtrlBtn label="Pause" icon={<Pause className="w-3.5 h-3.5" />} disabled={busy || !running} onClick={pause} />
          <CtrlBtn label="Resume" icon={<Play className="w-3.5 h-3.5" />} disabled={busy || !paused} onClick={resume} />
          <CtrlBtn label="Stop" icon={<Square className="w-3.5 h-3.5" />} disabled={busy || (!running && !paused)} onClick={stop} />
          <CtrlBtn label="Restart" icon={<RotateCcw className="w-3.5 h-3.5" />} disabled={!canStart} onClick={() => startWithRange(true)} title="Re-analyze everything in range from scratch" />
        </div>
      </div>

      {/* Error banner (visible even when collapsed — failures must surface) */}
      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-red-300/50 bg-red-500/10 px-3 py-2 text-[12px] text-red-600 dark:text-red-400">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={clearError} className="text-[11px] underline opacity-70 hover:opacity-100">dismiss</button>
        </div>
      )}

      {open && (
        <>
          <p className="mt-2 text-[12px] text-claude-subtle dark:text-coal-400">{def.description}</p>

          {/* Created-date range (applies on Start / Restart) */}
          <div className="mt-3 flex items-center gap-2 flex-wrap text-[12px] text-claude-muted dark:text-coal-300">
            <CalendarRange className="w-3.5 h-3.5 text-claude-subtle dark:text-coal-400" />
            <span className="text-claude-subtle dark:text-coal-400">Created between</span>
            <DateInput value={dateFrom} onChange={setDateFrom} disabled={running || paused || busy} ariaLabel={`${def.title} from date`} />
            <span className="text-claude-subtle dark:text-coal-400">and</span>
            <DateInput value={dateTo} onChange={setDateTo} disabled={running || paused || busy} ariaLabel={`${def.title} to date`} />
            {(dateFrom || dateTo) && !running && !paused && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); }}
                className="text-[11px] underline text-claude-subtle dark:text-coal-400 hover:text-claude-ink dark:hover:text-coal-100"
              >
                clear
              </button>
            )}
            {(running || paused) && activeRange && (
              <span className="px-2 py-0.5 rounded-md border border-claude-border dark:border-coal-700 text-[11px]">
                active run: {activeRange}
              </span>
            )}
          </div>

          {/* Progress */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] text-claude-subtle dark:text-coal-400 mb-1">
              <span>{status ? `${status.processed} / ${status.total} analyzed` : 'Loading status…'}</span>
              <span>{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-claude-sand dark:bg-coal-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-claude-accent transition-all duration-500"
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
            <div className="mt-2 flex items-center gap-3 text-[11px] text-claude-subtle dark:text-coal-400 flex-wrap">
              <span><strong className="text-emerald-600 dark:text-emerald-400">{status?.succeeded ?? 0}</strong> succeeded</span>
              <span><strong className="text-red-500">{status?.failed ?? 0}</strong> failed</span>
              <span><strong className="text-amber-500">{status?.skipped ?? 0}</strong> skipped</span>
              <span><strong className="text-claude-muted dark:text-coal-300">{status?.remaining ?? 0}</strong> remaining</span>
              {status?.last_error && <span className="text-red-500 truncate max-w-[420px]">last error: {status.last_error}</span>}
            </div>
          </div>

          {/* Recent reports */}
          {reports.length > 0 && (
            <div className="mt-3 border-t border-claude-border dark:border-coal-700 pt-3">
              <div className="text-[11px] uppercase tracking-wide text-claude-subtle dark:text-coal-400 mb-1.5">
                Recent reports
              </div>
              <ul className="space-y-1">
                {reports.map((r) => <ReportRow key={r.id} r={r} summarize={def.summarize} />)}
              </ul>
            </div>
          )}

          {/* Console hint */}
          <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-claude-subtle dark:text-coal-400">
            <Terminal className="w-3.5 h-3.5" />
            Full JSON reports stream to the browser console — press <kbd className="px-1 rounded border border-claude-border dark:border-coal-700">F12</kbd> → Console.
          </div>
        </>
      )}
    </section>
  );
}

const CtrlBtn: React.FC<{
  label: string;
  icon: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
  accent?: boolean;
  title?: string;
}> = ({ label, icon, disabled, onClick, accent, title }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title ?? label}
    className={[
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] transition-colors border',
      disabled
        ? 'opacity-40 cursor-not-allowed border-claude-border dark:border-coal-700 text-claude-subtle dark:text-coal-400'
        : accent
          ? 'border-transparent text-white bg-claude-accent hover:bg-claude-accent/90'
          : 'border-claude-border dark:border-coal-700 text-claude-muted dark:text-coal-300 hover:bg-claude-sand dark:hover:bg-coal-800 hover:text-claude-ink dark:hover:text-coal-100',
    ].join(' ')}
  >
    {icon} {label}
  </button>
);

const DateInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  ariaLabel: string;
}> = ({ value, onChange, disabled, ariaLabel }) => (
  <input
    type="date"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled}
    aria-label={ariaLabel}
    className={[
      'px-2 py-1 rounded-md text-[12px] border bg-transparent',
      'border-claude-border dark:border-coal-700 text-claude-ink dark:text-coal-100',
      'focus:outline-none focus:ring-1 focus:ring-claude-accent',
      disabled ? 'opacity-40 cursor-not-allowed' : '',
    ].join(' ')}
  />
);

const ReportRow: React.FC<{ r: AgentReport; summarize: (r: AgentReport) => string }> = ({ r, summarize }) => {
  const label = r.entity_label || `${r.entity_type} ${r.entity_id.slice(0, 8)}`;
  const failed = r.status === 'failed';
  const skipped = r.status === 'skipped';
  const dot = failed ? 'bg-red-500' : skipped ? 'bg-claude-subtle dark:bg-coal-500' : 'bg-emerald-500';
  return (
    <li className="flex items-center gap-2 text-[12px] text-claude-muted dark:text-coal-300">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
      <span className="truncate font-medium text-claude-ink dark:text-coal-100">{label}</span>
      {failed ? (
        <span className="text-red-500 truncate">failed: {r.error}</span>
      ) : skipped ? (
        <span className="text-claude-subtle dark:text-coal-400 truncate">
          skipped{typeof r.report?.skip_reason === 'string' ? ` · ${r.report.skip_reason}` : ''}
        </span>
      ) : (
        <span className="text-claude-subtle dark:text-coal-400 truncate">{summarize(r)}</span>
      )}
    </li>
  );
};
