'use client';

// Damage Detection Agent — control panel for the /agents page.
// Start / Pause / Resume / Stop the vision agent, scope it to an ingested
// date range, and watch run progress. Only passenger / light commercial
// vehicles are analyzed; other classes are auto-classified and skipped.
// Full JSON reports stream to the browser console (F12 → Console).

import React, { useState } from 'react';
import { Play, Pause, Square, RotateCcw, ScanSearch, Terminal, AlertTriangle, CalendarRange } from 'lucide-react';
import { useDamageAgent } from '../../../lib/agents/useDamageAgent';
import type { DamageAgentRunStatus, DamageReport } from '../../../lib/agents/damageAgent';

const STATUS_META: Record<DamageAgentRunStatus, { label: string; dot: string }> = {
  idle: { label: 'Idle', dot: 'bg-claude-subtle dark:bg-coal-500' },
  running: { label: 'Running', dot: 'bg-emerald-500 animate-pulse' },
  paused: { label: 'Paused', dot: 'bg-amber-500' },
  stopped: { label: 'Stopped', dot: 'bg-claude-subtle dark:bg-coal-500' },
  completed: { label: 'Completed', dot: 'bg-sky-500' },
  error: { label: 'Error', dot: 'bg-red-500' },
};

export function DamageAgentPanel() {
  const { status, reports, busy, error, start, pause, resume, stop, clearError } = useDamageAgent();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const s: DamageAgentRunStatus = status?.status ?? 'idle';
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
    <section className="mb-5 rounded-xl border border-claude-border dark:border-coal-700 bg-claude-surface dark:bg-coal-850 p-4">
      {/* Header row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 flex-1 min-w-[220px]">
          <ScanSearch className="w-4 h-4 text-claude-accent" />
          <h2 className="text-[14px] font-semibold text-claude-ink dark:text-coal-100">
            Damage Detection Agent
          </h2>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] border border-claude-border dark:border-coal-700 text-claude-muted dark:text-coal-300">
            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
          </span>
          <span className="px-2 py-0.5 rounded-md text-[11px] border border-claude-border dark:border-coal-700 text-claude-subtle dark:text-coal-400">
            passenger + light commercial only
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5">
          <CtrlBtn label="Start" icon={<Play className="w-3.5 h-3.5" />} disabled={!canStart} onClick={() => startWithRange(false)} accent />
          <CtrlBtn label="Pause" icon={<Pause className="w-3.5 h-3.5" />} disabled={busy || !running} onClick={pause} />
          <CtrlBtn label="Resume" icon={<Play className="w-3.5 h-3.5" />} disabled={busy || !paused} onClick={resume} />
          <CtrlBtn label="Stop" icon={<Square className="w-3.5 h-3.5" />} disabled={busy || (!running && !paused)} onClick={stop} />
          <CtrlBtn label="Restart" icon={<RotateCcw className="w-3.5 h-3.5" />} disabled={!canStart} onClick={() => startWithRange(true)} title="Reset cursor and rescan every pending listing in the date range" />
        </div>
      </div>

      {/* Ingested date range (applies on Start / Restart) */}
      <div className="mt-3 flex items-center gap-2 flex-wrap text-[12px] text-claude-muted dark:text-coal-300">
        <CalendarRange className="w-3.5 h-3.5 text-claude-subtle dark:text-coal-400" />
        <span className="text-claude-subtle dark:text-coal-400">Ingested between</span>
        <DateInput value={dateFrom} onChange={setDateFrom} disabled={running || paused || busy} ariaLabel="Ingested from date" />
        <span className="text-claude-subtle dark:text-coal-400">and</span>
        <DateInput value={dateTo} onChange={setDateTo} disabled={running || paused || busy} ariaLabel="Ingested to date" />
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

      {/* Error banner */}
      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-red-300/50 bg-red-500/10 px-3 py-2 text-[12px] text-red-600 dark:text-red-400">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={clearError} className="text-[11px] underline opacity-70 hover:opacity-100">dismiss</button>
        </div>
      )}

      {/* Progress */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px] text-claude-subtle dark:text-coal-400 mb-1">
          <span>
            {status ? `${status.processed} / ${status.total} listings analyzed` : 'Loading status…'}
            {status?.cursor_listing_id ? ` · cursor #${status.cursor_listing_id}` : ''}
          </span>
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
          <span><strong className="text-amber-500">{status?.skipped ?? 0}</strong> out of scope</span>
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
            {reports.map((r) => <ReportRow key={r.id} r={r} />)}
          </ul>
        </div>
      )}

      {/* Console hint */}
      <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-claude-subtle dark:text-coal-400">
        <Terminal className="w-3.5 h-3.5" />
        Full JSON damage reports stream to the browser console — press <kbd className="px-1 rounded border border-claude-border dark:border-coal-700">F12</kbd> → Console.
      </div>
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

const ReportRow: React.FC<{ r: DamageReport }> = ({ r }) => {
  const vehicle = [r.year, r.make, r.vehicle_model].filter(Boolean).join(' ') || `Listing #${r.listing_id}`;
  const failed = r.status === 'failed';
  const skipped = r.status === 'skipped';
  const dmg = r.report?.damage_count ?? 0;
  const dot = failed ? 'bg-red-500' : skipped ? 'bg-claude-subtle dark:bg-coal-500' : dmg > 0 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <li className="flex items-center gap-2 text-[12px] text-claude-muted dark:text-coal-300">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
      <span className="font-medium text-claude-ink dark:text-coal-100">#{r.listing_id}</span>
      <span className="truncate">{vehicle}</span>
      {failed ? (
        <span className="text-red-500 truncate">failed: {r.error}</span>
      ) : skipped ? (
        <span className="text-claude-subtle dark:text-coal-400 truncate">
          out of scope · {r.report?.vehicle_category ?? 'unclassified'}
        </span>
      ) : (
        <span className="text-claude-subtle dark:text-coal-400">
          {dmg} damage(s) · {r.report?.overall_condition ?? '—'} · {r.images_analyzed} img
        </span>
      )}
    </li>
  );
};
