'use client';

import React, { useState } from 'react';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Send } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'contact';
  timestamp: string;
}

interface SMSThreadCompactProps {
  messages?: Message[];
  contactName?: string;
}

export const SMSThreadCompact: React.FC<SMSThreadCompactProps> = ({
  messages = [],
  contactName = 'John',
}) => {
  const [messageText, setMessageText] = useState('');

  // Default messages if none provided
  const defaultMessages: Message[] = messages.length > 0 ? messages : [
    {
      id: '1',
      text: `Hi ${contactName}, I see you're interested in the 2017 Jaguar XJ. Is there a good time to chat?`,
      sender: 'contact',
      timestamp: '10:04 AM',
    },
    {
      id: '2',
      text: 'Hi yes! I can talk around 2 PM today.',
      sender: 'user',
      timestamp: '10:10 AM',
    },
    {
      id: '3',
      text: "Sounds good! I will call you at 2 PM. Is there anything specific you'd like to know about the Jaguar XJ?",
      sender: 'contact',
      timestamp: '10:14 AM',
    },
    {
      id: '4',
      text: "I just want to know the vehicle's history and its current condition.",
      sender: 'user',
      timestamp: '10:18 AM',
    },
  ];

  const displayMessages = messages.length > 0 ? messages : defaultMessages;

  const handleSend = () => {
    if (!messageText.trim()) return;
    // Handle send logic here
    setMessageText('');
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-[#1a1d29] border-gray-700/50 p-4 h-full">
      <div className="relative flex-1 pr-4 mb-4 overflow-y-auto min-h-0">
        <div className="space-y-4">
          {displayMessages.map((message) => (
            <div
              key={message.id}
              className={`flex flex-col ${
                message.sender === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              {message.sender === 'contact' && (
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-6 w-6 rounded-full bg-gray-600 flex items-center justify-center text-xs">
                    👤
                  </div>
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-lg px-4 py-2 ${
                  message.sender === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-100'
                }`}
              >
                <p className="text-sm">{message.text}</p>
              </div>
              <p className="text-xs mt-1 text-gray-500">{message.timestamp}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <Input
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder={`Message ${contactName}...`}
          className="flex-1 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSend();
            }
          }}
        />
        <Button
          onClick={handleSend}
          className="size-9 rounded-md bg-blue-600 hover:bg-blue-700"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
