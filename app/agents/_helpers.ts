import type { AgentDomain, AgentStatus } from './_data';

export const pct = (a: number, b: number) => Math.min(100, Math.round((a / b) * 100));

export const barColor = (p: number) =>
  p > 80 ? 'var(--c-danger)' : p > 60 ? 'var(--c-warning)' : 'var(--c-info)';

export const costColor = (p: number) =>
  p > 80 ? 'var(--c-danger)' : p > 60 ? 'var(--c-warning)' : 'var(--c-success)';

export const srTone = (v: number): 'good' | 'warn' | 'bad' =>
  v >= 95 ? 'good' : v >= 90 ? 'warn' : 'bad';

export const lqiTone = (v: number): 'high' | 'mid' | 'low' =>
  v >= 90 ? 'high' : v >= 80 ? 'mid' : 'low';

export const domainChipClass = (d: AgentDomain) =>
  d === 'CRM' ? 'chip chip-crm' : d === 'Marketplace' ? 'chip chip-marketplace' : 'chip chip-admin';

export const statusLabel: Record<AgentStatus, string> = {
  RUNNING: 'Running',
  THINKING: 'Thinking…',
  IDLE: 'Idle',
  ERROR: 'Error',
  PAUSED: 'Paused',
};

export const statusTextClass: Record<AgentStatus, string> = {
  RUNNING: 'text-claude-success dark:text-coal-200',
  THINKING: 'text-claude-info dark:text-coal-200',
  IDLE: 'text-claude-subtle dark:text-coal-400',
  ERROR: 'text-claude-danger',
  PAUSED: 'text-claude-warning',
};
