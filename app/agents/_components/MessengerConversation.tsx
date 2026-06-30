'use client';

// Reusable seller-conversation view: header (seller + optional AI-mode toggle),
// chat bubbles, and a composer. Extracted from FbMessengerPanel so both the
// agent panel and the listing-detail "Message seller" modal render an identical
// conversation. Purely presentational — the parent owns thread/message state,
// polling, and send/toggle handlers.

import React, { useEffect, useRef } from 'react';
import { Send, Bot, User } from 'lucide-react';
import type { MessengerThread, MessengerMessage } from '../../../lib/agents/fbMessengerApi';

// Local presentation helper (kept self-contained so this component has no
// cross-module formatting dependency).
function formatTime(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export interface MessengerConversationProps {
  thread: MessengerThread | null;
  messages: MessengerMessage[];
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  sending: boolean;
  /** When provided, renders the per-thread AI auto-reply toggle in the header. */
  onToggleAiMode?: (thread: MessengerThread) => void;
  /** Shows a "loading history…" affordance while the extension scrapes. */
  loadingHistory?: boolean;
  /** Message shown when no thread is selected. */
  emptyHint?: string;
}

export function MessengerConversation({
  thread,
  messages,
  draft,
  onDraftChange,
  onSend,
  sending,
  onToggleAiMode,
  loadingHistory = false,
  emptyHint = 'Select a seller to view the conversation.',
}: MessengerConversationProps) {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!thread) {
    return (
      <div className="flex-1 flex items-center justify-center text-[11px] text-claude-subtle dark:text-coal-400">
        {emptyHint}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-claude-border dark:border-coal-700 bg-claude-cream dark:bg-coal-800">
        <span className="text-[12px] font-semibold text-claude-ink dark:text-coal-100 truncate">
          {thread.seller_name}
        </span>
        {onToggleAiMode && (
          <button
            onClick={() => onToggleAiMode(thread)}
            title="Toggle AI auto-reply for this thread"
            className={[
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium border shrink-0',
              thread.ai_mode === 'auto'
                ? 'border-emerald-300/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5'
                : 'border-claude-border dark:border-coal-700 text-claude-subtle dark:text-coal-400',
            ].join(' ')}
          >
            <Bot className="w-3 h-3" />
            {thread.ai_mode === 'auto' ? 'AI auto-reply on' : 'Paused (human only)'}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-claude-cream dark:bg-coal-900">
        {loadingHistory && (
          <div className="flex items-center justify-center gap-2 text-[11px] text-claude-subtle dark:text-coal-400 py-2">
            <span className="w-2 h-2 rounded-full bg-claude-accent animate-pulse" />
            Loading chat history from Facebook…
          </div>
        )}
        {messages.length === 0 ? (
          !loadingHistory && (
            <div className="h-full flex items-center justify-center text-[11px] text-claude-subtle dark:text-coal-400">
              No messages in this thread yet.
            </div>
          )
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
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
          placeholder="Type a reply…"
          disabled={sending}
          className="flex-1 px-2.5 py-1.5 rounded-md text-[12px] border bg-transparent border-claude-border dark:border-coal-700 text-claude-ink dark:text-coal-100 focus:outline-none focus:ring-1 focus:ring-claude-accent disabled:opacity-40"
        />
        <button
          onClick={onSend}
          disabled={!draft.trim() || sending}
          title="Send"
          className={[
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] transition-colors border',
            !draft.trim() || sending
              ? 'opacity-40 cursor-not-allowed border-claude-border dark:border-coal-700 text-claude-subtle dark:text-coal-400'
              : 'border-transparent text-white bg-claude-accent hover:bg-claude-accent/90',
          ].join(' ')}
        >
          <Send className="w-3.5 h-3.5" /> Send
        </button>
      </div>
    </div>
  );
}
