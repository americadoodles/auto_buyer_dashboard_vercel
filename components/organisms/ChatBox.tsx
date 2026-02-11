'use client';

import React, { useEffect, useRef } from 'react';
import { Icon } from '../atoms/Icon';
import { Button } from '../atoms/Button';
import { useCommunicationHistory } from '../../lib/hooks/useSMSHistory';
import { sendSMS } from '../../lib/services/listingManagementApi';
import { useToast } from '../../hooks/useToast';

export interface ChatBoxProps {
  contactId: string | null;
  contactName: string;
  phone?: string | null;
  onSent?: () => void;
  onCallClick?: () => void;
  className?: string;
}

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || '?';
};

const formatMessageTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

export const ChatBox: React.FC<ChatBoxProps> = ({
  contactId,
  contactName,
  phone,
  onSent,
  onCallClick,
  className = '',
}) => {
  const { showSuccess, showError } = useToast();
  const [messageText, setMessageText] = React.useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const MIN_TEXTAREA_HEIGHT = 40;
  const MAX_TEXTAREA_HEIGHT = 120;

  const adjustTextareaHeight = React.useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(Math.max(el.scrollHeight, MIN_TEXTAREA_HEIGHT), MAX_TEXTAREA_HEIGHT)}px`;
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [messageText, adjustTextareaHeight]);

  const {
    communications,
    loading: messagesLoading,
    refresh: refreshMessages,
    sendingMessage,
    setSendingMessage,
  } = useCommunicationHistory(contactId);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [communications]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !contactId) return;
    const phoneNumber = phone || undefined;
    if (!phoneNumber) {
      showError('No Phone Number', 'This contact does not have a phone number.');
      return;
    }

    setSendingMessage(true);
    try {
      const result = await sendSMS(contactId, messageText.trim(), phoneNumber);
      if (result.success) {
        setMessageText('');
        refreshMessages();
        showSuccess('Message Sent', 'Your SMS has been sent successfully.');
        onSent?.();
      } else {
        showError('Send Failed', result.error || 'Failed to send message.');
      }
    } catch (error) {
      console.error('Error sending SMS:', error);
      showError('Send Failed', error instanceof Error ? error.message : 'Failed to send message.');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const hasContact = Boolean(contactId);
  const hasPhone = Boolean(phone);
  const displayName = contactName || 'No contact';
  const phoneLabel = phone || 'No phone number';

  return (
    <div className={`flex flex-col bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden h-full min-h-[280px] ${className}`}>
      {/* Chat Header */}
      <div className="flex items-center justify-between px-4 py-1 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
        <div className="flex items-center min-w-0">
          <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
            {getInitials(displayName)}
          </div>
          <div className="ml-3 min-w-0 truncate">
            <span className="text-lg font-semibold text-gray-900 dark:text-white">
              {displayName}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {' · '}{phoneLabel}
            </span>
          </div>
        </div>
        {onCallClick && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCallClick}
            disabled={!hasContact || !hasPhone}
            className="text-green-600 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-700 dark:hover:bg-green-900/30 flex-shrink-0 py-1.5 px-2.5 text-xs"
          >
            <Icon name="phone" className="w-3 h-3 mr-1.5" />
            Call
          </Button>
        )}
      </div>

      {/* Messages Area - flex-1 min-h-0 so it fills remaining height and can shrink/scroll */}
      <div className="flex-1 min-h-0 overflow-y-scroll overflow-x-hidden px-4 py-2 bg-gray-50 dark:bg-gray-900">
        {messagesLoading && communications.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <Icon name="loader-2" className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : communications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-0 text-gray-500 dark:text-gray-400">
            <Icon name="message-square" className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm font-medium">No messages yet</p>
            <p className="text-xs">Send an SMS or make a call to start the conversation</p>
          </div>
        ) : (
          <div className="space-y-4">
            {communications.map((comm) => (
              <div key={comm.id}>
                {comm.type === 'call' ? (
                  <div className="flex justify-center">
                    <div
                      className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm ${
                        comm.direction === 'outbound'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                      }`}
                    >
                      <Icon name="phone" className="w-4 h-4" />
                      <span className="font-medium">
                        {comm.direction === 'outbound' ? 'Outgoing call' : 'Incoming call'}
                      </span>
                      <span className="text-xs opacity-75">• {formatMessageTime(comm.created_at)}</span>
                    </div>
                  </div>
                ) : (
                  <div className={`flex ${comm.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                        comm.direction === 'outbound'
                          ? 'bg-blue-500 text-white rounded-br-md'
                          : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow rounded-bl-md'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{comm.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          comm.direction === 'outbound'
                            ? 'text-blue-100'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {formatMessageTime(comm.created_at)}
                        {comm.direction === 'outbound' && (
                          <span className="ml-2">
                            {comm.status === 'delivered' ? '✓✓' : comm.status === 'sent' ? '✓' : ''}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="px-2 py-2 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
        <div className="flex items-end space-x-2">
          <textarea
            ref={textareaRef}
            rows={1}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={hasContact && hasPhone ? 'Type a message...' : 'Add a contact and phone number to send SMS'}
            disabled={!hasContact || !hasPhone}
            className="flex-1 min-h-[40px] max-h-[120px] py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm disabled:opacity-60 disabled:cursor-not-allowed resize-none overflow-y-auto"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!hasContact || !hasPhone || !messageText.trim() || sendingMessage}
            className="h-[40px] w-[40px] min-h-[40px] rounded-lg p-0 flex items-center justify-center flex-shrink-0 disabled:opacity-60 disabled:cursor-not-allowed self-end overflow-visible"
          >
            {sendingMessage ? (
              <Icon name="loader-2" className="w-12 h-12 animate-spin -m-1" />
            ) : (
              <Icon name="send" className="w-12 h-12 -m-1" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
