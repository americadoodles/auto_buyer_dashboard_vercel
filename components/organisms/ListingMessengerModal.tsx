'use client';

// "Message seller" modal for the listing detail page. Opens (or creates) the
// FB Messenger conversation for this vehicle listing, triggers a chat-history
// scrape via the extension, polls for messages, and lets the user reply —
// reusing the same MessengerConversation view as the agent panel.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, MessageCircle, AlertTriangle } from 'lucide-react';
import {
  fbMessengerApi, type MessengerThread, type MessengerMessage,
} from '../../lib/agents/fbMessengerApi';
import { MessengerConversation } from '../../app/agents/_components/MessengerConversation';

const MESSAGES_POLL_MS = 8_000;

interface ListingMessengerModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: number | string;
  listingLabel?: string;
}

export const ListingMessengerModal: React.FC<ListingMessengerModalProps> = ({
  isOpen, onClose, listingId, listingLabel,
}) => {
  const [thread, setThread] = useState<MessengerThread | null>(null);
  const [messages, setMessages] = useState<MessengerMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [opening, setOpening] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Open (or create) the conversation each time the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setOpening(true); setError(null); setThread(null); setMessages([]); setDraft('');
    fbMessengerApi.openListing(listingId)
      .then((t) => {
        if (cancelled) return;
        setThread(t);
        setHistoryLoading(true);
      })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (!cancelled) setOpening(false); });
    return () => { cancelled = true; };
  }, [isOpen, listingId]);

  const refreshMessages = useCallback(async (threadId: string) => {
    try {
      const { messages: m } = await fbMessengerApi.messages(threadId);
      if (!mountedRef.current) return;
      setMessages(m);
      if (m.length > 0) setHistoryLoading(false);
    } catch {
      // Best-effort; the open/send paths surface real errors.
    }
  }, []);

  // Poll messages for the open thread.
  useEffect(() => {
    if (!isOpen || !thread) return;
    refreshMessages(thread.id);
    const interval = setInterval(() => refreshMessages(thread.id), MESSAGES_POLL_MS);
    return () => clearInterval(interval);
  }, [isOpen, thread, refreshMessages]);

  // Clear the history spinner after a safety timeout (scrape may yield nothing).
  useEffect(() => {
    if (!historyLoading) return;
    const t = setTimeout(() => setHistoryLoading(false), 45_000);
    return () => clearTimeout(t);
  }, [historyLoading]);

  const onSend = async () => {
    const body = draft.trim();
    if (!body || !thread) return;
    setSending(true); setError(null);
    try {
      await fbMessengerApi.sendMessage(thread.id, body);
      setDraft('');
      await refreshMessages(thread.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-claude-surface dark:bg-coal-850 rounded-lg shadow-xl w-full max-w-2xl flex flex-col" style={{ maxHeight: '80vh' }}>
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-claude-border dark:border-coal-700">
          <div className="flex items-center gap-2 min-w-0">
            <MessageCircle className="w-4 h-4 text-claude-accent shrink-0" />
            <span className="text-sm font-semibold text-claude-ink dark:text-coal-100 truncate">
              Message seller{listingLabel ? ` · ${listingLabel}` : ''}
            </span>
          </div>
          <button onClick={onClose} className="text-claude-subtle hover:text-claude-ink dark:hover:text-coal-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="m-3 flex items-start gap-2 rounded-md border border-red-300/50 bg-red-500/10 px-3 py-2 text-[12px] text-red-600 dark:text-red-400">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="text-[11px] underline opacity-70 hover:opacity-100">dismiss</button>
          </div>
        )}

        <div className="flex flex-col flex-1 min-h-[320px] overflow-hidden">
          {opening ? (
            <div className="flex-1 flex items-center justify-center text-[12px] text-claude-subtle dark:text-coal-400">
              Opening conversation…
            </div>
          ) : (
            <MessengerConversation
              thread={thread}
              messages={messages}
              draft={draft}
              onDraftChange={setDraft}
              onSend={onSend}
              sending={sending}
              loadingHistory={historyLoading}
              emptyHint="No conversation yet — type a message below to contact the seller."
            />
          )}
        </div>
      </div>
    </div>
  );
};
