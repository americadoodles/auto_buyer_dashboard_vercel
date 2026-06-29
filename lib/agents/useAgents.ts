'use client';

import { useEffect, useState } from 'react';
import { AGENTS as MOCK_AGENTS, LIVE_EVENTS as MOCK_EVENTS, type AgentRecord, type LiveEvent } from './data';

interface AgentsPayload {
  agents: AgentRecord[];
  stats: { total: number; active: number; errors: number; cost: number; tokens: number };
}

/**
 * Fetches the full agent fleet from /api/agents.
 * Falls back to the bundled mock data if the endpoint is unreachable so the
 * UI stays demo-able when the dev server isn't proxying correctly.
 */
export function useAgents() {
  const [agents, setAgents] = useState<AgentRecord[]>(MOCK_AGENTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let abort = false;
    const controller = new AbortController();
    fetch('/api/agents', { signal: controller.signal, cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: AgentsPayload) => {
        if (abort) return;
        if (Array.isArray(data?.agents)) setAgents(data.agents);
        setLoading(false);
      })
      .catch((e) => {
        if (abort || e.name === 'AbortError') return;
        setError(String(e));
        setLoading(false);
      });
    return () => { abort = true; controller.abort(); };
  }, []);

  return { agents, loading, error };
}

/**
 * Subscribes to /api/agents/events (Server-Sent Events) and exposes the
 * rolling buffer of live activity. Falls back to the bundled mock buffer
 * if the EventSource API is unavailable or the connection errors out.
 */
export function useAgentEvents(max = 12) {
  const [events, setEvents] = useState<LiveEvent[]>(MOCK_EVENTS);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;
    const es = new EventSource('/api/agents/events');

    es.addEventListener('snapshot', (e) => {
      try {
        const payload = JSON.parse((e as MessageEvent).data) as { events: LiveEvent[] };
        if (Array.isArray(payload?.events)) setEvents(payload.events.slice(0, max));
      } catch { /* ignore bad frame */ }
    });

    es.addEventListener('agent_event', (e) => {
      try {
        const ev = JSON.parse((e as MessageEvent).data) as LiveEvent;
        setEvents((prev) => [ev, ...prev].slice(0, max));
      } catch { /* ignore bad frame */ }
    });

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    return () => es.close();
  }, [max]);

  return { events, connected };
}
