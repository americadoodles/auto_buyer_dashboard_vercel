'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, Power, Cpu, Wrench, Hand, Gauge, FileText } from 'lucide-react';
import { AGENTS } from '../../../lib/agents/data';
import { AGENT_CONFIGS, MODEL_OPTIONS, type AgentConfig } from '../../../lib/agents/config';
import { domainChipClass } from '../_helpers';

export default function AgentBuilderPage() {
  const sortedIds = useMemo(() => Object.keys(AGENT_CONFIGS).map(Number).sort((a, b) => a - b), []);
  const [activeId, setActiveId] = useState<number>(sortedIds[0]);
  const initial = AGENT_CONFIGS[activeId];
  const [config, setConfig] = useState<AgentConfig>(initial);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  function selectAgent(id: number) {
    if (dirty && !confirm('You have unsaved changes. Discard them?')) return;
    setActiveId(id);
    setConfig(AGENT_CONFIGS[id]);
    setDirty(false);
    setSavedAt(null);
  }

  function patch<K extends keyof AgentConfig>(key: K, value: AgentConfig[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  function patchLimits<K extends keyof AgentConfig['limits']>(key: K, value: AgentConfig['limits'][K]) {
    setConfig((prev) => ({ ...prev, limits: { ...prev.limits, [key]: value } }));
    setDirty(true);
  }

  function patchHitl<K extends keyof AgentConfig['hitl']>(key: K, value: AgentConfig['hitl'][K]) {
    setConfig((prev) => ({ ...prev, hitl: { ...prev.hitl, [key]: value } }));
    setDirty(true);
  }

  function toggleTool(toolId: string, enabled: boolean) {
    setConfig((prev) => ({
      ...prev,
      tools: prev.tools.map((t) => (t.id === toolId ? { ...t, enabled } : t)),
    }));
    setDirty(true);
  }

  async function save() {
    // Persistence stub: in v1 the API echoes back; swap to PUT /api/agents/[id]/config
    // when the backend route lands. Until then we just mutate the in-memory map.
    AGENT_CONFIGS[config.id] = config;
    setSavedAt(new Date().toLocaleTimeString());
    setDirty(false);
  }

  const runtimeAgent = AGENTS.find((a) => a.id === config.id);

  return (
    <div className="px-6 py-5 max-w-[1280px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5 pb-4 border-b border-claude-border dark:border-coal-700 flex-wrap">
        <Link
          href="/agents"
          className="inline-flex items-center gap-1.5 text-[13px] text-claude-muted dark:text-coal-300 hover:text-claude-ink dark:hover:text-coal-100"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Command Center
        </Link>
        <h1 className="text-[17px] font-semibold tracking-tight text-claude-ink dark:text-coal-100 ml-2">
          Agent Builder
        </h1>
        <p className="text-[12px] text-claude-subtle dark:text-coal-400 ml-1">
          Edit prompts, tools, and human-in-the-loop thresholds for each agent.
        </p>
        <div className="ml-auto flex items-center gap-2">
          {savedAt && !dirty && (
            <span className="text-[12px] text-claude-success">Saved at {savedAt}</span>
          )}
          {dirty && (
            <span className="text-[12px] text-claude-warning">Unsaved changes</span>
          )}
          <button
            onClick={save}
            disabled={!dirty}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium text-white bg-claude-accent hover:bg-claude-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-3.5 h-3.5" /> Save changes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5">
        {/* Master list */}
        <aside className="bg-claude-surface dark:bg-coal-850 border border-claude-border dark:border-coal-700 rounded-xl p-2 h-fit">
          <div className="text-[11px] uppercase tracking-wide text-claude-subtle dark:text-coal-400 px-2 py-1.5">
            Agents
          </div>
          <ul>
            {sortedIds.map((id) => {
              const a = AGENT_CONFIGS[id];
              const isActive = id === activeId;
              return (
                <li key={id}>
                  <button
                    onClick={() => selectAgent(id)}
                    className={[
                      'w-full text-left px-2.5 py-2 rounded-lg flex items-start gap-2 transition-colors',
                      isActive
                        ? 'bg-claude-accent/10 dark:bg-claude-accent/15'
                        : 'hover:bg-claude-sand dark:hover:bg-coal-800',
                    ].join(' ')}
                  >
                    <div
                      className={[
                        'w-1.5 self-stretch rounded-full mt-0.5',
                        a.enabled ? 'bg-claude-success' : 'bg-claude-subtle/40',
                      ].join(' ')}
                    />
                    <div className="flex-1 min-w-0">
                      <div className={`text-[13px] font-medium truncate ${isActive ? 'text-claude-accent' : 'text-claude-ink dark:text-coal-100'}`}>
                        {a.name}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={domainChipClass(a.domain)}>{a.domain}</span>
                        {!a.enabled && (
                          <span className="text-[10.5px] text-claude-subtle dark:text-coal-500">Disabled</span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Detail editor */}
        <main className="space-y-5">
          {/* Identity */}
          <Section icon={<Cpu className="w-4 h-4" />} title="Identity">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Name">
                <input
                  className="claude-input"
                  value={config.name}
                  onChange={(e) => patch('name', e.target.value)}
                />
              </Field>
              <Field label="Domain">
                <select
                  className="claude-input"
                  value={config.domain}
                  onChange={(e) => patch('domain', e.target.value as AgentConfig['domain'])}
                >
                  <option value="CRM">CRM</option>
                  <option value="Marketplace">Marketplace</option>
                  <option value="Admin">Admin</option>
                </select>
              </Field>
              <Field label="Model">
                <select
                  className="claude-input"
                  value={config.model}
                  onChange={(e) => patch('model', e.target.value)}
                >
                  {MODEL_OPTIONS.map((m) => (
                    <option key={m.id} value={m.id}>{m.label} · {m.tier}</option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <button
                  type="button"
                  onClick={() => patch('enabled', !config.enabled)}
                  className={[
                    'claude-input flex items-center justify-between text-left',
                    config.enabled ? 'text-claude-success' : 'text-claude-subtle dark:text-coal-400',
                  ].join(' ')}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Power className="w-3.5 h-3.5" />
                    {config.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <span className="text-[11px] underline">toggle</span>
                </button>
              </Field>
            </div>
            {runtimeAgent && (
              <p className="text-[12px] text-claude-subtle dark:text-coal-400 mt-2">
                Runtime status: <strong className="text-claude-muted dark:text-coal-300">{runtimeAgent.s}</strong> ·
                {' '}{runtimeAgent.td} tasks today · {runtimeAgent.sr}% success
              </p>
            )}
          </Section>

          {/* Prompts */}
          <Section icon={<FileText className="w-4 h-4" />} title="Prompts">
            <Field label="System prompt" hint="Sets the agent's identity, scope, and guardrails.">
              <textarea
                rows={5}
                className="claude-input font-mono text-[12px]"
                value={config.systemPrompt}
                onChange={(e) => patch('systemPrompt', e.target.value)}
              />
            </Field>
            <Field label="User prompt template" hint="Use {{placeholders}} for runtime values.">
              <textarea
                rows={4}
                className="claude-input font-mono text-[12px]"
                value={config.userPromptTemplate}
                onChange={(e) => patch('userPromptTemplate', e.target.value)}
              />
            </Field>
          </Section>

          {/* Tools */}
          <Section icon={<Wrench className="w-4 h-4" />} title="Tools">
            <p className="text-[12px] text-claude-subtle dark:text-coal-400 mb-2">
              Granting a tool widens the agent's blast radius — disable any tool the agent doesn't strictly need.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {config.tools.map((tool) => (
                <label
                  key={tool.id}
                  className={[
                    'flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors',
                    tool.enabled
                      ? 'bg-claude-accent/5 border-claude-accent/30'
                      : 'bg-claude-sand dark:bg-coal-800 border-claude-border dark:border-coal-700 hover:border-claude-divider dark:hover:border-coal-600',
                  ].join(' ')}
                >
                  <input
                    type="checkbox"
                    checked={tool.enabled}
                    onChange={(e) => toggleTool(tool.id, e.target.checked)}
                    className="mt-1 accent-claude-accent"
                  />
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-claude-ink dark:text-coal-100">{tool.label}</div>
                    <div className="text-[11.5px] text-claude-muted dark:text-coal-300">{tool.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </Section>

          {/* HITL */}
          <Section icon={<Hand className="w-4 h-4 text-claude-warning" />} title="Human-in-the-loop rules">
            <p className="text-[12px] text-claude-subtle dark:text-coal-400 mb-2">
              These thresholds pause the agent and surface the task as <strong>Needs approval</strong> on the AI Pipeline board.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <NumberField
                label="Approve when LQI ≥"
                hint="0 = never gate on LQI"
                value={config.hitl.approvalLqiAbove}
                min={0} max={100} step={5}
                onChange={(v) => patchHitl('approvalLqiAbove', v)}
              />
              <NumberField
                label="Approve when deal value ≥ ($)"
                hint="0 = never gate on dollar amount"
                value={config.hitl.approvalDealAbove}
                min={0} max={250000} step={1000}
                onChange={(v) => patchHitl('approvalDealAbove', v)}
              />
              <NumberField
                label="Require approval if confidence < (%)"
                value={config.hitl.requireApprovalIfConfidenceBelow}
                min={0} max={100} step={5}
                onChange={(v) => patchHitl('requireApprovalIfConfidenceBelow', v)}
              />
              <NumberField
                label="Auto-pause after N consecutive errors"
                value={config.hitl.autoPauseOnErrors}
                min={1} max={20} step={1}
                onChange={(v) => patchHitl('autoPauseOnErrors', v)}
              />
            </div>
          </Section>

          {/* Limits */}
          <Section icon={<Gauge className="w-4 h-4" />} title="Limits">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <NumberField
                label="Daily budget ($)"
                value={config.limits.dailyBudgetUsd}
                min={1} max={500} step={1}
                onChange={(v) => patchLimits('dailyBudgetUsd', v)}
              />
              <NumberField
                label="Context window cap (tokens)"
                value={config.limits.contextTokenCap}
                min={50_000} max={2_000_000} step={50_000}
                onChange={(v) => patchLimits('contextTokenCap', v)}
              />
              <NumberField
                label="Concurrency"
                hint="Max simultaneous tasks in flight"
                value={config.limits.concurrency}
                min={1} max={32} step={1}
                onChange={(v) => patchLimits('concurrency', v)}
              />
              <NumberField
                label="Task timeout (sec)"
                value={config.limits.timeoutSec}
                min={5} max={600} step={5}
                onChange={(v) => patchLimits('timeoutSec', v)}
              />
            </div>
          </Section>
        </main>
      </div>

      {/* Local input styling — kept inline so the builder is self-contained. */}
      <style jsx global>{`
        .claude-input {
          width: 100%;
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid var(--c-border);
          background: var(--c-surface);
          color: var(--c-text);
          font-size: 13px;
          outline: none;
          transition: border-color .12s, box-shadow .12s;
        }
        .dark .claude-input { background: var(--c-sand); border-color: var(--c-border); }
        .claude-input:focus { border-color: var(--c-accent); box-shadow: 0 0 0 3px rgba(204,120,92,.18); }
        textarea.claude-input { resize: vertical; }
      `}</style>
    </div>
  );
}

const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <section className="bg-claude-surface dark:bg-coal-850 border border-claude-border dark:border-coal-700 rounded-xl p-4">
    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-claude-border dark:border-coal-700">
      <span className="text-claude-muted dark:text-coal-300">{icon}</span>
      <h2 className="text-[14px] font-semibold text-claude-ink dark:text-coal-100">{title}</h2>
    </div>
    {children}
  </section>
);

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <label className="block mb-3 last:mb-0">
    <span className="block text-[12px] font-medium text-claude-text dark:text-coal-200 mb-1">{label}</span>
    {children}
    {hint && <span className="block text-[11px] text-claude-subtle dark:text-coal-400 mt-1">{hint}</span>}
  </label>
);

const NumberField: React.FC<{
  label: string; hint?: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void;
}> = ({ label, hint, value, min, max, step, onChange }) => (
  <Field label={label} hint={hint}>
    <input
      type="number"
      className="claude-input"
      value={value}
      min={min} max={max} step={step}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  </Field>
);
