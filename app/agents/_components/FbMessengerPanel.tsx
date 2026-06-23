'use client';

// Control panel for the FB Messenger Agent.
// Mirrors FbScraperPanel.tsx's header (status dot, connection badge,
// Start/Stop) and DamageReportPanel.tsx's "key facts" summary strip, but the
// body is a seller list + chat-bubble thread view instead of a filter form
// or report table — the agent reads/sends Messenger messages, so its
// per-item content here is a conversation, not a one-line summary.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Play, Square, Send, AlertTriangle, MessageCircle,
  ChevronDown, ChevronRight, Plug, PlugZap, Bot, User,
} from 'lucide-react';
import {
  fbMessengerApi, type FbMessengerStatus, type MessengerThread, type MessengerMessage,
} from '../../../lib/agents/fbMessengerApi';
import type { AgentDef } from './agentDefs';

const POLL_ACTIVE_MS = 4_000;
const POLL_IDLE_MS = 15_000;
const MESSAGES_POLL_MS = 10_000;

function formatTime(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

export function FbMessengerPanel({ def, defaultOpen = false }: { def: AgentDef; defaultOpen?: boolean }) {
  const [status, setStatus] = useState<FbMessengerStatus | null>(null);
  const [threads, setThreads] = useState<MessengerThread[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessengerMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(defaultOpen);
  const mountedRef = useRef(true);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const s = await fbMessengerApi.status();
      if (!mountedRef.current) return;
      setStatus(s);
    } catch (e) {
      if (!mountedRef.current) return;
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const refreshThreads = useCallback(async () => {
    try {
      const { threads: t } = await fbMessengerApi.threads();
      if (!mountedRef.current) return;
      setThreads(t);
      setSelectedId((prev) => prev ?? (t[0]?.id ?? null));
    } catch (e) {
      if (!mountedRef.current) return;
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const statusRef = useRef<FbMessengerStatus | null>(null);
  useEffect(() => { statusRef.current = status; }, [status]);

  // Status + thread list polling — fast while the extension is connected/active.
  useEffect(() => {
    mountedRef.current = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      await Promise.all([refreshStatus(), refreshThreads()]);
      if (!mountedRef.current) return;
      const active = statusRef.current?.connection?.connected === true;
      timer = setTimeout(tick, active ? POLL_ACTIVE_MS : POLL_IDLE_MS);
    };
    tick();
    return () => {
      mountedRef.current = false;
      if (timer) clearTimeout(timer);
    };
  }, [refreshStatus, refreshThreads]);

  const refreshMessages = useCallback(async (threadId: string) => {
    try {
      const { messages: m } = await fbMessengerApi.messages(threadId);
      if (!mountedRef.current) return;
      setMessages(m);
    } catch (e) {
      if (!mountedRef.current) return;
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  // Selected-thread message polling.
  useEffect(() => {
    if (!selectedId) { setMessages([]); return; }
    refreshMessages(selectedId);
    const interval = setInterval(() => refreshMessages(selectedId), MESSAGES_POLL_MS);
    return () => clearInterval(interval);
  }, [selectedId, refreshMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleAction = useCallback(
    async (label: string, fn: () => Promise<FbMessengerStatus>) => {
      setBusy(true); setError(null);
      try {
        const s = await fn();
        if (!mountedRef.current) return;
        setStatus(s);
        console.info(`%c[fb-messenger] ${label} → status: ${s.status}`,
          'background:#CC785C;color:#fff;padding:1px 6px;border-radius:3px;font-weight:600');
      } catch (e) {
        if (!mountedRef.current) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (mountedRef.current) setBusy(false);
      }
    }, []);

  const onStart = () => handleAction('start', fbMessengerApi.start);
  const onStop = () => handleAction('stop', fbMessengerApi.stop);

  const onSend = async () => {
    const body = draft.trim();
    if (!body || !selectedId) return;
    setSending(true); setError(null);
    try {
      await fbMessengerApi.sendMessage(selectedId, body);
      setDraft('');
      await refreshMessages(selectedId);
      await refreshThreads();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  };

  const onToggleAiMode = async (thread: MessengerThread) => {
    const next = thread.ai_mode === 'auto' ? 'paused' : 'auto';
    try {
      await fbMessengerApi.setAiMode(thread.id, next);
      await refreshThreads();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const connected = status?.connection?.connected === true;
  const running = status?.status === 'running';
  const selected = threads.find((t) => t.id === selectedId) ?? null;

  const statusMeta = running
    ? { label: 'Running', dot: 'bg-emerald-500 animate-pulse' }
    : { label: 'Idle', dot: 'bg-claude-subtle dark:bg-coal-500' };

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
          {def.icon ?? <MessageCircle className="w-4 h-4 text-claude-accent" />}
          <span className="text-[14px] font-semibold text-claude-ink dark:text-coal-100">{def.title}</span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] border border-claude-border dark:border-coal-700 text-claude-muted dark:text-coal-300">
            <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
            {statusMeta.label}
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
          {status && status.unread_count > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-semibold bg-claude-accent/15 text-claude-accent">
              {status.unread_count} unread
            </span>
          )}
        </button>

        <div className="flex items-center gap-1.5">
          <CtrlBtn label="Start" icon={<Play className="w-3.5 h-3.5" />} disabled={!connected || busy || running} onClick={onStart} accent />
          <CtrlBtn label="Stop" icon={<Square className="w-3.5 h-3.5" />} disabled={busy || !running} onClick={onStop} />
        </div>
      </div>

      {!connected && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-claude-border dark:border-coal-700 px-3 py-2 text-[12px] text-claude-muted dark:text-coal-300">
          <Plug className="w-3.5 h-3.5 mt-0.5 shrink-0 text-claude-subtle" />
          <span>
            No Chrome extension is connected. Open the
            <strong className="mx-1">FB Marketplace Inspector</strong>
            extension popup, sign in with your dashboard credentials, and keep it open until "Extension connected" appears here.
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

          {/* Key-facts summary strip (mirrors DamageReportPanel's Fact grid) */}
          <dl className="mt-3 grid grid-cols-2 sm:grid-cols-4 divide-x divide-claude-border dark:divide-coal-700 rounded-md border border-claude-border dark:border-coal-700 overflow-hidden">
            <Fact label="Open Threads">{status?.thread_count ?? 0}</Fact>
            <Fact label="Unread">{status?.unread_count ?? 0}</Fact>
            <Fact label="Sent Today">{status?.sent_today ?? 0}</Fact>
            <Fact label="Failed Today">
              <span className={status && status.failed_today > 0 ? 'text-red-500' : ''}>{status?.failed_today ?? 0}</span>
            </Fact>
          </dl>

          {/* Seller list + conversation */}
          <div className="mt-3 flex border border-claude-border dark:border-coal-700 rounded-md overflow-hidden h-[360px]">
            {/* Seller list */}
            <div className="w-[180px] shrink-0 border-r border-claude-border dark:border-coal-700 overflow-y-auto bg-claude-cream dark:bg-coal-800">
              {threads.length === 0 ? (
                <div className="p-3 text-[11px] text-claude-subtle dark:text-coal-400">
                  No seller conversations yet.
                </div>
              ) : (
                threads.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedId(t.id)}
                    className={[
                      'w-full text-left px-2.5 py-2 border-b border-claude-border/60 dark:border-coal-700/60 transition-colors',
                      t.id === selectedId
                        ? 'bg-claude-accent/10'
                        : 'hover:bg-claude-sand dark:hover:bg-coal-700',
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-claude-divider dark:bg-coal-600 text-[9px] font-semibold text-claude-ink dark:text-coal-100 shrink-0">
                        {initials(t.seller_name)}
                      </span>
                      <span className="text-[12px] font-medium text-claude-ink dark:text-coal-100 truncate flex-1">
                        {t.seller_name}
                      </span>
                      {t.unread_count > 0 && (
                        <span className="w-4 h-4 flex items-center justify-center rounded-full bg-claude-accent text-white text-[9px] font-semibold shrink-0">
                          {t.unread_count}
                        </span>
                      )}
                    </div>
                    {t.last_message_preview && (
                      <p className="mt-0.5 text-[11px] text-claude-subtle dark:text-coal-400 truncate">
                        {t.last_message_preview}
                      </p>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Thread view */}
            <div className="flex-1 flex flex-col min-w-0">
              {selected ? (
                <>
                  <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-claude-border dark:border-coal-700 bg-claude-cream dark:bg-coal-800">
                    <span className="text-[12px] font-semibold text-claude-ink dark:text-coal-100 truncate">
                      {selected.seller_name}
                    </span>
                    <button
                      onClick={() => onToggleAiMode(selected)}
                      title="Toggle AI auto-reply for this thread"
                      className={[
                        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium border shrink-0',
                        selected.ai_mode === 'auto'
                          ? 'border-emerald-300/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5'
                          : 'border-claude-border dark:border-coal-700 text-claude-subtle dark:text-coal-400',
                      ].join(' ')}
                    >
                      <Bot className="w-3 h-3" />
                      {selected.ai_mode === 'auto' ? 'AI auto-reply on' : 'Paused (human only)'}
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-claude-cream dark:bg-coal-900">
                    {messages.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-[11px] text-claude-subtle dark:text-coal-400">
                        No messages in this thread yet.
                      </div>
                    ) : (
                      messages.map((m) => (
                        <div key={m.id} className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={[
                              'max-w-[75%] rounded-2xl px-3 py-1.5',
                              m.direction === 'outbound'
                                ? 'bg-claude-accent text-white rounded-br-md'
                                : 'bg-claude-surface dark:bg-coal-700 text-claude-ink dark:text-coal-100 shadow-sm rounded-bl-md',
                            ].join(' ')}
                          >
                            <p className="text-[12px] whitespace-pre-wrap break-words">{m.body}</p>
                            <p className={[
                              'mt-0.5 text-[10px] flex items-center gap-1',
                              m.direction === 'outbound' ? 'text-white/70' : 'text-claude-subtle dark:text-coal-400',
                            ].join(' ')}>
                              {m.sender === 'ai' && <Bot className="w-2.5 h-2.5" />}
                              {m.sender === 'human' && <User className="w-2.5 h-2.5" />}
                              {formatTime(m.created_at)}
                              {m.direction === 'outbound' && (
                                <span>
                                  {m.status === 'sent' || m.status === 'delivered' ? '✓' : m.status === 'failed' ? '⚠' : '…'}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="flex items-center gap-1.5 p-2 border-t border-claude-border dark:border-coal-700">
                    <input
                      type="text"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
                      placeholder="Type a reply…"
                      disabled={sending}
                      className="flex-1 px-2.5 py-1.5 rounded-md text-[12px] border bg-transparent border-claude-border dark:border-coal-700 text-claude-ink dark:text-coal-100 focus:outline-none focus:ring-1 focus:ring-claude-accent disabled:opacity-40"
                    />
                    <CtrlBtn
                      label="Send"
                      icon={<Send className="w-3.5 h-3.5" />}
                      disabled={!draft.trim() || sending}
                      onClick={onSend}
                      accent
                    />
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-[11px] text-claude-subtle dark:text-coal-400">
                  Select a seller to view the conversation.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

const Fact: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="px-3 py-2 bg-claude-surface dark:bg-coal-850">
    <dt className="text-[10px] uppercase tracking-wide text-claude-subtle dark:text-coal-400">{label}</dt>
    <dd className="text-sm font-semibold text-claude-ink dark:text-coal-100">{children}</dd>
  </div>
);

const CtrlBtn: React.FC<{
  label: string;
  icon: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
  accent?: boolean;
}> = ({ label, icon, disabled, onClick, accent }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={label}
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
