'use client';

import { useRef, useCallback, useEffect, useMemo } from 'react';

interface UseCallSoundsOptions {
  volume?: number;
  enabled?: boolean;
}

export const useCallSounds = (options: UseCallSoundsOptions = {}) => {
  const { volume = 0.3, enabled = true } = options;
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const oscillator2Ref = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPlayingRef = useRef<boolean>(false);

  // Initialize AudioContext
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Stop any currently playing sound
  const stopSound = useCallback(() => {
    isPlayingRef.current = false;
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
      } catch (e) {
        // Ignore errors from already stopped oscillators
      }
      oscillatorRef.current = null;
    }

    if (oscillator2Ref.current) {
      try {
        oscillator2Ref.current.stop();
        oscillator2Ref.current.disconnect();
      } catch (e) {
        // Ignore errors from already stopped oscillators
      }
      oscillator2Ref.current = null;
    }

    if (gainNodeRef.current) {
      gainNodeRef.current.disconnect();
      gainNodeRef.current = null;
    }
  }, []);

  // Play ringback tone (US ringback: 440Hz + 480Hz, 2s on, 4s off pattern)
  const playRingback = useCallback(() => {
    if (!enabled) return;
    stopSound();

    isPlayingRef.current = true;

    const playRing = () => {
      if (!isPlayingRef.current) return;

      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.frequency.value = 440;
      osc2.frequency.value = 480;
      osc1.type = 'sine';
      osc2.type = 'sine';
      gainNode.gain.value = volume * 0.2;

      // Fade out at the end
      gainNode.gain.setTargetAtTime(0, ctx.currentTime + 1.8, 0.1);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 2);
      osc2.stop(ctx.currentTime + 2);

      oscillatorRef.current = osc1;
      oscillator2Ref.current = osc2;
      gainNodeRef.current = gainNode;
    };

    // Play immediately, then repeat every 6 seconds (2s ring + 4s silence)
    playRing();
    intervalRef.current = setInterval(playRing, 6000);

  }, [enabled, volume, getAudioContext, stopSound]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSound();
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [stopSound]);

  // Memoize the return object to prevent unnecessary re-renders
  return useMemo(() => ({
    stop: stopSound,
    playRingback,
  }), [stopSound, playRingback]);
};
