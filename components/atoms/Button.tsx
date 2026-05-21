import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'success' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = 'secondary', 
  size = 'md', 
  children, 
  className = '', 
  ...props 
}) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-xl font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';
  
  const variantClasses = {
    primary: 'bg-slate-900 dark:bg-coal-700 text-coal-100 hover:bg-slate-700 hover:text-yellow-200 dark:hover:bg-coal-600 focus-visible:ring-slate-500 dark:focus-visible:ring-gray-500',
    secondary: 'bg-slate-300 dark:bg-coal-700 text-slate-900 dark:text-coal-100 hover:bg-slate-400 hover:text-slate-950 dark:hover:bg-coal-600 focus-visible:ring-slate-500 dark:focus-visible:ring-gray-500',
    outline: 'border border-slate-300 dark:border-coal-600 bg-claude-surface dark:bg-coal-850 text-slate-700 dark:text-coal-200 hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-coal-700 focus-visible:ring-slate-500 dark:focus-visible:ring-gray-500',
    success: 'bg-green-600 dark:bg-green-700 text-coal-100 hover:bg-green-500 hover:text-yellow-100 dark:hover:bg-green-600 focus-visible:ring-green-500 dark:focus-visible:ring-green-400',
    ghost: 'bg-transparent text-slate-700 dark:text-coal-300 hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-coal-700 focus-visible:ring-slate-500 dark:focus-visible:ring-gray-500'
  };
  
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };
  
  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
  
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
};
