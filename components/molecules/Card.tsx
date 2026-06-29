import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-claude-surface dark:bg-coal-800 rounded-lg shadow-sm border border-claude-border dark:border-coal-700 ${className}`}>
      {children}
    </div>
  );
};
