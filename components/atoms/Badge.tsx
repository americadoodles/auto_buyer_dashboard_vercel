import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'destructive' | 'outline';
  color?: 'green' | 'blue' | 'purple' | 'orange' | 'gray' | 'red' | 'yellow' | string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = 'default', 
  color,
  className = '' 
}) => {
  const baseClasses = 'rounded-full px-2 py-1 text-xs font-medium';
  
  const variantClasses = {
    default: 'bg-slate-100 text-slate-900',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    destructive: 'bg-red-100 text-red-800',
    outline: 'border border-slate-300 text-slate-700 bg-white'
  };

  const colorClasses = {
    green: 'bg-green-100 text-green-800',
    blue: 'bg-blue-100 text-blue-800',
    purple: 'bg-purple-100 text-purple-800',
    orange: 'bg-orange-100 text-orange-800',
    gray: 'bg-gray-100 text-gray-800',
    red: 'bg-red-100 text-red-800',
    yellow: 'bg-yellow-100 text-yellow-800'
  };
  
  // Use color if provided, otherwise use variant
  const styleClasses = color ? (colorClasses[color as keyof typeof colorClasses] || colorClasses.gray) : variantClasses[variant];
  const classes = `${baseClasses} ${styleClasses} ${className}`;
  
  return (
    <span className={classes}>
      {children}
    </span>
  );
};
