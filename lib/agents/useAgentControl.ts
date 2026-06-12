'use client';

// Generic React hook controlling one AI agent.
//
// - Polls /api/agents/{id}/status (fast while running, slow when idle).
// - Incrementally fetches new reports and prints each one's full JSON to the
//   browser console (per product requirement).
// - Exposes start / pause / resume / stop with optimistic status updates.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  agentApi,
  type AgentReport,
  type AgentStatus,
} from './agentControl';

const POLL_ACTIVE_MS = 2_500;   // while the worker is running
const POLL_IDLE_MS = 15_000;    // background refresh when idle/paused
const PANEL_REPORTS = 8;        // most recent reports kept for the panel UI

const TAG_STYLE = 'background:#CC785C;color:#fff;padding:1px 6px;border-radius:3px;font-weight:600';

/** Per-agent one-line summary of a completed report (for console + panel). */
export type ReportSummarizer = (r: AgentReport) => string;

function logReportToConsole(agentId: string, r: AgentReport, summarize: ReportSummarizer): void {
  const tag = `%c[${agentId}]`;
  const label = r.entity_label || `${r.entity_type} ${r.entity_id}`;
  if (r.status === 'failed') {
    console.groupCollapsed(`${tag} ❌ ${label} — FAILED`, TAG_STYLE);
    console.error('error:', r.error);
    console.groupEnd();
    return;
  }
  if (r.status === 'skipped') {
    console.groupCollapsed(`${tag} ⏭️ ${label} — skipped`, TAG_STYLE);
    console.log('full JSON report:', r.report);
    console.groupEnd();
    return;
  }
  console.groupCollapsed(`${tag} 🔍 ${label} — ${summarize(r)}`, TAG_STYLE);
  console.log('full JSON report:', r.report);
  console.log('raw record:', r);
  console.groupEnd();
}

export interface StartParams {
  restart?: boolean;
  dateFrom?: string | null;
  dateTo?: string | null;
}

export interface UseAgentControl {
  status: AgentStatus | null;
  reports: AgentReport[];
  busy: boolean;
  error: string | null;
  start: (params?: StartParams) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
  clearError: () => void;
}

export function useAgentControl(agentId: string, summarize: ReportSummarizer): UseAgentControl {
  const api = useMemo(() => agentApi(agentId), [agentId]);
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [reports, setReports] = useState<AgentReport[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Highest report id already logged — baseline on mount so only NEW results
  // stream to the console, not the whole history.
  const lastReportIdRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const summarizeRef = useRef(summarize);
  useEffect(() => { summarizeRef.current = summarize; }, [summarize]);

  const fetchNewReports = useCallback(async () => {
    try {
      if (lastReportIdRef.current === null) {
        const page = await api.reports({ limit: PANEL_REPORTS });
        if (!mountedRef.current) return;
        lastReportIdRef.current = page.reports.reduce((m, r) => Math.max(m, r.id), 0);
        setReports(page.reports);
        return;
      }
      const page = await api.reports({ sinceId: lastReportIdRef.current, limit: 200 });
      if (!mountedRef.current || page.reports.length === 0) return;
      const fresh = [...page.reports]
        .filter((r) => r.status === 'completed' || r.status === 'failed' || r.status === 'skipped')
        .sort((a, b) => a.id - b.id);
      for (const r of fresh) logReportToConsole(agentId, r, summarizeRef.current);
      lastReportIdRef.current = page.reports.reduce(
        (m, r) => Math.max(m, r.id), lastReportIdRef.current ?? 0,
      );
      setReports((prev) => {
        const seen = new Set(page.reports.map((r) => r.id));
        return [...page.reports, ...prev.filter((r) => !seen.has(r.id))].slice(0, PANEL_REPORTS);
      });
    } catch {
      // Report polling is best-effort; status polling surfaces real errors.
    }
  }, [api, agentId]);

  const refreshStatus = useCallback(async () => {
    try {
      const s = await api.status();
      if (!mountedRef.current) return;
      setStatus(s);
    } catch (e) {
      if (!mountedRef.current) return;
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [api]);

  // Keep latest status accessible inside the polling closure.
  const statusRef = useRef<AgentStatus | null>(null);
  useEffect(() => { statusRef.current = status; }, [status]);

  // Polling loop — interval adapts to whether the worker is active.
  useEffect(() => {
    mountedRef.current = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      await Promise.all([refreshStatus(), fetchNewReports()]);
      if (!mountedRef.current) return;
      timer = setTimeout(tick, statusRef.current?.worker_alive ? POLL_ACTIVE_MS : POLL_IDLE_MS);
    };
    tick();

    return () => {
      mountedRef.current = false;
      if (timer) clearTimeout(timer);
    };
  }, [refreshStatus, fetchNewReports]);

  const runAction = useCallback(
    async (label: string, fn: () => Promise<AgentStatus>) => {
      setBusy(true);
      setError(null);
      try {
        const s = await fn();
        if (!mountedRef.current) return;
        setStatus(s);
        console.info(`%c[${agentId}] ${label} → status: ${s.status}`, TAG_STYLE);
        await fetchNewReports();
      } catch (e) {
        if (!mountedRef.current) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (mountedRef.current) setBusy(false);
      }
    },
    [agentId, fetchNewReports],
  );

  return {
    status,
    reports,
    busy,
    error,
    start: (params: StartParams = {}) =>
      runAction(params.restart ? 'restart' : 'start', () =>
        api.start({ restart: params.restart ?? false, dateFrom: params.dateFrom, dateTo: params.dateTo }),
      ),
    pause: () => runAction('pause', api.pause),
    resume: () => runAction('resume', api.resume),
    stop: () => runAction('stop', api.stop),
    clearError: () => setError(null),
  };
}
