'use client';

import React, { useState } from 'react';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { sendSMS } from '../../lib/services/listingManagementApi';
import { useToast } from '../../hooks/useToast';

interface SMSModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactId: string;
  contactName: string;
  phoneNumber?: string;
  onSent?: () => void;
}

export const SMSModal: React.FC<SMSModalProps> = ({
  isOpen,
  onClose,
  contactId,
  contactName,
  phoneNumber,
  onSent
}) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const { showSuccess, showError } = useToast();

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!message.trim()) {
      showError('Message Required', 'Please enter a message to send.');
      return;
    }

    if (!phoneNumber) {
      showError('Phone Number Required', 'This contact does not have a phone number. Please add one first.');
      return;
    }

    setSending(true);
    try {
      const result = await sendSMS(contactId, message, phoneNumber);
      if (result.success) {
        showSuccess('SMS Sent', `Message sent successfully to ${contactName}`);
        setMessage('');
        onClose();
        if (onSent) {
          onSent();
        }
      } else {
        showError('Failed to Send SMS', result.error || 'An error occurred while sending the SMS.');
      }
    } catch (error) {
      console.error('Error sending SMS:', error);
      showError('Failed to Send SMS', error instanceof Error ? error.message : 'An unexpected error occurred.');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (!sending) {
      setMessage('');
      onClose();
    }
  };

  const characterCount = message.length;
  const maxLength = 1600;
  const isNearLimit = characterCount > maxLength * 0.9;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-claude-subtle bg-opacity-75 dark:bg-coal-900 dark:bg-opacity-75"
          onClick={handleClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-claude-surface dark:bg-coal-850 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-claude-surface dark:bg-coal-850 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium leading-6 text-claude-ink dark:text-coal-100">
                Send SMS to {contactName}
              </h3>
              <button
                onClick={handleClose}
                disabled={sending}
                className="text-claude-subtle hover:text-claude-subtle dark:hover:text-claude-subtle focus:outline-none disabled:opacity-50"
              >
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-claude-text dark:text-coal-300 mb-2">
                  Phone Number
                </label>
                <div className="flex items-center space-x-2 text-sm text-claude-muted dark:text-coal-400">
                  <Icon name="phone" className="w-4 h-4" />
                  <span>{phoneNumber || 'No phone number available'}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-claude-text dark:text-coal-300 mb-2">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message here..."
                  rows={6}
                  maxLength={maxLength}
                  disabled={sending || !phoneNumber}
                  className={`w-full px-3 py-2 border border-claude-divider dark:border-coal-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-claude-surface dark:bg-coal-700 text-claude-ink dark:text-coal-100 placeholder-gray-400 dark:placeholder-gray-500 ${
                    sending || !phoneNumber ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                />
                <div className="flex justify-between items-center mt-1">
                  <span className={`text-xs ${isNearLimit ? 'text-red-500' : 'text-claude-subtle dark:text-coal-400'}`}>
                    {characterCount} / {maxLength} characters
                  </span>
                  {!phoneNumber && (
                    <span className="text-xs text-red-500">
                      Phone number required
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-claude-cream dark:bg-coal-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <Button
              onClick={handleSend}
              disabled={sending || !message.trim() || !phoneNumber}
              className="w-full sm:w-auto sm:ml-3"
            >
              {sending ? (
                <>
                  <Icon name="loader-2" className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Icon name="send" className="w-4 h-4 mr-2" />
                  Send SMS
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={sending}
              className="mt-3 sm:mt-0 w-full sm:w-auto"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
