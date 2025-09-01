import React from 'react';

export interface FormButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  children: React.ReactNode;
}

export const FormButton: React.FC<FormButtonProps> = ({ loading, children, ...props }) => (
  <button {...props} className="w-full bg-blue-600 text-white p-2 rounded" disabled={loading || props.disabled}>
    {loading ? 'Loading...' : children}
  </button>
);
