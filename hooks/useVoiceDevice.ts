'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Device, Call } from '@twilio/voice-sdk';
import { getVoiceToken } from '../lib/services/listingManagementApi';

interface UseVoiceDeviceOptions {
  /** When true, register the device on mount (e.g. when on contacts page). */
  registerOnMount?: boolean;
}

export function useVoiceDevice(options: UseVoiceDeviceOptions = {}) {
  const { registerOnMount = true } = options;

  const [deviceReady, setDeviceReady] = useState(false);
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const [error, setError] = useState<string | null>(null);

  const deviceRef = useRef<Device | null>(null);
  const isInitializingRef = useRef(false);

  const initializeAndRegister = useCallback(async () => {
    if (deviceRef.current?.state === Device.State.Registered) {
      setDeviceReady(true);
      return;
    }
    if (isInitializingRef.current) return;
    isInitializingRef.current = true;
    setError(null);

    try {
      const tokenResult = await getVoiceToken();
      if (!tokenResult.success || !tokenResult.token) {
        throw new Error(tokenResult.error || 'Failed to get voice token');
      }

      if (deviceRef.current) {
        deviceRef.current.destroy();
        deviceRef.current = null;
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
        setDeviceReady(true);
      });

      device.on('unregistered', () => {
        setDeviceReady(false);
      });

      device.on('error', async (err: unknown) => {
        const errorCode = (err as { code?: number })?.code;
        if (errorCode === 31000 || errorCode === 31005 || errorCode === 53001) return;
        // 20104 = AccessTokenExpired — re-initialize with a new token
        if (errorCode === 20104) {
          if (deviceRef.current) {
            deviceRef.current.destroy();
            deviceRef.current = null;
          }
          setDeviceReady(false);
          isInitializingRef.current = false;
          initializeAndRegister();
          return;
        }
        setError((err as Error).message || 'Device error');
      });

      device.on('incoming', (call: Call) => {
        setIncomingCall(call);
      });

      // Refresh token before it expires (token TTL is 1 hour; Twilio fires ~60s before expiry)
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

      await device.register();
      deviceRef.current = device;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to initialize voice device';
      setError(msg);
      setDeviceReady(false);
    } finally {
      isInitializingRef.current = false;
    }
  }, []);

  const destroy = useCallback(() => {
    if (deviceRef.current) {
      deviceRef.current.destroy();
      deviceRef.current = null;
    }
    setDeviceReady(false);
    setIncomingCall(null);
    setError(null);
  }, []);

  useEffect(() => {
    if (registerOnMount) {
      initializeAndRegister();
    }
    return () => {
      destroy();
    };
  }, [registerOnMount, initializeAndRegister, destroy]);

  const clearIncomingCall = useCallback(() => {
    setIncomingCall(null);
  }, []);

  return {
    deviceRef,
    deviceReady,
    incomingCall,
    setIncomingCall,
    clearIncomingCall,
    error,
    initializeAndRegister,
    destroy,
  };
}
