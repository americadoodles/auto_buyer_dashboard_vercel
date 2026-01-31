'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { Device, Call } from '@twilio/voice-sdk';
import { getVoiceToken } from '../services/listingManagementApi';
import { useToast } from '../../hooks/useToast';

interface IncomingCall {
  call: Call;
  from: string;
  callSid: string;
}

interface TwilioContextType {
  device: Device | null;
  deviceReady: boolean;
  incomingCall: IncomingCall | null;
  activeCall: Call | null;
  acceptIncomingCall: () => void;
  rejectIncomingCall: () => void;
  endActiveCall: () => void;
  toggleMute: () => void;
  isMuted: boolean;
  callDuration: number;
  initializeDevice: () => Promise<void>;
}

const TwilioContext = createContext<TwilioContextType | null>(null);

export const useTwilio = () => {
  const context = useContext(TwilioContext);
  if (!context) {
    throw new Error('useTwilio must be used within a TwilioProvider');
  }
  return context;
};

export const TwilioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deviceReady, setDeviceReady] = useState(false);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  
  const deviceRef = useRef<Device | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { showSuccess, showError, showInfo } = useToast();

  // Initialize Twilio Device
  const initializeDevice = useCallback(async () => {
    if (deviceRef.current?.state === Device.State.Registered) {
      setDeviceReady(true);
      return;
    }

    try {
      const tokenResult = await getVoiceToken();
      
      if (!tokenResult.success || !tokenResult.token) {
        console.error('Failed to get voice token:', tokenResult.error);
        return;
      }

      const device = new Device(tokenResult.token, {
        logLevel: 0,
        codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
        edge: 'roaming',
        enableImprovedSignalingErrorPrecision: true,
        closeProtection: true,
        maxAverageBitrate: 48000,
      });

      device.on('registered', () => {
        console.log('Twilio Device registered globally');
        setDeviceReady(true);
      });

      device.on('unregistered', () => {
        console.log('Twilio Device unregistered');
        setDeviceReady(false);
      });

      device.on('error', (error) => {
        const errorCode = (error as any).code;
        if (errorCode === 31000 || errorCode === 31005 || errorCode === 53001) {
          return;
        }
        // 20104 = AccessTokenExpired — destroy and re-initialize with a new token
        if (errorCode === 20104) {
          console.warn('Twilio access token expired, re-initializing device...');
          if (deviceRef.current) {
            deviceRef.current.destroy();
            deviceRef.current = null;
          }
          setDeviceReady(false);
          initializeDevice();
          return;
        }
        console.error('Twilio Device error:', error);
        showError('Voice Error', error.message || 'An error occurred with the voice device');
      });

      // Refresh token before it expires (TTL is 1 hour; Twilio fires ~60s before expiry)
      device.on('tokenWillExpire', async () => {
        try {
          const tokenResult = await getVoiceToken();
          if (tokenResult.success && tokenResult.token) {
            device.updateToken(tokenResult.token);
          }
        } catch (e) {
          console.error('Failed to refresh voice token:', e);
        }
      });

      // Handle incoming calls
      device.on('incoming', (call: Call) => {
        console.log('Incoming call from:', call.parameters.From);
        
        const incomingCallData: IncomingCall = {
          call,
          from: call.parameters.From || 'Unknown',
          callSid: call.parameters.CallSid || '',
        };
        
        setIncomingCall(incomingCallData);
        showInfo('Incoming Call', `Call from ${call.parameters.From || 'Unknown'}`);

        // Set up call event handlers
        call.on('cancel', () => {
          console.log('Incoming call cancelled');
          setIncomingCall(null);
        });

        call.on('disconnect', () => {
          console.log('Incoming call disconnected');
          setIncomingCall(null);
          setActiveCall(null);
          setIsMuted(false);
          stopDurationTimer();
        });

        call.on('reject', () => {
          console.log('Incoming call rejected');
          setIncomingCall(null);
        });
      });

      await device.register();
      deviceRef.current = device;

    } catch (error) {
      console.error('Error initializing Twilio Device:', error);
    }
  }, [showError, showInfo]);

  // Start duration timer
  const startDurationTimer = useCallback(() => {
    if (!durationIntervalRef.current) {
      setCallDuration(0);
      durationIntervalRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
  }, []);

  // Stop duration timer
  const stopDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    setCallDuration(0);
  }, []);

  // Accept incoming call
  const acceptIncomingCall = useCallback(() => {
    if (incomingCall?.call) {
      incomingCall.call.accept();
      setActiveCall(incomingCall.call);
      setIncomingCall(null);
      startDurationTimer();
      showSuccess('Call Connected', 'You are now connected');

      incomingCall.call.on('disconnect', () => {
        setActiveCall(null);
        setIsMuted(false);
        stopDurationTimer();
        showInfo('Call Ended', 'The call has ended');
      });
    }
  }, [incomingCall, showSuccess, showInfo, startDurationTimer, stopDurationTimer]);

  // Reject incoming call
  const rejectIncomingCall = useCallback(() => {
    if (incomingCall?.call) {
      incomingCall.call.reject();
      setIncomingCall(null);
      showInfo('Call Rejected', 'You rejected the incoming call');
    }
  }, [incomingCall, showInfo]);

  // End active call
  const endActiveCall = useCallback(() => {
    if (activeCall) {
      activeCall.disconnect();
      setActiveCall(null);
      setIsMuted(false);
      stopDurationTimer();
      showSuccess('Call Ended', 'The call has been ended');
    }
  }, [activeCall, showSuccess, stopDurationTimer]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (activeCall) {
      const newMuteState = !isMuted;
      activeCall.mute(newMuteState);
      setIsMuted(newMuteState);
    }
  }, [activeCall, isMuted]);

  // Initialize device on mount
  useEffect(() => {
    initializeDevice();

    return () => {
      if (deviceRef.current) {
        deviceRef.current.destroy();
        deviceRef.current = null;
      }
      stopDurationTimer();
    };
  }, [initializeDevice, stopDurationTimer]);

  const value: TwilioContextType = {
    device: deviceRef.current,
    deviceReady,
    incomingCall,
    activeCall,
    acceptIncomingCall,
    rejectIncomingCall,
    endActiveCall,
    toggleMute,
    isMuted,
    callDuration,
    initializeDevice,
  };

  return (
    <TwilioContext.Provider value={value}>
      {children}
    </TwilioContext.Provider>
  );
};
