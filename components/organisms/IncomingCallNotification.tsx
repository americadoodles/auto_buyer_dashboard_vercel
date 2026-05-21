'use client';

import React, { useEffect, useState } from 'react';
import { useTwilio } from '../../lib/contexts/TwilioContext';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';

export const IncomingCallNotification: React.FC = () => {
  const { 
    incomingCall, 
    activeCall,
    acceptIncomingCall, 
    rejectIncomingCall,
    endActiveCall,
    toggleMute,
    isMuted,
    callDuration
  } = useTwilio();

  const [isRinging, setIsRinging] = useState(false);

  // Ringing animation
  useEffect(() => {
    if (incomingCall) {
      const interval = setInterval(() => {
        setIsRinging(prev => !prev);
      }, 500);
      return () => clearInterval(interval);
    }
    setIsRinging(false);
  }, [incomingCall]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Show incoming call UI
  if (incomingCall) {
    return (
      <div className="fixed top-4 right-4 z-[100] animate-slide-in">
        <div className="bg-claude-surface dark:bg-coal-850 rounded-xl shadow-2xl border border-claude-border dark:border-coal-700 p-4 w-80">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className={`relative w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center ${isRinging ? 'animate-pulse' : ''}`}>
              <Icon name="phone-incoming" className="w-6 h-6 text-green-600 dark:text-green-400" />
              {/* Ringing animation circles */}
              <div className={`absolute inset-0 rounded-full border-2 border-green-400 dark:border-green-500 transition-all duration-300 ${isRinging ? 'scale-125 opacity-0' : 'scale-100 opacity-50'}`} />
              <div className={`absolute inset-0 rounded-full border-2 border-green-400 dark:border-green-500 transition-all duration-500 ${isRinging ? 'scale-150 opacity-0' : 'scale-100 opacity-30'}`} />
            </div>
            <div className="flex-1">
              <p className="text-sm text-claude-subtle dark:text-coal-400">Incoming Call</p>
              <p className="text-lg font-semibold text-claude-ink dark:text-coal-100 truncate">
                {incomingCall.from}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={rejectIncomingCall}
              className="flex-1 bg-red-500 hover:bg-red-600 text-coal-100"
            >
              <Icon name="phone-off" className="w-4 h-4 mr-2" />
              Decline
            </Button>
            <Button
              onClick={acceptIncomingCall}
              className="flex-1 bg-green-500 hover:bg-green-600 text-coal-100"
            >
              <Icon name="phone" className="w-4 h-4 mr-2" />
              Accept
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show active call UI (minimized bar)
  if (activeCall) {
    return (
      <div className="fixed top-4 right-4 z-[100]">
        <div className="bg-green-600 dark:bg-green-700 rounded-xl shadow-2xl p-3 w-72">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-claude-surface/20 flex items-center justify-center">
                <Icon name="phone" className="w-5 h-5 text-coal-100" />
              </div>
              <div>
                <p className="text-sm text-green-100">Call in progress</p>
                <p className="text-lg font-mono text-coal-100">{formatDuration(callDuration)}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={toggleMute}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                  isMuted 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-claude-surface/20 hover:bg-claude-surface/30'
                }`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                <Icon name={isMuted ? 'mic-off' : 'mic'} className="w-4 h-4 text-coal-100" />
              </button>
              <button
                onClick={endActiveCall}
                className="w-9 h-9 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center"
                title="End Call"
              >
                <Icon name="phone-off" className="w-4 h-4 text-coal-100" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
