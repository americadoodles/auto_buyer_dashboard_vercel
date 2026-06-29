'use client';

import React, { useState, useEffect } from 'react';
import { ChevronRight, X } from 'lucide-react';
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
        className="bg-claude-surface dark:bg-[#1a1d29] rounded-lg shadow-sm border border-claude-border dark:border-coal-700/50 px-6 py-2 cursor-pointer hover:bg-claude-cream dark:hover:bg-coal-850/50 transition-colors"
        onClick={() => setIsPanelOpen(true)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="carfax" size={24} className="opacity-80" />
            <span className="text-lg font-bold text-black dark:text-coal-100">CARFAX</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${isClean ? 'text-green-600 dark:text-green-400' : 'text-black dark:text-coal-400'}`}>
              {status}
            </span>
            <ChevronRight className="w-5 h-5 text-claude-subtle" />
          </div>
        </div>
      </div>

      {/* Slide-in Panel */}
      {isPanelOpen && (
        <>
          <div className={`fixed inset-0 bg-black/50 z-40 ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`} onClick={handleClose} />
          <div className={`fixed top-0 right-0 h-full w-[30%] min-w-[320px] bg-claude-surface dark:bg-[#1a1d29] shadow-xl z-50 overflow-y-auto ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}>
            <div className="sticky top-0 bg-claude-surface dark:bg-[#1a1d29] border-b border-claude-border dark:border-coal-700/50 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="carfax" size={24} className="opacity-80" />
                <span className="text-lg font-bold text-black dark:text-coal-100">CARFAX</span>
              </div>
              <button onClick={handleClose} className="text-claude-subtle hover:text-claude-muted dark:hover:text-coal-100">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-black dark:text-coal-300">Status</span>
                <span className={`text-sm font-medium ${isClean ? 'text-green-600 dark:text-green-400' : 'text-black dark:text-coal-400'}`}>
                  {status}
                </span>
              </div>
              {previousOwners !== undefined && (
                <div>
                  <div className="text-3xl font-bold text-black dark:text-coal-100 mb-1">{previousOwners}</div>
                  <div className="text-sm text-claude-subtle dark:text-coal-400">Previous Owners</div>
                </div>
              )}
              {images && images.length > 0 && (
                <div>
                  <div className="text-sm font-semibold text-black dark:text-coal-400 mb-2">Images</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {images.slice(0, 6).map((image, index) => (
                      <img
                        key={index}
                        src={image}
                        alt={`Vehicle view ${index + 1}`}
                        className="w-20 h-14 object-cover rounded border border-claude-border dark:border-coal-700"
                      />
                    ))}
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
