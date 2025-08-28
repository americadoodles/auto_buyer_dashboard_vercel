import React from 'react';
import { KpiCard } from '../molecules/KpiCard';

export const KpiGrid: React.FC = () => {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <KpiCard label="Avg Profit / Unit" value="$2,140" />
      <KpiCard label="Lead → Purchase" value="3.2 days" />
      <KpiCard label="Aged Inventory" value="4 units" />
    </div>
  );
};
