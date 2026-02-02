'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '../atoms/Badge';
import { CheckCircle, ChevronRight, X } from 'lucide-react';
import { Icon } from '../atoms/Icon';

interface CompactAutocheckSectionProps {
  status?: string;
}

export const CompactAutocheckSection: React.FC<CompactAutocheckSectionProps> = ({
  status = 'Unknown',
}) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const isClean = status.toLowerCase() === 'clean';

  const PANEL_ANIMATION_MS = 300;
  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsPanelOpen(false);
      setIsClosing(false);
    }, PANEL_ANIMATION_MS);
  };

  useEffect(() => {
    if (!isPanelOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isPanelOpen]);

  return (
    <>
      {/* Clickable Title Card */}
      <div
        className="bg-white dark:bg-[#1a1d29] rounded-lg shadow-sm border border-gray-200 dark:border-gray-700/50 px-6 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        onClick={() => setIsPanelOpen(true)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="autocheck" size={24} className="opacity-80" />
            <span className="text-lg font-bold text-black dark:text-white">AutoCheck</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`${
              isClean
                ? 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30'
                : 'bg-gray-500/20 text-black dark:text-gray-400 border-gray-500/30'
            }`}>
              {status}
            </Badge>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Slide-in Panel */}
      {isPanelOpen && (
        <>
          <div className={`fixed inset-0 bg-black/50 z-40 ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`} onClick={handleClose} />
          <div className={`fixed top-0 right-0 h-full w-[30%] min-w-[320px] bg-white dark:bg-[#1a1d29] shadow-xl z-50 overflow-y-auto ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}>
            <div className="sticky top-0 bg-white dark:bg-[#1a1d29] border-b border-gray-200 dark:border-gray-700/50 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="autocheck" size={24} className="opacity-80" />
                <span className="text-lg font-bold text-black dark:text-white">AutoCheck</span>
              </div>
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="px-6 py-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-black dark:text-gray-300">Status</span>
                <Badge className={`${
                  isClean
                    ? 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30'
                    : 'bg-gray-500/20 text-black dark:text-gray-400 border-gray-500/30'
                }`}>
                  {status}
                </Badge>
              </div>
              {isClean && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm text-black dark:text-gray-300">No accidents</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm text-black dark:text-gray-300">No damage reported</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
      <style jsx global>{`
        @keyframes slide-in-right { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes slide-out-right { from { transform: translateX(0); } to { transform: translateX(100%); } }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fade-out { from { opacity: 1; } to { opacity: 0; } }
        .animate-slide-in-right { animation: slide-in-right 0.3s ease-out forwards; }
        .animate-slide-out-right { animation: slide-out-right 0.3s ease-in forwards; }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
        .animate-fade-out { animation: fade-out 0.3s ease-in forwards; }
      `}</style>
    </>
  );
};
