import React, { useState } from 'react';
import { Input } from '../atoms/Input';
import { FormButton } from '../atoms/FormButton';


export interface AuthFieldsProps {
  onSubmit: (email: string, password: string, confirmPassword?: string) => Promise<void>;
  loading?: boolean;
  submitLabel: string;
  showConfirmPassword?: boolean;
}


export const AuthFields: React.FC<AuthFieldsProps> = ({ onSubmit, loading, submitLabel, showConfirmPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (showConfirmPassword) {
      await onSubmit(email, password, confirmPassword);
    } else {
      await onSubmit(email, password);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
      <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
      {showConfirmPassword && (
        <Input label="Confirm Password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
      )}
      <FormButton type="submit" loading={loading}>{submitLabel}</FormButton>
    </form>
  );
};
