'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { initiateCall, getCallStatus, stopCall } from '../../lib/services/listingManagementApi';
import { useToast } from '../../hooks/useToast';

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactId: string;
  contactName: string;
  phone?: string;
  mobile?: string;
  onCallInitiated?: () => void;
}

type CallState = 'idle' | 'initiating' | 'ringing' | 'in-progress' | 'completed' | 'failed' | 'busy' | 'no-answer';

export const CallModal: React.FC<CallModalProps> = ({
  isOpen,
  onClose,
  contactId,
  contactName,
  phone,
  mobile,
  onCallInitiated
}) => {
  const [calling, setCalling] = useState(false);
  const [callState, setCallState] = useState<CallState>('idle');
  const [callSid, setCallSid] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [callStatus, setCallStatus] = useState<string>('');
  const [isMuted, setIsMuted] = useState(false);
  const [callStartTime, setCallStartTime] = useState<number | null>(null);
  const { showSuccess, showError } = useToast();
  const statusIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCallAnsweredRef = useRef<boolean>(false);
  
  // Determine available phone numbers
  const hasPhone = !!phone;
  const hasMobile = !!mobile;
  const hasMultipleNumbers = hasPhone && hasMobile;
  
  // Default to mobile if available, otherwise phone
  const defaultNumber = mobile || phone;
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState<string>(defaultNumber || '');

  // Update selected number when modal opens or props change
  useEffect(() => {
    if (isOpen) {
      setSelectedPhoneNumber(mobile || phone || '');
      // Reset call state when modal opens (only if not in an active call)
      if (callState === 'idle' || callState === 'completed' || callState === 'failed' || callState === 'busy') {
        setCallSid(null);
        setCallDuration(0);
        setCallStatus('');
        setCallStartTime(null);
        setIsMuted(false);
        isCallAnsweredRef.current = false;
      }
    }
  }, [isOpen, mobile, phone]);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Poll for call status updates - continue polling as long as we have a callSid
  useEffect(() => {
    if (!callSid) {
      // Clear interval if no callSid
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
        statusIntervalRef.current = null;
      }
      return;
    }

    // Only start polling if we don't already have an interval running
    // This prevents restarting the interval when callState changes
    if (statusIntervalRef.current) {
      return; // Already polling, don't restart
    }

    const currentCallSid = callSid; // Capture callSid in closure
    statusIntervalRef.current = setInterval(async () => {
      try {
        const status = await getCallStatus(currentCallSid);
        if (status.success) {
          setCallStatus(status.status || '');
          const twilioStatus = (status.status || '').toLowerCase();
          
          // Map Twilio status to our call state
          if (twilioStatus === 'queued' || twilioStatus === 'initiated') {
            setCallState('initiating');
          } else if (twilioStatus === 'ringing') {
            setCallState('ringing');
          } else if (twilioStatus === 'in-progress') {
            // Call was answered - clear timeout and mark as answered
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
            isCallAnsweredRef.current = true;
            
            // Update state to in-progress (only if not already)
            setCallState(prevState => {
              if (prevState !== 'in-progress') {
                return 'in-progress';
              }
              return prevState;
            });
            
            // Update duration from Twilio if available
            if (status.duration) {
              setCallDuration(prev => Math.max(prev, status.duration || 0));
            }
          } else if (twilioStatus === 'completed') {
            setCallState('completed');
            if (status.duration) {
              setCallDuration(status.duration);
            }
            // Clean up all intervals and timeouts
            if (statusIntervalRef.current) {
              clearInterval(statusIntervalRef.current);
              statusIntervalRef.current = null;
            }
            if (durationIntervalRef.current) {
              clearInterval(durationIntervalRef.current);
              durationIntervalRef.current = null;
            }
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
          } else if (twilioStatus === 'busy') {
            setCallState('busy');
            if (statusIntervalRef.current) {
              clearInterval(statusIntervalRef.current);
              statusIntervalRef.current = null;
            }
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
          } else if (twilioStatus === 'no-answer' || twilioStatus === 'failed' || twilioStatus === 'canceled') {
            setCallState('failed');
            if (statusIntervalRef.current) {
              clearInterval(statusIntervalRef.current);
              statusIntervalRef.current = null;
            }
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
          }
        }
      } catch (error) {
        console.error('Error fetching call status:', error);
      }
    }, 2000); // Poll every 2 seconds

    return () => {
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
        statusIntervalRef.current = null;
      }
    };
  }, [callSid]); // Only depend on callSid, not callState

  // Update duration when call is in progress
  useEffect(() => {
    if (callState === 'in-progress') {
      // Only start duration tracking if not already running
      if (!durationIntervalRef.current) {
        // Reset duration to 0 when call first goes to in-progress
        setCallDuration(0);
        
        durationIntervalRef.current = setInterval(() => {
          setCallDuration(prev => prev + 1);
        }, 1000);
      }
    } else {
      // Clear duration interval when call is not in progress
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

  if (!isOpen) return null;

  const handleCall = async () => {
    if (!selectedPhoneNumber) {
      showError('Phone Number Required', 'This contact does not have a phone number. Please add one first.');
      return;
    }

    setCalling(true);
    setCallState('initiating');
    setCallStartTime(Date.now());
    
    try {
      const result = await initiateCall(contactId, {
        phone_number: selectedPhoneNumber
      });
      
      if (result.success && result.call_sid) {
        setCallSid(result.call_sid);
        setCallState('ringing');
        showSuccess('Call Initiated', `Calling ${contactName}...`);
        if (onCallInitiated) {
          onCallInitiated();
        }

        // Set timeout to automatically end call if not answered within 20 seconds
        const callSidForTimeout = result.call_sid;
        if (callSidForTimeout) {
          // Reset answered flag for new call
          isCallAnsweredRef.current = false;
          
          timeoutRef.current = setTimeout(async () => {
            // Check if call has been answered - if so, don't end it
            if (isCallAnsweredRef.current) {
              return;
            }
            
            // Check current call state - use a closure to capture the callSid
            const currentCallSid = callSidForTimeout;
            try {
              const status = await getCallStatus(currentCallSid);
              if (!status.success) {
                return;
              }
              
              const twilioStatus = (status.status || '').toLowerCase();
              
              // Only auto-end if still not answered (ringing, initiated, or queued)
              // Double-check that it's not in-progress
              if (twilioStatus === 'ringing' || twilioStatus === 'initiated' || twilioStatus === 'queued') {
                // End the call only if it hasn't been answered
                try {
                  await stopCall(currentCallSid);
                  setCallState('completed');
                  setIsMuted(false);
                  showError('Call Timeout', 'No answer after 20 seconds. Call ended automatically.');
                  if (statusIntervalRef.current) {
                    clearInterval(statusIntervalRef.current);
                  }
                  if (durationIntervalRef.current) {
                    clearInterval(durationIntervalRef.current);
                  }
                } catch (stopError) {
                  console.error('Error stopping call on timeout:', stopError);
                }
              } else if (twilioStatus === 'in-progress') {
                // Call was answered, mark it and clear the timeout
                isCallAnsweredRef.current = true;
                if (timeoutRef.current) {
                  clearTimeout(timeoutRef.current);
                  timeoutRef.current = null;
                }
              }
            } catch (error) {
              console.error('Error checking call status for timeout:', error);
            }
          }, 20000); // 20 seconds timeout
        }
      } else {
        setCallState('failed');
        showError('Failed to Initiate Call', result.error || 'An error occurred while initiating the call.');
      }
    } catch (error) {
      console.error('Error initiating call:', error);
      setCallState('failed');
      showError('Failed to Initiate Call', error instanceof Error ? error.message : 'An unexpected error occurred.');
    } finally {
      setCalling(false);
    }
  };

  const handleStopCall = async () => {
    if (!callSid) return;

    // Clear timeout if it exists
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // Mark call as ended
    isCallAnsweredRef.current = false;

    try {
      const result = await stopCall(callSid);
      if (result.success) {
        setCallState('completed');
        setIsMuted(false);
        showSuccess('Call Ended', 'The call has been ended successfully.');
        if (statusIntervalRef.current) {
          clearInterval(statusIntervalRef.current);
        }
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
        }
      } else {
        showError('Failed to End Call', result.error || 'An error occurred while ending the call.');
      }
    } catch (error) {
      console.error('Error stopping call:', error);
      showError('Failed to End Call', error instanceof Error ? error.message : 'An unexpected error occurred.');
    }
  };

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
    // TODO: Implement actual mute/unmute functionality via Twilio API if needed
    // For now, this is just UI state
  };

  const handleClose = () => {
    // Only allow closing if call is not active or is completed/failed
    if (callState === 'idle' || callState === 'completed' || callState === 'failed' || callState === 'busy') {
      // Clean up intervals
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      // Reset state
      setCallState('idle');
      setCallSid(null);
      setCallDuration(0);
      setCallStatus('');
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
      case 'initiating':
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
      default:
        return 'Ready to call';
    }
  };

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
                {callState === 'idle' ? 'Make a Call' : 'Call in Progress'}
              </h3>
              <button
                onClick={handleClose}
                disabled={callState === 'in-progress' || callState === 'ringing' || callState === 'initiating'}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none disabled:opacity-50"
              >
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-center mb-6">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
                  callState === 'in-progress' 
                    ? 'bg-green-100 dark:bg-green-900/30 animate-pulse' 
                    : callState === 'ringing' || callState === 'initiating'
                    ? 'bg-blue-100 dark:bg-blue-900/30 animate-pulse'
                    : callState === 'completed'
                    ? 'bg-gray-100 dark:bg-gray-700'
                    : 'bg-blue-100 dark:bg-blue-900/30'
                }`}>
                  <Icon 
                    name="phone" 
                    className={`w-10 h-10 ${
                      callState === 'in-progress'
                        ? 'text-green-600 dark:text-green-400'
                        : callState === 'ringing' || callState === 'initiating'
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-blue-600 dark:text-blue-400'
                    }`} 
                  />
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
                {callStatus && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    Status: {callStatus}
                  </p>
                )}
                
                {callState === 'idle' && (
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
                              disabled={calling}
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
                              disabled={calling}
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
            {callState === 'idle' ? (
              <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={calling}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCall}
                  disabled={calling || !selectedPhoneNumber}
                  className="w-full sm:w-auto"
                >
                  {calling ? (
                    <>
                      <Icon name="loader-2" className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Icon name="phone" className="w-4 h-4 mr-2" />
                      Call Now
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
                {(callState === 'in-progress' || callState === 'ringing' || callState === 'initiating') && (
                  <>
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
                  </>
                )}
                {(callState === 'completed' || callState === 'failed' || callState === 'busy') && (
                  <Button
                    onClick={handleClose}
                    className="w-full sm:w-auto"
                  >
                    Close
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
