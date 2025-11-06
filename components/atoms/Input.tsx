import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input: React.FC<InputProps> = ({ label, className = '', ...props }) => (
  <div className="mb-2">
    {label && <label className="block mb-1 font-medium">{label}</label>}
    <input {...props} className={`w-full py-2 px-3 border rounded ${className}`} />
  </div>
);
