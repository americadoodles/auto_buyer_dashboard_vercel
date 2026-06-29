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
    <div className={`flex items-center gap-2 bg-claude-sand dark:bg-coal-700 rounded-lg p-1 ${className}`}>
      <button
        onClick={() => onViewModeChange('table')}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          viewMode === 'table'
            ? 'bg-claude-surface dark:bg-coal-600 text-claude-ink dark:text-coal-100 shadow-sm'
            : 'text-claude-muted dark:text-coal-400 hover:text-claude-ink dark:hover:text-coal-100'
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
            ? 'bg-claude-surface dark:bg-coal-600 text-claude-ink dark:text-coal-100 shadow-sm'
            : 'text-claude-muted dark:text-coal-400 hover:text-claude-ink dark:hover:text-coal-100'
        }`}
        title="Card view"
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="hidden sm:inline">Cards</span>
      </button>
    </div>
  );
};

