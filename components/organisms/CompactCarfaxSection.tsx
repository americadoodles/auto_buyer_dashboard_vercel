'use client';

import React from 'react';
import { CheckCircle } from 'lucide-react';
import { Icon } from '../atoms/Icon';

interface CompactCarfaxSectionProps {
  status?: string;
  previousOwners?: number;
  images?: string[];
}

export const CompactCarfaxSection: React.FC<CompactCarfaxSectionProps> = ({
  status = 'Unknown',
  previousOwners = 1,
  images = [],
}) => {
  const isClean = status.toLowerCase() === 'clean';

  return (
    <div className="flex flex-col gap-6 rounded-xl border bg-white dark:bg-[#1a1d29] border-gray-200 dark:border-gray-700/50 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon
            name="carfax"
            size={24}
            className="opacity-80 hover:opacity-100 transition-opacity rounded"
          />
          <span className="text-black dark:text-white font-semibold">CARFAX</span>
        </div>
        <span className={`text-sm ${isClean ? 'text-green-600 dark:text-green-400' : 'text-black dark:text-gray-400'}`}>
          {status}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* <div>
          <div className="text-4xl font-bold text-white mb-1">{previousOwners}</div>
          <div className="text-sm text-gray-400">Previous Owner</div>
        </div>
        {images.length > 0 && (
          <div className="flex items-center gap-2">
            {images.slice(0, 3).map((image, index) => (
              <img
                key={index}
                src={image}
                alt={`Vehicle view ${index + 1}`}
                className="w-16 h-12 object-cover rounded"
              />
            ))}
          </div>
        )} */}
      </div>
    </div>
  );
};
