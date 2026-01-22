'use client';

import React, { useState } from 'react';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { initiateCall } from '../../lib/services/listingManagementApi';
import { useToast } from '../../hooks/useToast';

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactId: string;
  contactName: string;
  phoneNumber?: string;
  onCallInitiated?: () => void;
}

export const CallModal: React.FC<CallModalProps> = ({
  isOpen,
  onClose,
  contactId,
  contactName,
  phoneNumber,
  onCallInitiated
}) => {
  const [calling, setCalling] = useState(false);
  const { showSuccess, showError } = useToast();

  if (!isOpen) return null;

  const handleCall = async () => {
    if (!phoneNumber) {
      showError('Phone Number Required', 'This contact does not have a phone number. Please add one first.');
      return;
    }

    setCalling(true);
    try {
      const result = await initiateCall(contactId, {
        phone_number: phoneNumber
      });
      
      if (result.success) {
        showSuccess('Call Initiated', `Calling ${contactName}...`);
        onClose();
        if (onCallInitiated) {
          onCallInitiated();
        }
      } else {
        showError('Failed to Initiate Call', result.error || 'An error occurred while initiating the call.');
      }
    } catch (error) {
      console.error('Error initiating call:', error);
      showError('Failed to Initiate Call', error instanceof Error ? error.message : 'An unexpected error occurred.');
    } finally {
      setCalling(false);
    }
  };

  const handleClose = () => {
    if (!calling) {
      onClose();
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
                Make a Call
              </h3>
              <button
                onClick={handleClose}
                disabled={calling}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none disabled:opacity-50"
              >
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Icon name="phone" className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                </div>
              </div>

              <div className="text-center mb-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Call
                </p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {contactName}
                </p>
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                  <Icon name="phone" className="w-4 h-4" />
                  <span>{phoneNumber || 'No phone number available'}</span>
                </div>
              </div>

              {!phoneNumber && (
                <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    This contact does not have a phone number. Please add one before making a call.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <Button
              onClick={handleCall}
              disabled={calling || !phoneNumber}
              className="w-full sm:w-auto sm:ml-3"
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
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={calling}
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
