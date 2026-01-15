'use client';

import React from 'react';
import { Badge } from '../atoms/Badge';
import { CheckCircle } from 'lucide-react';
import { Icon } from '../atoms/Icon';

interface CompactAutocheckSectionProps {
  status?: string;
}

export const CompactAutocheckSection: React.FC<CompactAutocheckSectionProps> = ({
  status = 'Unknown',
}) => {
  const isClean = status.toLowerCase() === 'clean';

  return (
    <div className="flex flex-col gap-6 rounded-xl border bg-white dark:bg-[#1a1d29] border-gray-200 dark:border-gray-700/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon
            name="autocheck"
            size={24}
            className="opacity-80 hover:opacity-100 transition-opacity rounded"
          />
          <span className="text-blue-600 dark:text-blue-400 font-semibold">AutoCheck</span>
        </div>
        <Badge className={`${
          isClean 
            ? 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30' 
            : 'bg-gray-500/20 text-black dark:text-gray-400 border-gray-500/30'
        }`}>
          {status}
        </Badge>
      </div>
      {isClean && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm text-black dark:text-gray-300">No accidents</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm text-black dark:text-gray-300">No damage reported</span>
          </div>
        </div>
      )}
    </div>
  );
};
