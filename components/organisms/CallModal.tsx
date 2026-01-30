'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { getVoiceToken, getCallStatus, stopCall } from '../../lib/services/listingManagementApi';
import { useToast } from '../../hooks/useToast';
import { useCallSounds } from '../../hooks/useCallSounds';
import { Device, Call } from '@twilio/voice-sdk';

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactId: string;
  contactName: string;
  phone?: string;
  mobile?: string;
  onCallInitiated?: () => void;
  /** When provided, use this device instead of creating one (for incoming call support). */
  externalDeviceRef?: React.MutableRefObject<Device | null>;
  /** Device ready state when using external device. */
  externalDeviceReady?: boolean;
  /** When set, show in-progress UI for this accepted incoming call. */
  acceptedCall?: Call | null;
  /** Called when the accepted incoming call ends. */
  onAcceptedCallEnded?: () => void;
}

type CallState = 'idle' | 'initializing' | 'ready' | 'connecting' | 'ringing' | 'in-progress' | 'completed' | 'failed' | 'busy' | 'no-answer';

export const CallModal: React.FC<CallModalProps> = ({
  isOpen,
  onClose,
  contactId,
  contactName,
  phone,
  mobile,
  onCallInitiated,
  externalDeviceRef,
  externalDeviceReady = false,
  acceptedCall,
  onAcceptedCallEnded,
}) => {
  const [callState, setCallState] = useState<CallState>('idle');
  const [callDuration, setCallDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState(false);
  const [deviceReady, setDeviceReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { showSuccess, showError } = useToast();
  
  // Call sounds hook - only ringback sound when calling
  const callSounds = useCallSounds({ volume: 0.3, enabled: soundEnabled });
  
  // Refs for Twilio Device and Call (use external when provided)
  const deviceRef = useRef<Device | null>(null);
  const activeCallRef = useRef<Call | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const effectiveDevice = externalDeviceRef?.current ?? deviceRef.current;
  const effectiveDeviceReady = externalDeviceRef ? externalDeviceReady : deviceReady;
  
  // Audio level for visual effect
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  
  // Determine available phone numbers
  const hasPhone = !!phone;
  const hasMobile = !!mobile;
  const hasMultipleNumbers = hasPhone && hasMobile;
  
  // Default to mobile if available, otherwise phone
  const defaultNumber = mobile || phone;
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState<string>(defaultNumber || '');

  // Initialize Twilio Device when modal opens
  const initializeDevice = useCallback(async () => {
    if (deviceRef.current) {
      // Device already exists
      if (deviceRef.current.state === Device.State.Registered) {
        setDeviceReady(true);
        setCallState('ready');
        return;
      }
    }

    setCallState('initializing');
    setErrorMessage(null);

    try {
      // Get voice token from backend
      const tokenResult = await getVoiceToken();
      
      if (!tokenResult.success || !tokenResult.token) {
        throw new Error(tokenResult.error || 'Failed to get voice token');
      }

      // Create new Twilio Device with optimized settings for voice quality
      const device = new Device(tokenResult.token, {
        // Disable verbose logging (set to 1 for debug)
        logLevel: 0,
        // Codec preferences - Opus is highest quality, PCMU as fallback
        codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
        // Select closest Twilio edge location for lowest latency
        // Options: 'ashburn', 'dublin', 'frankfurt', 'sao-paulo', 'singapore', 'sydney', 'tokyo', 'roaming'
        edge: 'roaming', // Auto-select closest edge
        // Enable DSCP (Differentiated Services Code Point) for QoS
        // This marks voice packets as high priority for better routing
        enableImprovedSignalingErrorPrecision: true,
        // Close protection - warns before closing if call is active
        closeProtection: true,
        // Maximum average bitrate for Opus codec (higher = better quality, more bandwidth)
        // Range: 6000-510000, default is ~32000
        maxAverageBitrate: 48000,
      });

      // Set up device event handlers
      device.on('registered', () => {
        console.log('Twilio Device registered');
        setDeviceReady(true);
        setCallState('ready');
      });

      device.on('unregistered', () => {
        console.log('Twilio Device unregistered');
        setDeviceReady(false);
      });

      device.on('error', (error) => {
        // Ignore connection errors when device is being destroyed or modal is closed
        // These are expected when the WebSocket disconnects after closing
        const errorCode = (error as any).code;
        if (errorCode === 31000 || errorCode === 31005 || errorCode === 53001) {
          console.log('Twilio Device connection closed (expected after modal close)');
          return;
        }
        console.error('Twilio Device error:', error);
        setErrorMessage(error.message || 'Device error occurred');
        showError('Device Error', error.message || 'An error occurred with the voice device');
      });

      device.on('incoming', (call: Call) => {
        console.log('Incoming call from:', call.parameters.From);
        // For now, we don't handle incoming calls - reject them
        call.reject();
      });

      // Refresh token before it expires (TTL is 1 hour)
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

      // Register the device
      await device.register();
      deviceRef.current = device;

    } catch (error) {
      console.error('Error initializing Twilio Device:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to initialize voice device';
      setErrorMessage(errorMsg);
      setCallState('failed');
      showError('Initialization Failed', errorMsg);
    }
  }, [showError]);

  // Update selected number when modal opens or props change
  useEffect(() => {
    if (isOpen) {
      setSelectedPhoneNumber(mobile || phone || '');
      // Initialize device when modal opens (only if not using external device)
      if (!externalDeviceRef) {
        initializeDevice();
      } else if (externalDeviceReady) {
        setDeviceReady(true);
        setCallState('ready');
      }
    }
  }, [isOpen, mobile, phone, initializeDevice, externalDeviceRef, externalDeviceReady]);

  // When acceptedCall is set, show in-progress UI and attach handlers
  useEffect(() => {
    if (!acceptedCall) return;
    activeCallRef.current = acceptedCall;
    setCallState('in-progress');
    setCallDuration(0);

    const onDisconnect = () => {
      setCallState('completed');
      activeCallRef.current = null;
      setIsMuted(false);
      onAcceptedCallEnded?.();
    };

    acceptedCall.on('disconnect', onDisconnect);
    acceptedCall.on('cancel', onDisconnect);
    acceptedCall.on('error', () => {
      activeCallRef.current = null;
      setCallState('failed');
      onAcceptedCallEnded?.();
    });
  }, [acceptedCall, onAcceptedCallEnded]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up device
      if (deviceRef.current) {
        deviceRef.current.destroy();
        deviceRef.current = null;
      }
      // Clean up intervals
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Update duration when call is in progress
  useEffect(() => {
    if (callState === 'in-progress') {
      if (!durationIntervalRef.current) {
        setCallDuration(0);
        durationIntervalRef.current = setInterval(() => {
          setCallDuration(prev => prev + 1);
        }, 1000);
      }
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    };
  }, [callState]);

  // Play ringback sound when connecting or ringing
  useEffect(() => {
    if (callState === 'connecting' || callState === 'ringing') {
      callSounds.playRingback();
    } else {
      callSounds.stop();
    }
  }, [callState, callSounds]);

  // Audio level animation when call is in progress
  useEffect(() => {
    const startSimulatedAudio = () => {
      let time = 0;
      
      const updateLevel = () => {
        const baseWave = Math.sin(time * 0.05) * 0.3;
        const speechWave = Math.sin(time * 0.15) * 0.25;
        const variation = Math.sin(time * 0.03) * 0.2;
        const randomNoise = (Math.random() - 0.5) * 0.15;
        
        const silencePeriod = Math.sin(time * 0.01) > 0.7 ? 0.3 : 1;
        const level = Math.max(0, Math.min(1, 
          (0.3 + baseWave + speechWave + variation + randomNoise) * silencePeriod
        ));
        
        setAudioLevel(level);
        time++;
        
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      
      updateLevel();
    };

    const stopSimulatedAudio = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      setAudioLevel(0);
    };

    if (callState === 'in-progress' && !isMuted) {
      startSimulatedAudio();
    } else {
      stopSimulatedAudio();
    }

    return () => {
      stopSimulatedAudio();
    };
  }, [callState, isMuted]);

  // Show modal when open for outbound or when showing accepted incoming call
  if (!isOpen && !acceptedCall) return null;

  const handleCall = async () => {
    if (!selectedPhoneNumber) {
      showError('Phone Number Required', 'This contact does not have a phone number. Please add one first.');
      return;
    }

    const device = externalDeviceRef?.current ?? deviceRef.current;
    if (!device || !effectiveDeviceReady) {
      showError('Device Not Ready', 'Voice device is not ready. Please wait or refresh the page.');
      return;
    }

    // Prevent starting a new call if one is already active
    if (activeCallRef.current) {
      showError('Call in Progress', 'Please end the current call before starting a new one.');
      return;
    }

    setCallState('connecting');
    setErrorMessage(null);

    try {
      // Make the call using Twilio Device
      // The phone number is passed to the TwiML App webhook
      const call = await device.connect({
        params: {
          To: selectedPhoneNumber,
          ContactId: contactId,
          ContactName: contactName,
        }
      });

      activeCallRef.current = call;

      // Set up call event handlers
      call.on('ringing', () => {
        console.log('Call is ringing');
        setCallState('ringing');
      });

      call.on('accept', () => {
        console.log('Call accepted/connected (could be person or voicemail)');
        setCallState('in-progress');
        // Note: Don't show "Call Connected" toast here because this also triggers
        // when voicemail picks up, which can be misleading
        if (onCallInitiated) {
          onCallInitiated();
        }
      });

      call.on('disconnect', () => {
        console.log('Call disconnected');
        setCallState('completed');
        activeCallRef.current = null;
        setIsMuted(false);
      });

      call.on('cancel', () => {
        console.log('Call cancelled');
        setCallState('completed');
        activeCallRef.current = null;
        setIsMuted(false);
      });

      call.on('reject', () => {
        console.log('Call rejected');
        callSounds.stop();
        setCallState('busy');
        activeCallRef.current = null;
        showError('Call Rejected', 'The call was rejected or the line is busy.');
        onClose();
      });

      call.on('error', (error) => {
        console.error('Call error:', error);
        setCallState('failed');
        setErrorMessage(error.message || 'Call error occurred');
        activeCallRef.current = null;
        showError('Call Failed', error.message || 'An error occurred during the call');
      });

      showSuccess('Call Initiated', `Calling ${contactName}...`);

    } catch (error) {
      console.error('Error initiating call:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to initiate call';
      setErrorMessage(errorMsg);
      setCallState('failed');
      showError('Failed to Initiate Call', errorMsg);
    }
  };

  const handleStopCall = () => {
    if (activeCallRef.current) {
      activeCallRef.current.disconnect();
      activeCallRef.current = null;
    }
    setCallState('completed');
    setIsMuted(false);
    showSuccess('Call Ended', 'The call has been ended successfully.');
  };

  const handleToggleMute = () => {
    if (activeCallRef.current) {
      const newMuteState = !isMuted;
      activeCallRef.current.mute(newMuteState);
      setIsMuted(newMuteState);
    }
  };

  const handleClose = () => {
    // Only allow closing if call is not active
    if (callState === 'idle' || callState === 'ready' || callState === 'completed' || 
        callState === 'failed' || callState === 'busy' || callState === 'no-answer' ||
        callState === 'initializing') {
      // Stop any playing sounds
      callSounds.stop();
      // Only destroy our own device (not external device used for incoming calls)
      if (!externalDeviceRef && deviceRef.current) {
        deviceRef.current.destroy();
        deviceRef.current = null;
      }
      // Reset state
      setDeviceReady(false);
      setCallState('idle');
      setCallDuration(0);
      setErrorMessage(null);
      onClose();
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCallStateText = (): string => {
    switch (callState) {
      case 'idle':
        return 'Initializing...';
      case 'initializing':
        return 'Setting up voice...';
      case 'ready':
        return 'Ready to call';
      case 'connecting':
        return 'Connecting...';
      case 'ringing':
        return 'Ringing...';
      case 'in-progress':
        return 'Call in progress';
      case 'completed':
        return 'Call ended';
      case 'failed':
        return 'Call failed';
      case 'busy':
        return 'Line busy';
      case 'no-answer':
        return 'No answer';
      default:
        return 'Ready to call';
    }
  };

  const canStartCall = effectiveDeviceReady && (callState === 'ready' || callState === 'completed' || callState === 'failed' || callState === 'busy' || callState === 'no-answer');
  const isCallActive = callState === 'connecting' || callState === 'ringing' || callState === 'in-progress';
  const isAcceptedIncoming = !!acceptedCall;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75"
          onClick={handleClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                {isAcceptedIncoming ? 'Incoming Call' : isCallActive ? 'Call in Progress' : 'Make a Call'}
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`p-1.5 rounded-md transition-colors ${
                    soundEnabled 
                      ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' 
                      : 'text-gray-400 hover:text-gray-500 dark:hover:text-gray-300'
                  }`}
                  title={soundEnabled ? 'Mute ring sound' : 'Unmute ring sound'}
                >
                  <Icon name={soundEnabled ? "volume-2" : "volume-x"} className="w-5 h-5" />
                </button>
                <button
                  onClick={handleClose}
                  disabled={isCallActive}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none disabled:opacity-50"
                >
                  <Icon name="x" className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-center mb-6">
                <div className="relative">
                  {/* Outer solid line circles - voice amplitude animation (only when in-progress) */}
                  {callState === 'in-progress' && (
                    <>
                      <div 
                        className="absolute rounded-full border-2 border-green-400 dark:border-green-500 transition-all duration-75"
                        style={{ 
                          inset: `-${8 + audioLevel * 20}px`,
                          opacity: 0.3 + audioLevel * 0.5,
                        }}
                      />
                      <div 
                        className="absolute rounded-full border-2 border-green-400/70 dark:border-green-500/70 transition-all duration-75"
                        style={{ 
                          inset: `-${16 + audioLevel * 30}px`,
                          opacity: 0.2 + audioLevel * 0.4,
                        }}
                      />
                      <div 
                        className="absolute rounded-full border border-green-400/50 dark:border-green-500/50 transition-all duration-75"
                        style={{ 
                          inset: `-${24 + audioLevel * 40}px`,
                          opacity: 0.1 + audioLevel * 0.3,
                        }}
                      />
                    </>
                  )}
                  
                  {/* Inner dotted line circles - only when in-progress */}
                  {callState === 'in-progress' && (
                    <>
                      <div 
                        className="absolute rounded-full border-2 border-dashed border-green-300 dark:border-green-600 transition-all duration-75"
                        style={{ 
                          inset: `-${4 + audioLevel * 8}px`,
                          opacity: 0.5 + audioLevel * 0.5,
                        }}
                      />
                      <div 
                        className="absolute rounded-full border border-dashed border-green-200 dark:border-green-700 transition-all duration-100"
                        style={{ 
                          inset: `-${8 + audioLevel * 12}px`,
                          opacity: 0.3 + audioLevel * 0.4,
                        }}
                      />
                    </>
                  )}
                  
                  {/* Main phone icon container */}
                  <div className={`relative w-20 h-20 rounded-full flex items-center justify-center ${
                    callState === 'in-progress' 
                      ? 'bg-green-100 dark:bg-green-900/30' 
                      : callState === 'ringing' || callState === 'connecting'
                      ? 'bg-blue-100 dark:bg-blue-900/30'
                      : callState === 'completed'
                      ? 'bg-gray-100 dark:bg-gray-700'
                      : callState === 'initializing'
                      ? 'bg-yellow-100 dark:bg-yellow-900/30'
                      : 'bg-blue-100 dark:bg-blue-900/30'
                  }`}>
                    {callState === 'initializing' ? (
                      <Icon name="loader-2" className="w-10 h-10 text-yellow-600 dark:text-yellow-400 animate-spin" />
                    ) : (
                      <Icon 
                        name="phone" 
                        className={`w-10 h-10 ${
                          callState === 'in-progress'
                            ? 'text-green-600 dark:text-green-400'
                            : callState === 'ringing' || callState === 'connecting'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-blue-600 dark:text-blue-400'
                        }`} 
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="text-center mb-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {getCallStateText()}
                </p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {contactName}
                </p>
                {(callState === 'in-progress' || callState === 'completed') && callDuration > 0 && (
                  <p className="text-lg font-mono text-gray-700 dark:text-gray-300 mb-2">
                    {formatDuration(callDuration)}
                  </p>
                )}
                {errorMessage && (
                  <p className="text-xs text-red-500 dark:text-red-400 mb-2">
                    {errorMessage}
                  </p>
                )}
                
                {(callState === 'ready' || callState === 'idle' || callState === 'initializing') && !isCallActive && (
                  <>
                    {hasMultipleNumbers ? (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                          Select phone number to call:
                        </p>
                        <div className="space-y-2">
                          {mobile && (
                            <button
                              onClick={() => setSelectedPhoneNumber(mobile)}
                              disabled={!canStartCall}
                              className={`w-full p-3 rounded-lg border-2 transition-all ${
                                selectedPhoneNumber === mobile
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                  : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <Icon name="phone" className="w-4 h-4" />
                                  <span className="font-medium">Mobile</span>
                                </div>
                                <span className="text-sm">{mobile}</span>
                              </div>
                            </button>
                          )}
                          {phone && (
                            <button
                              onClick={() => setSelectedPhoneNumber(phone)}
                              disabled={!canStartCall}
                              className={`w-full p-3 rounded-lg border-2 transition-all ${
                                selectedPhoneNumber === phone
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                  : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <Icon name="phone" className="w-4 h-4" />
                                  <span className="font-medium">Phone</span>
                                </div>
                                <span className="text-sm">{phone}</span>
                              </div>
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                        <Icon name="phone" className="w-4 h-4" />
                        <span>{selectedPhoneNumber || 'No phone number available'}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {!selectedPhoneNumber && (
                <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    This contact does not have a phone number. Please add one before making a call.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6">
            {!isCallActive && callState !== 'completed' && callState !== 'failed' && callState !== 'busy' ? (
              <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={callState === 'initializing'}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCall}
                  disabled={!canStartCall || !selectedPhoneNumber}
                  className="w-full sm:w-auto"
                >
                  {callState === 'initializing' ? (
                    <>
                      <Icon name="loader-2" className="w-4 h-4 mr-2 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      <Icon name="phone" className="w-4 h-4 mr-2" />
                      Call Now
                    </>
                  )}
                </Button>
              </div>
            ) : isCallActive ? (
              <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
                <Button
                  onClick={handleToggleMute}
                  variant="outline"
                  className={`w-full sm:w-auto ${
                    isMuted
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  <Icon name={isMuted ? "mic-off" : "mic"} className="w-4 h-4 mr-2" />
                  {isMuted ? 'Unmute' : 'Mute'}
                </Button>
                <Button
                  onClick={handleStopCall}
                  variant="outline"
                  className="w-full sm:w-auto bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30"
                >
                  <Icon name="phone-off" className="w-4 h-4 mr-2" />
                  End Call
                </Button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
                <Button
                  onClick={() => {
                    setCallState(deviceReady ? 'ready' : 'idle');
                    setCallDuration(0);
                    setErrorMessage(null);
                  }}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  <Icon name="phone" className="w-4 h-4 mr-2" />
                  Call Again
                </Button>
                <Button
                  onClick={handleClose}
                  className="w-full sm:w-auto"
                >
                  Close
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
