import React from 'react';

interface KpiCardProps {
  label: string;
  value: string;
  className?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({ label, value, className = '' }) => {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 ${className}`}>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
};
