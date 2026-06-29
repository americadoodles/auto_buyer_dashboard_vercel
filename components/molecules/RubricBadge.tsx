'use client';

import React from 'react';

/**
 * Renders the buy/no-buy rubric result (verdict + signed points) from the
 * lead-scoring agent. Distinct from the AI `score` badge. Renders nothing when
 * the rubric hasn't run for this listing (verdict null).
 */
interface RubricBadgeProps {
  verdict?: string | null;
  points?: number | null;
  size?: 'sm' | 'md';
  className?: string;
}

const VERDICT_META: Record<string, { label: string; classes: string }> = {
  buyable: {
    label: 'Buyable',
    classes: 'bg-green-600 dark:bg-green-700 text-coal-100 border-green-700 dark:border-green-500',
  },
  marginal: {
    label: 'Marginal',
    classes: 'bg-amber-500 dark:bg-amber-600 text-coal-100 border-amber-600 dark:border-amber-400',
  },
  not_buyable: {
    label: 'Not Buyable',
    classes: 'bg-slate-500 dark:bg-slate-600 text-coal-100 border-slate-600 dark:border-slate-400',
  },
  deal_killer: {
    label: 'Deal Killer',
    classes: 'bg-red-600 dark:bg-red-700 text-coal-100 border-red-700 dark:border-red-500',
  },
};

export const RubricBadge: React.FC<RubricBadgeProps> = ({
  verdict,
  points,
  size = 'sm',
  className = '',
}) => {
  if (!verdict) return null;

  const meta = VERDICT_META[verdict] ?? {
    label: verdict.replace(/_/g, ' '),
    classes: 'bg-slate-500 text-coal-100 border-slate-600',
  };
  const pts =
    typeof points === 'number' ? `${points >= 0 ? '+' : ''}${points}` : null;
  const sizeClasses = size === 'md' ? 'text-sm px-2.5 py-1' : 'text-xs px-2 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md font-semibold border shadow-sm flex-shrink-0 ${meta.classes} ${sizeClasses} ${className}`}
      title={`Buy/no-buy rubric: ${meta.label}${pts ? ` (${pts} pts)` : ''}`}
    >
      <span>{meta.label}</span>
      {pts && <span className="font-mono opacity-90">{pts}</span>}
    </span>
  );
};
