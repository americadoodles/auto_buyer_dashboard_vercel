'use client';

// Control panel for the FB Marketplace Scraper Agent.
// Mirrors the popup.html form of the Chrome extension exactly: location,
// price/year/mileage ranges, radius, time window, max listings, exact-match.
// Search/Stop/Refresh-Templates buttons drive the connected extension over
// WebSocket. Connection status surfaces the extension's reported state
// (version, FB-login, captured templates) so users know why a start fails.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Play, Square, RefreshCcw, AlertTriangle, ShoppingCart,
  ChevronDown, ChevronRight, Plug, PlugZap,
} from 'lucide-react';
import { fbScraperApi, type FbScraperFilters, type FbScraperStatus, type LocationCandidate } from '../../../lib/agents/fbScraperApi';
import type { AgentDef } from './agentDefs';

const POLL_ACTIVE_MS = 2_500;
const POLL_IDLE_MS = 10_000;
const FILTERS_LS_KEY = 'fb-scraper:filters';

// Mirrors popup.html's default values so the UX matches.
const DEFAULT_FILTERS: FbScraperFilters = {
  location: '',
  minPrice: 2000,
  maxPrice: 50000,
  minYear: 2016,
  maxYear: 2024,
  minMileage: 0,
  maxMileage: 200,
  radius: '',
  startTime: '',
  endTime: '',
  maxListings: 0,
  exact: false,
};

function loadStoredFilters(): FbScraperFilters {
  if (typeof window === 'undefined') return DEFAULT_FILTERS;
  try {
    const raw = window.localStorage.getItem(FILTERS_LS_KEY);
    if (!raw) return DEFAULT_FILTERS;
    return { ...DEFAULT_FILTERS, ...(JSON.parse(raw) as FbScraperFilters) };
  } catch {
    return DEFAULT_FILTERS;
  }
}

function storeFilters(f: FbScraperFilters): void {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(FILTERS_LS_KEY, JSON.stringify(f)); } catch {}
}

const SELECTED_LOC_LS_KEY = 'fb-scraper:selectedLocation';

function loadStoredSelectedLocation(): LocationCandidate | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SELECTED_LOC_LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function storeSelectedLocation(c: LocationCandidate | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (c) window.localStorage.setItem(SELECTED_LOC_LS_KEY, JSON.stringify(c));
    else window.localStorage.removeItem(SELECTED_LOC_LS_KEY);
  } catch {}
}

export function FbScraperPanel({ def, defaultOpen = false }: { def: AgentDef; defaultOpen?: boolean }) {
  const [status, setStatus] = useState<FbScraperStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(defaultOpen);
  const [filters, setFilters] = useState<FbScraperFilters>(() => loadStoredFilters());
  const [selectedLocation, setSelectedLocation] = useState<LocationCandidate | null>(
    () => loadStoredSelectedLocation()
  );
  const mountedRef = useRef(true);

  // Persist on every change (cheap; values are small).
  useEffect(() => { storeFilters(filters); }, [filters]);
  useEffect(() => { storeSelectedLocation(selectedLocation); }, [selectedLocation]);

  const refreshStatus = useCallback(async () => {
    try {
      const s = await fbScraperApi.status();
      if (!mountedRef.current) return;
      setStatus(s);
    } catch (e) {
      if (!mountedRef.current) return;
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  // Polling loop — fast while running, slow when idle.
  // We read the latest status from a ref (not the closure) so the effect
  // doesn't tear down and recreate the timer on every status change.
  const statusRef = useRef<FbScraperStatus | null>(null);
  useEffect(() => { statusRef.current = status; }, [status]);

  useEffect(() => {
    mountedRef.current = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      await refreshStatus();
      if (!mountedRef.current) return;
      const active = statusRef.current?.status === 'running';
      timer = setTimeout(tick, active ? POLL_ACTIVE_MS : POLL_IDLE_MS);
    };
    tick();
    return () => {
      mountedRef.current = false;
      if (timer) clearTimeout(timer);
    };
  }, [refreshStatus]);

  const running = status?.status === 'running';
  const connected = status?.connection?.connected === true;
  // fb_logged_in is tri-state: true / false / null(unknown). The extension
  // currently reports `null` because the service worker doesn't probe FB
  // session state. Treat unknown as "don't warn" — only explicit `false`
  // (which we'd get if/when we add a probe) shows the warning banner.
  const fbLoggedInRaw = status?.connection?.fb_logged_in;
  const fbLoggedInKnownFalse = fbLoggedInRaw === false;
  const templatesReady = (status?.connection?.captured_template_names?.length ?? 0) > 0;
  const canStart = !busy && !running && connected;

  const handleAction = useCallback(
    async (label: string, fn: () => Promise<FbScraperStatus>) => {
      setBusy(true); setError(null);
      try {
        const s = await fn();
        if (!mountedRef.current) return;
        setStatus(s);
        console.info(`%c[fb-scraper] ${label} → status: ${s.status}`,
          'background:#CC785C;color:#fff;padding:1px 6px;border-radius:3px;font-weight:600');
      } catch (e) {
        if (!mountedRef.current) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (mountedRef.current) setBusy(false);
      }
    }, []);

  const onSearch = () => {
    const payload: FbScraperFilters & {
      selectedLocation?: LocationCandidate;
      latitude?: number;
      longitude?: number;
    } = { ...filters };
    if (selectedLocation) {
      payload.selectedLocation = selectedLocation;
      if (selectedLocation.latitude != null) payload.latitude = selectedLocation.latitude;
      if (selectedLocation.longitude != null) payload.longitude = selectedLocation.longitude;
    }
    return handleAction('search', () => fbScraperApi.start(payload));
  };
  const onStop = () => handleAction('stop', fbScraperApi.stop);
  const onRefreshTemplates = () => handleAction('refresh templates', fbScraperApi.refreshTemplates);

  const setField = <K extends keyof FbScraperFilters>(k: K, v: FbScraperFilters[K]) =>
    setFilters((prev) => ({ ...prev, [k]: v }));

  const pct = status?.progress_pct ?? 0;
  const statusLabel: Record<string, { label: string; dot: string }> = {
    idle:      { label: 'Idle',      dot: 'bg-claude-subtle dark:bg-coal-500' },
    running:   { label: 'Running',   dot: 'bg-emerald-500 animate-pulse' },
    stopped:   { label: 'Stopped',   dot: 'bg-claude-subtle dark:bg-coal-500' },
    completed: { label: 'Completed', dot: 'bg-sky-500' },
    error:     { label: 'Error',     dot: 'bg-red-500' },
  };
  const meta = statusLabel[status?.status ?? 'idle'] ?? statusLabel.idle;

  return (
    <section className="rounded-xl border border-claude-border dark:border-coal-700 bg-claude-surface dark:bg-coal-850 p-4">
      {/* Header row */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2.5 flex-1 min-w-[240px] text-left"
          aria-expanded={open}
        >
          {open
            ? <ChevronDown className="w-3.5 h-3.5 text-claude-subtle dark:text-coal-400" />
            : <ChevronRight className="w-3.5 h-3.5 text-claude-subtle dark:text-coal-400" />}
          {def.icon ?? <ShoppingCart className="w-4 h-4 text-claude-accent" />}
          <span className="text-[14px] font-semibold text-claude-ink dark:text-coal-100">{def.title}</span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] border border-claude-border dark:border-coal-700 text-claude-muted dark:text-coal-300">
            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
          </span>
          <span className={[
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border',
            connected
              ? 'border-emerald-300/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5'
              : 'border-claude-border dark:border-coal-700 text-claude-subtle dark:text-coal-400',
          ].join(' ')}>
            {connected ? <PlugZap className="w-3 h-3" /> : <Plug className="w-3 h-3" />}
            {connected ? 'Extension connected' : 'Extension offline'}
          </span>
          {running && (
            <span className="text-[11px] text-claude-subtle dark:text-coal-400">
              {status?.processed ?? 0}/{status?.total ?? 0} · {pct}%
            </span>
          )}
        </button>

        <div className="flex items-center gap-1.5">
          <CtrlBtn label="Search" icon={<Play className="w-3.5 h-3.5" />} disabled={!canStart} onClick={onSearch} accent />
          <CtrlBtn label="Stop"   icon={<Square className="w-3.5 h-3.5" />} disabled={busy || !running} onClick={onStop} />
          <CtrlBtn label="Refresh templates" icon={<RefreshCcw className="w-3.5 h-3.5" />} disabled={busy || !connected} onClick={onRefreshTemplates} title="Re-read captured templates from chrome.storage.local and refresh session params" />
        </div>
      </div>

      {/* Connection / FB-login banners (always visible when relevant) */}
      {!connected && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-claude-border dark:border-coal-700 px-3 py-2 text-[12px] text-claude-muted dark:text-coal-300">
          <Plug className="w-3.5 h-3.5 mt-0.5 shrink-0 text-claude-subtle" />
          <span>
            No Chrome extension is connected. Open the
            <strong className="mx-1">FB Marketplace Inspector</strong>
            extension popup, sign in with your dashboard credentials, and keep the popup open until "Extension connected" appears here.
          </span>
        </div>
      )}
      {connected && (
        <div className="mt-3 text-[11px] text-claude-subtle dark:text-coal-400">
          <strong>Note:</strong> the extension popup must remain open while a scrape is running — the search loop lives in popup.js. Closing the popup stops the scrape.
        </div>
      )}
      {connected && fbLoggedInKnownFalse && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-300/50 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-700 dark:text-amber-400">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>Sign in to Facebook in the extension's browser so it can scrape Marketplace.</span>
        </div>
      )}
      {connected && !templatesReady && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-300/50 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-700 dark:text-amber-400">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            No GraphQL templates captured yet. Browse one FB Marketplace listing in the extension's browser, then click <em>Refresh templates</em>.
          </span>
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-red-300/50 bg-red-500/10 px-3 py-2 text-[12px] text-red-600 dark:text-red-400">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-[11px] underline opacity-70 hover:opacity-100">dismiss</button>
        </div>
      )}

      {open && (
        <>
          <p className="mt-2 text-[12px] text-claude-subtle dark:text-coal-400">{def.description}</p>

          {/* Filters — mirror popup.html exactly */}
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <Field label="Location" full>
              <LocationTypeahead
                value={String(filters.location ?? '')}
                onValueChange={(v) => setField('location', v)}
                selected={selectedLocation}
                onSelect={(c) => {
                  setSelectedLocation(c);
                  setField('location', c.single_line_address);
                }}
                onClear={() => setSelectedLocation(null)}
                disabled={running || !connected}
              />
            </Field>

            <Pair>
              <Field label="Min Price">
                <NumberInput value={filters.minPrice} onChange={(v) => setField('minPrice', v)} disabled={running} />
              </Field>
              <Field label="Max Price">
                <NumberInput value={filters.maxPrice} onChange={(v) => setField('maxPrice', v)} disabled={running} />
              </Field>
            </Pair>

            <Pair>
              <Field label="Min Year">
                <NumberInput value={filters.minYear} onChange={(v) => setField('minYear', v)} disabled={running} />
              </Field>
              <Field label="Max Year">
                <NumberInput value={filters.maxYear} onChange={(v) => setField('maxYear', v)} disabled={running} />
              </Field>
            </Pair>

            <Pair>
              <Field label="Min Mileage (×1000 mi)">
                <NumberInput value={filters.minMileage} onChange={(v) => setField('minMileage', v)} disabled={running} />
              </Field>
              <Field label="Max Mileage (×1000 mi)">
                <NumberInput value={filters.maxMileage} onChange={(v) => setField('maxMileage', v)} disabled={running} />
              </Field>
            </Pair>

            <Field label="Radius (mi)">
              <NumberInput value={filters.radius} onChange={(v) => setField('radius', v)} disabled={running} placeholder="blank = use captured" />
            </Field>
            <Field label="Max Listings">
              <NumberInput value={filters.maxListings} onChange={(v) => setField('maxListings', v)} disabled={running} placeholder="0 = unlimited" />
            </Field>

            <Field label="Start_Time (ms UTC)">
              <NumberInput value={filters.startTime} onChange={(v) => setField('startTime', v)} disabled={running} placeholder="0 = no limit" />
            </Field>
            <Field label="End_Time (ms UTC)">
              <NumberInput value={filters.endTime} onChange={(v) => setField('endTime', v)} disabled={running} placeholder="empty = now" />
            </Field>

            <label className="flex items-center gap-2 text-[12px] text-claude-muted dark:text-coal-300 md:col-span-2">
              <input
                type="checkbox"
                checked={!!filters.exact}
                onChange={(e) => setField('exact', e.target.checked)}
                disabled={running}
              />
              Exact match only
            </label>
          </div>

          {/* Progress */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-[11px] text-claude-subtle dark:text-coal-400 mb-1">
              <span>{status ? `${status.processed} / ${status.total || '—'} scraped` : 'Loading status…'}</span>
              <span>{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-claude-sand dark:bg-coal-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-claude-accent transition-all duration-500"
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
            <div className="mt-2 flex items-center gap-3 text-[11px] text-claude-subtle dark:text-coal-400 flex-wrap">
              <span><strong className="text-emerald-600 dark:text-emerald-400">{status?.succeeded ?? 0}</strong> forwarded</span>
              <span><strong className="text-red-500">{status?.failed ?? 0}</strong> failed</span>
              <span><strong className="text-amber-500">{status?.skipped ?? 0}</strong> skipped</span>
              <span><strong className="text-claude-muted dark:text-coal-300">{status?.remaining ?? 0}</strong> remaining</span>
              {status?.last_error && (
                <span className="text-red-500 truncate max-w-[420px]">last error: {status.last_error}</span>
              )}
            </div>
          </div>

          {/* Extension details */}
          {connected && (
            <div className="mt-3 text-[11px] text-claude-subtle dark:text-coal-400 flex items-center gap-3 flex-wrap">
              <span>extension v{status?.connection?.extension_version ?? '?'}</span>
              <span>·</span>
              <span>FB login: {fbLoggedInRaw === true ? 'yes' : fbLoggedInRaw === false ? 'no' : 'unknown'}</span>
              <span>·</span>
              <span>templates: {status?.connection?.captured_template_names?.length ?? 0}</span>
            </div>
          )}
        </>
      )}
    </section>
  );
}

// ----- small UI primitives (kept inline so the panel is self-contained) -----

const inputClass =
  'w-full px-2 py-1 rounded-md text-[12px] border bg-transparent ' +
  'border-claude-border dark:border-coal-700 text-claude-ink dark:text-coal-100 ' +
  'focus:outline-none focus:ring-1 focus:ring-claude-accent ' +
  'disabled:opacity-40 disabled:cursor-not-allowed';

const Field: React.FC<{ label: string; full?: boolean; children: React.ReactNode }> = ({ label, full, children }) => (
  <label className={['block', full ? 'md:col-span-2' : ''].join(' ')}>
    <div className="text-[11px] text-claude-subtle dark:text-coal-400 mb-1">{label}</div>
    {children}
  </label>
);

const Pair: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="md:col-span-2 grid grid-cols-2 gap-2.5">{children}</div>
);

const LocationTypeahead: React.FC<{
  value: string;
  onValueChange: (v: string) => void;
  selected: LocationCandidate | null;
  onSelect: (c: LocationCandidate) => void;
  onClear: () => void;
  disabled?: boolean;
}> = ({ value, onValueChange, selected, onSelect, onClear, disabled }) => {
  const [candidates, setCandidates] = useState<LocationCandidate[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seqRef = useRef(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click.
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const runQuery = useCallback(async (q: string) => {
    const seq = ++seqRef.current;
    setLoading(true); setErr(null);
    try {
      const { candidates } = await fbScraperApi.locationTypeahead(q);
      if (seq !== seqRef.current) return; // stale
      setCandidates(candidates || []);
    } catch (e) {
      if (seq !== seqRef.current) return;
      setErr(e instanceof Error ? e.message : String(e));
      setCandidates([]);
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  }, []);

  const onChange = (raw: string) => {
    onValueChange(raw);
    if (selected && raw !== selected.single_line_address) onClear();
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = raw.trim();
    if (q.length < 2) {
      setCandidates([]); setErr(null); setLoading(false);
      return;
    }
    debounceRef.current = setTimeout(() => { void runQuery(q); }, 250);
  };

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => { if (candidates.length || err || loading) setOpen(true); }}
        placeholder="Type city, neighborhood, or ZIP…"
        disabled={disabled}
        className={inputClass}
        autoComplete="off"
      />
      {selected && (
        <div className="mt-1 text-[11px] text-claude-subtle dark:text-coal-400 truncate">
          {selected.subtitle || (selected.latitude != null && selected.longitude != null
            ? `${selected.latitude.toFixed(4)}, ${selected.longitude.toFixed(4)}`
            : '')}
        </div>
      )}
      {open && !disabled && (loading || err || candidates.length > 0) && (
        <div className="absolute z-20 left-0 right-0 mt-1 rounded-md border border-claude-border dark:border-coal-700 bg-claude-surface dark:bg-coal-850 shadow-md max-h-64 overflow-auto">
          {loading && (
            <div className="px-2.5 py-1.5 text-[11px] text-claude-subtle dark:text-coal-400">Searching…</div>
          )}
          {!loading && err && (
            <div className="px-2.5 py-1.5 text-[11px] text-red-500">{err}</div>
          )}
          {!loading && !err && candidates.length === 0 && (
            <div className="px-2.5 py-1.5 text-[11px] text-claude-subtle dark:text-coal-400">No matches</div>
          )}
          {!loading && !err && candidates.map((c, i) => (
            <button
              type="button"
              key={`${c.single_line_address}-${i}`}
              onClick={() => { onSelect(c); setOpen(false); }}
              className="w-full text-left px-2.5 py-1.5 text-[12px] hover:bg-claude-sand dark:hover:bg-coal-800 border-b border-claude-border/60 dark:border-coal-700/60 last:border-b-0"
            >
              <div className="text-claude-ink dark:text-coal-100">{c.single_line_address}</div>
              {c.subtitle && (
                <div className="text-[11px] text-claude-subtle dark:text-coal-400 truncate">{c.subtitle}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const NumberInput: React.FC<{
  value: number | string | undefined;
  onChange: (v: number | string) => void;
  disabled?: boolean;
  placeholder?: string;
}> = ({ value, onChange, disabled, placeholder }) => (
  <input
    type="number"
    value={value === undefined ? '' : String(value)}
    onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
    disabled={disabled}
    placeholder={placeholder}
    className={inputClass}
  />
);

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
