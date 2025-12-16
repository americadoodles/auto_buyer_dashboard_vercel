'use client';

import React from 'react';
import { LayoutGrid, Table2 } from 'lucide-react';
import { Button } from '../atoms/Button';

export type ViewMode = 'table' | 'cards';

interface ViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  className?: string;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({
  viewMode,
  onViewModeChange,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 ${className}`}>
      <button
        onClick={() => onViewModeChange('table')}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          viewMode === 'table'
            ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
        }`}
        title="Table view"
      >
        <Table2 className="h-4 w-4" />
        <span className="hidden sm:inline">Table</span>
      </button>
      <button
        onClick={() => onViewModeChange('cards')}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          viewMode === 'cards'
            ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
        }`}
        title="Card view"
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="hidden sm:inline">Cards</span>
      </button>
    </div>
  );
};

