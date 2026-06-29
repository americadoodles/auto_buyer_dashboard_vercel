import React from 'react';

interface MeterBarProps {
  label: string;
  valueText: string;
  pct: number;
  color: string;
}

export const MeterBar: React.FC<MeterBarProps> = ({ label, valueText, pct, color }) => (
  <div className="mb-2">
    <div className="flex justify-between mb-1">
      <span className="text-[11px] text-claude-subtle dark:text-coal-400">{label}</span>
      <span className="text-[11px]" style={{ color }}>{valueText}</span>
    </div>
    <div className="h-[3px] bg-claude-sand dark:bg-coal-700 rounded-sm overflow-hidden">
      <div
        className="h-full rounded-sm transition-[width] duration-500"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  </div>
);
