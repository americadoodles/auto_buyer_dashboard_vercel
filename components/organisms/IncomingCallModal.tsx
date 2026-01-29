'use client';

import React, { useEffect } from 'react';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { useCallSounds } from '../../hooks/useCallSounds';
import type { Call } from '@twilio/voice-sdk';

interface IncomingCallModalProps {
  isOpen: boolean;
  call: Call | null;
  fromLabel: string;
  onAccept: (call: Call) => void;
  onReject: () => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  isOpen,
  call,
  fromLabel,
  onAccept,
  onReject,
}) => {
  const callSounds = useCallSounds({ volume: 0.4, enabled: true });

  // Play ringtone while modal is open
  useEffect(() => {
    if (isOpen && call) {
      callSounds.playRingback();
    } else {
      callSounds.stop();
    }
    return () => callSounds.stop();
  }, [isOpen, call, callSounds]);

  if (!isOpen || !call) return null;

  const handleAccept = () => {
    callSounds.stop();
    call.accept();
    onAccept(call);
  };

  const handleReject = () => {
    callSounds.stop();
    call.reject();
    onReject();
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-900/80" aria-hidden="true" />
        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-sm text-center">
          <div className="mb-6">
            <div className="mx-auto w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4 animate-pulse">
              <Icon name="phone" className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Incoming call</p>
            <p className="text-xl font-semibold text-gray-900 dark:text-white truncate">
              {fromLabel}
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <Button
              onClick={handleReject}
              variant="outline"
              className="flex-1 bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30"
            >
              <Icon name="phone-off" className="w-5 h-5 mr-2" />
              Reject
            </Button>
            <Button
              onClick={handleAccept}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white border-0"
            >
              <Icon name="phone" className="w-5 h-5 mr-2" />
              Accept
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
