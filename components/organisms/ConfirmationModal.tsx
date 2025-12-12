'use client';

import React from 'react';
import { Button } from '../atoms/Button';
import { LucideIcon, AlertTriangle, Trash2, AlertCircle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClassName?: string;
  variant?: 'danger' | 'warning' | 'info';
  icon?: LucideIcon;
  loading?: boolean;
  loadingText?: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Yes',
  cancelText = 'No',
  confirmButtonClassName = 'bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600 text-white',
  variant = 'danger',
  icon: IconComponent,
  loading = false,
  loadingText
}) => {
  if (!isOpen) return null;

  // Default icon based on variant
  let DefaultIcon: LucideIcon = Trash2;
  let iconBgColor = 'bg-red-100 dark:bg-red-900/30';
  let iconColor = 'text-red-600 dark:text-red-400';

  if (!IconComponent) {
    switch (variant) {
      case 'warning':
        DefaultIcon = AlertTriangle;
        iconBgColor = 'bg-yellow-100 dark:bg-yellow-900/30';
        iconColor = 'text-yellow-600 dark:text-yellow-400';
        break;
      case 'info':
        DefaultIcon = AlertCircle;
        iconBgColor = 'bg-blue-100 dark:bg-blue-900/30';
        iconColor = 'text-blue-600 dark:text-blue-400';
        break;
      default:
        DefaultIcon = Trash2;
    }
  }

  const IconToRender = IconComponent || DefaultIcon;
  const displayTitle = title || (variant === 'danger' ? 'Confirm Deletion' : variant === 'warning' ? 'Confirm Action' : 'Confirm');

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black/70 flex items-center justify-center z-50" 
      onClick={() => !loading && onClose()}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className={`w-10 h-10 ${iconBgColor} rounded-full flex items-center justify-center flex-shrink-0`}>
              <IconToRender className={`w-5 h-5 ${iconColor}`} />
            </div>
            <h3 className="text-lg font-semibold text-black dark:text-white">{displayTitle}</h3>
          </div>
          <p className="text-sm text-black dark:text-gray-300 mb-6">
            {message}
          </p>
          <div className="flex justify-end space-x-3">
            <Button 
              variant="outline" 
              onClick={onClose}
              disabled={loading}
              size="sm"
            >
              {cancelText}
            </Button>
            <Button 
              onClick={onConfirm}
              disabled={loading}
              className={confirmButtonClassName}
              size="sm"
            >
              {loading ? (loadingText || 'Processing...') : confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

