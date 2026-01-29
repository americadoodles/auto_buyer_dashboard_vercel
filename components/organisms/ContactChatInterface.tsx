'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Icon } from '../atoms/Icon';
import { Input } from '../atoms/Input';
import { Button } from '../atoms/Button';
import { Badge } from '../atoms/Badge';
import { CallModal } from './CallModal';
import { IncomingCallModal } from './IncomingCallModal';
import { ConfirmationModal } from './ConfirmationModal';
import { useCommunicationHistory } from '../../lib/hooks/useSMSHistory';
import { sendSMS, deleteContact } from '../../lib/services/listingManagementApi';
import { useToast } from '../../hooks/useToast';
import { useVoiceDevice } from '../../hooks/useVoiceDevice';
import type { Call } from '@twilio/voice-sdk';

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  mobile: string;
  company: string;
  job_title: string;
  notes?: string;
  contact_type: {
    id: number;
    name: string;
    color: string;
  };
  assigned_to: {
    id: string;
    username: string;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_contact: string;
  status?: {
    id: number;
    name: string;
    color: string;
  };
}

interface ContactChatInterfaceProps {
  contacts: Contact[];
  onContactUpdated?: () => void;
  onNewContact?: () => void;
  onUpdateContact?: (contact: Contact) => void;
}

export const ContactChatInterface: React.FC<ContactChatInterfaceProps> = ({
  contacts,
  onContactUpdated,
  onNewContact,
  onUpdateContact,
}) => {
  const { showSuccess, showError } = useToast();
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [messageText, setMessageText] = useState('');
  const [showCallModal, setShowCallModal] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(true);
  const [isRemoving, setIsRemoving] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [acceptedCall, setAcceptedCall] = useState<Call | null>(null);
  const [acceptedCallFromLabel, setAcceptedCallFromLabel] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Voice device for both outbound and incoming calls (registers on mount)
  const {
    deviceRef: voiceDeviceRef,
    deviceReady: voiceDeviceReady,
    incomingCall,
    clearIncomingCall,
  } = useVoiceDevice({ registerOnMount: true });

  const handleAcceptIncoming = useCallback((call: Call) => {
    const fromLabel = (call.parameters?.From as string) || 'Unknown';
    setAcceptedCallFromLabel(fromLabel);
    setAcceptedCall(call);
    clearIncomingCall();
    setShowCallModal(true);
  }, [clearIncomingCall]);

  const handleAcceptedCallEnded = useCallback(() => {
    setAcceptedCall(null);
    setAcceptedCallFromLabel('');
    setShowCallModal(false);
    onContactUpdated?.();
  }, [onContactUpdated]);

  // Communication history (SMS + Calls) for selected contact
  const { 
    communications, 
    loading: messagesLoading, 
    refresh: refreshMessages,
    sendingMessage,
    setSendingMessage 
  } = useCommunicationHistory(selectedContact?.id || null);

  // Filter contacts based on search
  const filteredContacts = contacts.filter((contact) => {
    const fullName = `${contact.first_name} ${contact.last_name}`.toLowerCase();
    const search = searchTerm.toLowerCase();
    return (
      fullName.includes(search) ||
      contact.email?.toLowerCase().includes(search) ||
      contact.phone?.includes(search) ||
      contact.mobile?.includes(search) ||
      contact.company?.toLowerCase().includes(search)
    );
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [communications]);

  // Auto-select first contact if none selected
  useEffect(() => {
    if (!selectedContact && contacts.length > 0) {
      setSelectedContact(contacts[0]);
    }
  }, [contacts, selectedContact]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedContact) return;

    const phoneNumber = selectedContact.mobile || selectedContact.phone;
    if (!phoneNumber) {
      showError('No Phone Number', 'This contact does not have a phone number.');
      return;
    }

    setSendingMessage(true);
    try {
      const result = await sendSMS(selectedContact.id, messageText.trim(), phoneNumber);
      if (result.success) {
        setMessageText('');
        refreshMessages();
        showSuccess('Message Sent', 'Your SMS has been sent successfully.');
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
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
      hour12: true
    });
  };

  const getContactInitials = (contact: Contact) => {
    return `${contact.first_name?.[0] || ''}${contact.last_name?.[0] || ''}`.toUpperCase();
  };

  const getContactDisplayName = (contact: Contact) => {
    return `${contact.first_name} ${contact.last_name}`.trim() || 'Unknown';
  };

  const handleRemoveContact = () => {
    if (!selectedContact) return;
    setShowRemoveModal(true);
  };

  const confirmRemoveContact = async () => {
    if (!selectedContact) return;
    
    setIsRemoving(true);
    try {
      await deleteContact(selectedContact.id);
      setShowRemoveModal(false);
      setSelectedContact(null);
      onContactUpdated?.();
    } catch (error) {
      console.error('Error removing contact:', error);
      setShowRemoveModal(false);
      alert('Failed to remove contact. Please try again.');
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="flex h-full bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden">
      {/* Left Sidebar - Contact List */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-gray-800">
        {/* Search Header */}
        <div className="py-2 px-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Contacts <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({contacts.length})</span>
            </h2>
            {onNewContact && (
              <Button variant="ghost" size="sm" onClick={onNewContact} title="Add new contact">
                <Icon name="plus" className="w-4 h-4" />
              </Button>
            )}
          </div>
          <div className="relative">
            <Icon name="search" className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full bg-white dark:bg-gray-700"
            />
          </div>
        </div>

        {/* Contact List */}
        <div className="flex-1 overflow-y-auto">
          {filteredContacts.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              <Icon name="users" className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No contacts found</p>
            </div>
          ) : (
            filteredContacts.map((contact) => (
              <div
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className={`flex items-center p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                  selectedContact?.id === contact.id
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500'
                    : 'border-l-4 border-transparent'
                }`}
              >
                <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
                  selectedContact?.id === contact.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                }`}>
                  <span className="text-sm font-medium">{getContactInitials(contact)}</span>
                </div>
                <div className="ml-3 flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${
                    selectedContact?.id === contact.id
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {getContactDisplayName(contact)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {contact.mobile || contact.phone || contact.email || 'No contact info'}
                  </p>
                </div>
                {contact.status && (
                  <Badge color={contact.status.color || 'gray'} className="ml-2 text-xs">
                    {contact.status.name}
                  </Badge>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Center - Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between px-4 py-1 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                  {getContactInitials(selectedContact)}
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {getContactDisplayName(selectedContact)}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedContact.mobile || selectedContact.phone || 'No phone number'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCallModal(true)}
                  disabled={!selectedContact.mobile && !selectedContact.phone}
                  className="text-green-600 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-700 dark:hover:bg-green-900/30"
                >
                  <Icon name="phone" className="w-4 h-4 mr-2" />
                  Call
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowInfoPanel(!showInfoPanel)}
                  title={showInfoPanel ? 'Hide info' : 'Show info'}
                >
                  <Icon name="info" className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
              {messagesLoading && communications.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <Icon name="loader-2" className="w-8 h-8 animate-spin text-blue-500" />
                </div>
              ) : communications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                  <Icon name="message-square" className="w-16 h-16 mb-4 opacity-50" />
                  <p className="text-lg font-medium">No messages yet</p>
                  <p className="text-sm">Start a conversation by sending an SMS or making a call</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {communications.map((comm) => (
                    <div key={comm.id}>
                      {comm.type === 'call' ? (
                        // Call entry - centered with special styling
                        <div className="flex justify-center">
                          <div className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm ${
                            comm.direction === 'outbound'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                              : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                          }`}>
                            <Icon 
                              name={comm.direction === 'outbound' ? 'phone' : 'phone'} 
                              className="w-4 h-4" 
                            />
                            <span className="font-medium">
                              {comm.direction === 'outbound' ? 'Outgoing call' : 'Incoming call'}
                            </span>
                            <span className="text-xs opacity-75">
                              • {comm.status === 'completed' || comm.status === 'in-progress' ? 'Connected' : comm.status}
                            </span>
                            <span className="text-xs opacity-75">
                              • {formatMessageTime(comm.created_at)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        // SMS message - chat bubble styling
                        <div className={`flex ${comm.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                              comm.direction === 'outbound'
                                ? 'bg-blue-500 text-white rounded-br-md'
                                : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow rounded-bl-md'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">{comm.content}</p>
                            <p className={`text-xs mt-1 ${
                              comm.direction === 'outbound'
                                ? 'text-blue-100'
                                : 'text-gray-500 dark:text-gray-400'
                            }`}>
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
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              {(!selectedContact.mobile && !selectedContact.phone) ? (
                <div className="text-center py-2 text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <Icon name="alert-triangle" className="w-4 h-4 inline mr-2" />
                  This contact has no phone number. Add one to send SMS.
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type a message..."
                      className="w-full h-11 px-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageText.trim() || sendingMessage}
                    className="h-11 w-11 rounded-full p-0 flex items-center justify-center flex-shrink-0"
                  >
                    {sendingMessage ? (
                      <Icon name="loader-2" className="w-5 h-5 animate-spin" />
                    ) : (
                      <Icon name="send" className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <Icon name="message-circle" className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Select a contact</p>
              <p className="text-sm">Choose a contact to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel - Contact Info */}
      {showInfoPanel && selectedContact && (
        <div className="w-80 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto">
          {/* Contact Header */}
          <div className="p-4 text-center border-b border-gray-200 dark:border-gray-700">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
              {getContactInitials(selectedContact)}
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {getContactDisplayName(selectedContact)}
            </h3>
            {selectedContact.job_title && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{selectedContact.job_title}</p>
            )}
            {selectedContact.company && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{selectedContact.company}</p>
            )}
            <div className="flex justify-center mt-4 space-x-2">
              {selectedContact.status && (
                <Badge color={selectedContact.status.color || 'blue'}>
                  {selectedContact.status.name}
                </Badge>
              )}
              <Badge color={selectedContact.is_active ? 'green' : 'gray'}>
                {selectedContact.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Quick Actions</h4>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCallModal(true)}
                disabled={!selectedContact.mobile && !selectedContact.phone}
                className="flex items-center justify-center"
              >
                <Icon name="phone" className="w-4 h-4 mr-2" />
                Call
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!selectedContact.email}
                onClick={() => {
                  if (selectedContact.email) {
                    window.open(`mailto:${selectedContact.email}`, '_blank');
                  }
                }}
                className="flex items-center justify-center"
              >
                <Icon name="mail" className="w-4 h-4 mr-2" />
                Email
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onUpdateContact?.(selectedContact)}
                className="flex items-center justify-center"
              >
                <Icon name="pencil" className="w-4 h-4 mr-2" />
                Update
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveContact}
                disabled={isRemoving}
                className="flex items-center justify-center text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/30"
              >
                <Icon name="trash-2" className="w-4 h-4 mr-2" />
                {isRemoving ? 'Removing...' : 'Remove'}
              </Button>
            </div>
          </div>

          {/* Contact Details */}
          <div className="p-4">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Contact Information</h4>
            <div className="space-y-3">
              {selectedContact.mobile && (
                <div className="flex items-center text-sm">
                  <Icon name="smartphone" className="w-4 h-4 text-gray-400 mr-3" />
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Mobile</p>
                    <p className="text-gray-900 dark:text-white">{selectedContact.mobile}</p>
                  </div>
                </div>
              )}
              {selectedContact.phone && (
                <div className="flex items-center text-sm">
                  <Icon name="phone" className="w-4 h-4 text-gray-400 mr-3" />
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Phone</p>
                    <p className="text-gray-900 dark:text-white">{selectedContact.phone}</p>
                  </div>
                </div>
              )}
              {selectedContact.email && (
                <div className="flex items-center text-sm">
                  <Icon name="mail" className="w-4 h-4 text-gray-400 mr-3" />
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Email</p>
                    <p className="text-gray-900 dark:text-white">{selectedContact.email}</p>
                  </div>
                </div>
              )}
              {selectedContact.company && (
                <div className="flex items-center text-sm">
                  <Icon name="building-2" className="w-4 h-4 text-gray-400 mr-3" />
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Company</p>
                    <p className="text-gray-900 dark:text-white">{selectedContact.company}</p>
                  </div>
                </div>
              )}
              {selectedContact.assigned_to?.username && (
                <div className="flex items-center text-sm">
                  <Icon name="user" className="w-4 h-4 text-gray-400 mr-3" />
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Assigned To</p>
                    <p className="text-gray-900 dark:text-white">{selectedContact.assigned_to.username}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {selectedContact.notes && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Notes</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {selectedContact.notes}
              </p>
            </div>
          )}

          {/* Timestamps */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
            <p>Created: {new Date(selectedContact.created_at).toLocaleDateString()}</p>
            <p>Updated: {new Date(selectedContact.updated_at).toLocaleDateString()}</p>
          </div>
        </div>
      )}

      {/* Incoming call modal */}
      <IncomingCallModal
        isOpen={!!incomingCall}
        call={incomingCall}
        fromLabel={incomingCall ? ((incomingCall.parameters?.From as string) || 'Unknown') : ''}
        onAccept={handleAcceptIncoming}
        onReject={clearIncomingCall}
      />

      {/* Call Modal (outbound or accepted incoming) */}
      <CallModal
        isOpen={showCallModal}
        onClose={() => {
          setShowCallModal(false);
          setAcceptedCall(null);
          setAcceptedCallFromLabel('');
        }}
        contactId={selectedContact?.id || ''}
        contactName={acceptedCall ? acceptedCallFromLabel : (selectedContact ? getContactDisplayName(selectedContact) : '')}
        phone={selectedContact?.phone}
        mobile={selectedContact?.mobile}
        onCallInitiated={() => onContactUpdated?.()}
        externalDeviceRef={voiceDeviceRef}
        externalDeviceReady={voiceDeviceReady}
        acceptedCall={acceptedCall}
        onAcceptedCallEnded={handleAcceptedCallEnded}
      />

      {/* Remove Contact Confirmation Modal */}
      <ConfirmationModal
        isOpen={showRemoveModal}
        onClose={() => setShowRemoveModal(false)}
        onConfirm={confirmRemoveContact}
        title="Remove Contact"
        message={`Are you sure you want to remove ${selectedContact ? getContactDisplayName(selectedContact) : ''}? This action cannot be undone.`}
        confirmText="Remove"
        cancelText="Cancel"
        variant="danger"
        loading={isRemoving}
        loadingText="Removing..."
      />
    </div>
  );
};
