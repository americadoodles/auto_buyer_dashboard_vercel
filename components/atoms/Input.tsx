import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input: React.FC<InputProps> = ({ label, className = '', ...props }) => (
  <div className="mb-2 w-full">
    {label && <label className="block mb-1 font-medium text-claude-ink dark:text-coal-100">{label}</label>}
    <input 
      {...props} 
      className={`w-full py-2 px-3 border border-claude-divider dark:border-coal-600 rounded bg-claude-surface dark:bg-coal-700 text-claude-ink dark:text-coal-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 ${className}`} 
    />
  </div>
);
