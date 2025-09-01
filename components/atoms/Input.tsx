import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input: React.FC<InputProps> = ({ label, ...props }) => (
  <div className="mb-2">
    {label && <label className="block mb-1 font-medium">{label}</label>}
    <input {...props} className="w-full p-2 border rounded" />
  </div>
);
