'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2, Car, Gauge, MapPin, ExternalLink, DollarSign, Calendar } from 'lucide-react';
import { AiRecommenderApi } from '../../lib/services/aiRecommenderApi';

interface VehicleSource {
  vin?: string;
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  price?: number;
  miles?: number;
  mileage?: number;
  dom?: number;
  days_on_market?: number;
  location?: string;
  source?: string;
  source_url?: string;
  score?: number;
  [key: string]: any;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  isLoading?: boolean;
  sources?: VehicleSource[];
}

interface ChatBoxComponentProps {
  className?: string;
}

export const ChatBoxComponent: React.FC<ChatBoxComponentProps> = ({
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hi! I\'m your Auto Buyer AI assistant. Ask me anything about your inventory — e.g. "Which vehicles have been sitting longest on market?"',
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: trimmed,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    // Add a loading indicator message
    const loadingId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      {
        id: loadingId,
        text: 'Thinking...',
        sender: 'bot',
        timestamp: new Date(),
        isLoading: true,
      },
    ]);

    try {
      const response = await AiRecommenderApi.ask(trimmed, 5);
      // Replace loading message with real answer + sources
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId
            ? {
                ...m,
                text: response.answer,
                sources: response.sources && response.sources.length > 0 ? response.sources : undefined,
                isLoading: false,
                timestamp: new Date(),
              }
            : m
        )
      );
    } catch (error) {
      const errMsg =
        error instanceof Error ? error.message : 'Something went wrong. Please try again.';
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId
            ? { ...m, text: `Sorry, I couldn't get an answer. ${errMsg}`, isLoading: false, timestamp: new Date() }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea to fit content
  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`; // max ~5 lines
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price);

  const formatMiles = (miles: number) =>
    new Intl.NumberFormat('en-US').format(miles);

  // Keys that are rendered in the structured header/grid — everything else goes into "extra fields"
  const KNOWN_KEYS = new Set([
    'year', 'make', 'model', 'trim', 'price', 'miles', 'mileage',
    'dom', 'days_on_market', 'location', 'source', 'source_url',
    'score', 'vin',
  ]);

  const formatFieldName = (key: string) =>
    key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const formatFieldValue = (value: any): string => {
    if (value == null) return '—';
    if (typeof value === 'number') {
      // Currency-like fields
      if (value > 100 && Number.isFinite(value)) {
        return new Intl.NumberFormat('en-US').format(value);
      }
      return String(value);
    }
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const renderVehicleCard = (vehicle: VehicleSource, idx: number) => {
    const title = [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(' ');
    const miles = vehicle.miles ?? vehicle.mileage;
    const dom = vehicle.dom ?? vehicle.days_on_market;

    // Collect all extra fields not in KNOWN_KEYS
    const extraFields = Object.entries(vehicle).filter(
      ([key, val]) => !KNOWN_KEYS.has(key) && val != null && val !== ''
    );

    return (
      <div
        key={vehicle.vin || idx}
        className="bg-claude-cream dark:bg-coal-900 rounded-lg p-2.5 border border-claude-border dark:border-coal-700 text-xs"
      >
        {/* Title row */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <span className="font-semibold text-claude-ink dark:text-coal-100 text-[13px] leading-tight">
            {title || 'Unknown Vehicle'}
          </span>
          {vehicle.score != null && (
            <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
              {vehicle.score}
            </span>
          )}
        </div>

        {/* Primary fields */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-claude-muted dark:text-coal-400">
          {vehicle.price != null && (
            <span className="flex items-center gap-1">
              <DollarSign className="h-3 w-3 shrink-0 text-green-500" />
              <span className="font-medium text-claude-ink dark:text-coal-100">{formatPrice(vehicle.price)}</span>
            </span>
          )}
          {miles != null && (
            <span className="flex items-center gap-1">
              <Gauge className="h-3 w-3 shrink-0" />
              {formatMiles(miles)} mi
            </span>
          )}
          {dom != null && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3 shrink-0" />
              {dom} days on market
            </span>
          )}
          {vehicle.location && (
            <span className="flex items-center gap-1 truncate">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{vehicle.location}</span>
            </span>
          )}
        </div>

        {/* Extra fields — show everything the API returned */}
        {extraFields.length > 0 && (
          <div className="mt-1.5 pt-1.5 border-t border-claude-border dark:border-coal-700 grid grid-cols-2 gap-x-3 gap-y-0.5 text-claude-subtle dark:text-coal-400">
            {extraFields.map(([key, val]) => (
              <div key={key} className="truncate">
                <span className="text-claude-subtle dark:text-coal-500">{formatFieldName(key)}:</span>{' '}
                <span className="text-claude-text dark:text-coal-300">{formatFieldValue(val)}</span>
              </div>
            ))}
          </div>
        )}

        {/* VIN + source link */}
        {vehicle.vin && (
          <div className="mt-1.5 flex items-center justify-between">
            <span className="font-mono text-[10px] text-claude-subtle dark:text-coal-500 truncate">{vehicle.vin}</span>
            {vehicle.source_url && (
              <a
                href={vehicle.source_url}
                target="_blank"
                rel="noopener noreferrer"
                title="View listing"
                aria-label="View listing"
                className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 shrink-0 ml-2"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`fixed bottom-5 right-5 z-50 ${className}`}>
      {/* Chat Box Panel */}
      <div
        className={`absolute bottom-20 right-0 w-[400px] max-h-[600px] bg-claude-surface dark:bg-coal-850 rounded-2xl shadow-2xl border border-claude-border dark:border-coal-700 flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right ${
          isOpen
            ? 'scale-100 opacity-100 pointer-events-auto'
            : 'scale-0 opacity-0 pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-coal-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-claude-surface/20 flex items-center justify-center">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm leading-tight">Auto Buyer Assistant</h3>
              <span className="text-xs text-blue-100 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                Online
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg hover:bg-claude-surface/20 transition-colors"
            aria-label="Close chat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-[300px] bg-claude-cream dark:bg-coal-900">
          {messages.map((msg) => {
            const hasSources = msg.sender === 'bot' && msg.sources && msg.sources.length > 0;

            return (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${
                  msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 self-start mt-1 ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-coal-100'
                      : 'bg-claude-sand dark:bg-coal-700 text-claude-muted dark:text-coal-300'
                  }`}
                >
                  {msg.sender === 'user' ? (
                    <User className="h-3.5 w-3.5" />
                  ) : (
                    <Bot className="h-3.5 w-3.5" />
                  )}
                </div>
                <div
                  className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    hasSources ? 'max-w-[92%]' : 'max-w-[75%]'
                  } ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-coal-100 rounded-br-md'
                      : 'bg-claude-surface dark:bg-coal-850 text-claude-ink dark:text-coal-200 border border-claude-border dark:border-coal-700 rounded-bl-md'
                  }`}
                >
                  {msg.isLoading ? (
                    <span className="flex items-center gap-2 text-claude-subtle dark:text-coal-500">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Thinking...
                    </span>
                  ) : (
                    <>
                      {/* Answer summary */}
                      <p className="whitespace-pre-wrap">{msg.text}</p>

                      {/* Vehicle source cards */}
                      {hasSources && (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-claude-subtle dark:text-coal-400 uppercase tracking-wide">
                            <Car className="h-3.5 w-3.5" />
                            {msg.sources!.length} Vehicle{msg.sources!.length !== 1 ? 's' : ''} Found
                          </div>
                          <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
                            {msg.sources!.map((v, i) => renderVehicleCard(v, i))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {!msg.isLoading && (
                    <span
                      className={`block text-[10px] mt-1 ${
                        msg.sender === 'user'
                          ? 'text-blue-200'
                          : 'text-claude-subtle dark:text-coal-500'
                      }`}
                    >
                      {formatTime(msg.timestamp)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-claude-border dark:border-coal-700 bg-claude-surface dark:bg-coal-850 shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                autoResize(e.target);
              }}
              onKeyDown={handleKeyDown}
              placeholder={isLoading ? 'Waiting for response...' : 'Ask about your inventory...'}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 text-sm bg-claude-sand dark:bg-coal-700 border-none rounded-2xl text-claude-ink dark:text-coal-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 resize-none overflow-y-auto leading-snug"
              style={{ maxHeight: '120px' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-coal-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              aria-label="Send message"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Floating Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-center w-16 h-16 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer ${
          isOpen
            ? 'bg-coal-700 hover:bg-coal-850 rotate-0'
            : 'bg-blue-600 hover:bg-blue-700 rotate-0'
        }`}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        <div className="relative w-7 h-7">
          <MessageCircle
            className={`absolute inset-0 h-7 w-7 text-coal-100 transition-all duration-300 ${
              isOpen ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'
            }`}
          />
          <X
            className={`absolute inset-0 h-7 w-7 text-coal-100 transition-all duration-300 ${
              isOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'
            }`}
          />
        </div>
      </button>
    </div>
  );
};
