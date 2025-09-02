import React from 'react';
import { Loader2 } from 'lucide-react';

export interface FormButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

const variantClasses = {
  primary: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white',
  secondary: 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500 text-white',
  danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white'
};

const sizeClasses = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-3 text-base',
  lg: 'px-6 py-4 text-lg'
};

export const FormButton: React.FC<FormButtonProps> = ({ 
  loading, 
  children, 
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  ...props 
}) => (
  <button 
    {...props} 
    disabled={loading || disabled}
    className={`
      inline-flex items-center justify-center font-medium rounded-lg
      focus:outline-none focus:ring-2 focus:ring-offset-2
      transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
      ${variantClasses[variant]}
      ${sizeClasses[size]}
      ${className}
    `.trim()}
  >
    {loading ? (
      <>
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Loading...
      </>
    ) : (
      children
    )}
  </button>
);
