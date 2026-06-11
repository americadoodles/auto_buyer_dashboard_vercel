'use client';

// React hook for the Damage Detection Agent.
//
// - Polls /api/agents/damage/status (fast while running, slow when idle).
// - Incrementally fetches new damage reports and prints the full JSON report
//   for each one to the browser console (per product requirement).
// - Exposes start / pause / resume / stop controls with optimistic status.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  damageAgentApi,
  type DamageAgentStatus,
  type DamageReport,
} from './damageAgent';

const POLL_ACTIVE_MS = 2_500;   // while the worker is running
const POLL_IDLE_MS = 15_000;    // background refresh when idle/paused
const PANEL_REPORTS = 8;        // most recent reports kept for the panel UI

const TAG = '%c[DamageAgent]';
const TAG_STYLE = 'background:#CC785C;color:#fff;padding:1px 6px;border-radius:3px;font-weight:600';

function logReportToConsole(r: DamageReport): void {
  const vehicle = [r.year, r.make, r.vehicle_model, r.trim].filter(Boolean).join(' ') || `listing #${r.listing_id}`;
  if (r.status === 'failed') {
    console.groupCollapsed(`${TAG} ❌ listing #${r.listing_id} — ${vehicle} — FAILED`, TAG_STYLE);
    console.error('error:', r.error);
    console.groupEnd();
    return;
  }
  if (r.status === 'skipped') {
    console.groupCollapsed(
      `${TAG} ⏭️ listing #${r.listing_id} — ${vehicle} — out of scope (${r.report?.vehicle_category ?? 'unknown'})`,
      TAG_STYLE,
    );
    console.log('classification:', r.report?.vehicle_category, '—', r.report?.vehicle_identified);
    console.log('full JSON report:', r.report);
    console.groupEnd();
    return;
  }
  const dmg = r.report?.damage_count ?? 0;
  const cond = r.report?.overall_condition ?? 'unknown';
  const cat = r.report?.vehicle_category ?? 'unknown';
  console.groupCollapsed(
    `${TAG} 🔍 listing #${r.listing_id} — ${vehicle} — ${cat} — ${dmg} damage(s), condition: ${cond}`,
    TAG_STYLE,
  );
  console.log('summary:', r.report?.summary);
  if (r.report?.damages?.length) console.table(r.report.damages);
  console.log('full JSON report:', r.report);
  console.log('raw record:', r);
  console.groupEnd();
}

export interface StartParams {
  restart?: boolean;
  dateFrom?: string | null; // YYYY-MM-DD — only listings ingested on/after
  dateTo?: string | null;   // YYYY-MM-DD — only listings ingested on/before
}

export interface UseDamageAgent {
  status: DamageAgentStatus | null;
  reports: DamageReport[];
  busy: boolean;                 // a control action is in flight
  error: string | null;          // last control/fetch error (user-facing)
  start: (params?: StartParams) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
  clearError: () => void;
}

export function useDamageAgent(): UseDamageAgent {
  const [status, setStatus] = useState<DamageAgentStatus | null>(null);
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Highest report id we've already logged — baseline set on mount so we only
  // stream *new* results to the console, not the whole history.
  const lastReportIdRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const fetchNewReports = useCallback(async () => {
    try {
      if (lastReportIdRef.current === null) {
        // First load: establish baseline + seed the panel, no console spam.
        const page = await damageAgentApi.reports({ limit: PANEL_REPORTS });
        if (!mountedRef.current) return;
        lastReportIdRef.current = page.reports.reduce((m, r) => Math.max(m, r.id), 0);
        setReports(page.reports);
        console.info(
          `${TAG} ready — new damage reports will stream here as JSON while the agent runs.`,
          TAG_STYLE,
        );
        return;
      }
      const page = await damageAgentApi.reports({ sinceId: lastReportIdRef.current, limit: 200 });
      if (!mountedRef.current || page.reports.length === 0) return;
      // API returns newest first; log oldest → newest for a natural timeline.
      const fresh = [...page.reports]
        .filter((r) => r.status === 'completed' || r.status === 'failed' || r.status === 'skipped')
        .sort((a, b) => a.id - b.id);
      for (const r of fresh) logReportToConsole(r);
      lastReportIdRef.current = page.reports.reduce((m, r) => Math.max(m, r.id), lastReportIdRef.current ?? 0);
      setReports((prev) => {
        const seen = new Set(page.reports.map((r) => r.id));
        return [...page.reports, ...prev.filter((r) => !seen.has(r.id))].slice(0, PANEL_REPORTS);
      });
    } catch {
      // Report polling is best-effort; status polling surfaces real errors.
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    try {
      const s = await damageAgentApi.status();
      if (!mountedRef.current) return;
      setStatus(s);
    } catch (e) {
      if (!mountedRef.current) return;
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  // Keep latest status accessible inside the polling closure.
  const statusRef = useRef<DamageAgentStatus | null>(null);
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
    async (label: string, fn: () => Promise<DamageAgentStatus>) => {
      setBusy(true);
      setError(null);
      try {
        const s = await fn();
        if (!mountedRef.current) return;
        setStatus(s);
        console.info(`${TAG} ${label} → status: ${s.status}`, TAG_STYLE);
        // Pull any reports that landed right around the action.
        await fetchNewReports();
      } catch (e) {
        if (!mountedRef.current) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (mountedRef.current) setBusy(false);
      }
    },
    [fetchNewReports],
  );

  return {
    status,
    reports,
    busy,
    error,
    start: (params: StartParams = {}) =>
      runAction(params.restart ? 'restart' : 'start', () =>
        damageAgentApi.start({
          restart: params.restart ?? false,
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
        }),
      ),
    pause: () => runAction('pause', damageAgentApi.pause),
    resume: () => runAction('resume', damageAgentApi.resume),
    stop: () => runAction('stop', damageAgentApi.stop),
    clearError: () => setError(null),
  };
}
