'use client';

import React, { useState } from 'react';
import { Button } from '../atoms/Button';
import { ExportModal } from './ExportModal';

interface ExportButtonProps {
  exportType: 'listings' | 'users';
  userRole: string;
  className?: string;
  variant?: 'primary' | 'outline' | 'secondary' | 'success';
  size?: 'sm' | 'md' | 'lg';
  buyerId?: string;  // For exporting specific buyer's data
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  exportType,
  userRole,
  className = '',
  variant = 'outline',
  size = 'md',
  buyerId,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = () => {
    if (exportType === 'users' && userRole !== 'admin') {
      alert('Only administrators can export user data.');
      return;
    }
    setIsModalOpen(true);
  };

  return (
    <>
      <Button
        onClick={handleClick}
        variant={variant}
        size={size}
        className={`flex items-center space-x-2 ${className}`}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <span>Export {exportType === 'listings' ? 'Listings' : 'Users'}</span>
      </Button>

      <ExportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        exportType={exportType}
        userRole={userRole}
        buyerId={buyerId}
      />
    </>
  );
};
