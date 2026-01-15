'use client';

import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';

interface ChatBoxComponentProps {
  onClick?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ChatBoxComponent: React.FC<ChatBoxComponentProps> = ({
  onClick,
  className = '',
  size = 'md',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-14 h-14',
    lg: 'w-16 h-16',
  };

  const iconSizes = {
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-7 w-7',
  };

  const handleClick = () => {
    setIsExpanded(!isExpanded);
    if (onClick) {
      onClick();
    }
  };

  return (
    <div className="fixed bottom-[15px] right-[15px] z-50">
      <button
        type="button"
        onClick={handleClick}
        className={`chat-docked-icon ${isExpanded ? 'expanded' : 'minimized'} flex items-center justify-center ${sizeClasses[size]} rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer ${className}`}
        aria-label={isExpanded ? 'Close chat' : 'Open chat'}
      >
        {isExpanded ? (
          <X className={iconSizes[size]} />
        ) : (
          <MessageCircle className={iconSizes[size]} />
        )}
      </button>
    </div>
  );
};
