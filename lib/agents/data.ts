// Mock data for the AI Agent Command Center.
// Swap this module for a real /api/agents fetcher when the backend is ready.

export type AgentStatus = 'RUNNING' | 'THINKING' | 'IDLE' | 'ERROR' | 'PAUSED';
export type AgentDomain = 'CRM' | 'Marketplace' | 'Admin';

export interface AgentRecord {
  id: number;
  n: string;          // name
  d: AgentDomain;
  s: AgentStatus;
  model: string;
  uptimeHrs: number;
  cf: number | null;  // confidence %
  td: number;         // tasks today
  sr: number;         // success rate %
  turns: number;      // conversation turns
  tu: number;         // tokens used
  tc: number;         // tokens capacity
  cost: number;
  cc: number;         // cost cap
  task: string;
  age: string;
  from: string | null;
  logs: string[];
}

export interface LiveEvent {
  t: string;
  a: string;
  d: AgentDomain;
  msg: string;
  err?: boolean;
}

export interface KbColumn {
  id: string;
  label: string;
  dot: string;
  sub: string | null;
  ai: boolean;
  hitl: boolean;
}

export interface KbCard {
  id: string;
  v: string;
  p: string;
  mi?: string;
  lqi: number;
  ag: string;
  age: string;
  pr?: number;
  rep?: string;
  offer?: string;
  hitl?: 'warn' | 'ok';
}

export const AGENTS: AgentRecord[] = [
  { id: 1, n: 'Lead Triage', d: 'CRM', s: 'RUNNING', model: 'Claude Sonnet 4', uptimeHrs: 142,
    cf: 95, td: 47, sr: 98, turns: 284, tu: 124500, tc: 500000, cost: 1.87, cc: 10,
    task: 'Routing 3 new leads → Dealer #7 (SUV inventory match)', age: '12s', from: 'Lead Qualification',
    logs: ['Lead #5103 (2019 RAV4) → Dealer #7 — 95% match', 'Lead #5102 (2021 F-150) → Dealer #3 — 88% match', '3 leads received from Lead Qualification Agent'] },
  { id: 2, n: 'Communication', d: 'CRM', s: 'THINKING', model: 'Claude Sonnet 4', uptimeHrs: 142,
    cf: 88, td: 183, sr: 99.5, turns: 1103, tu: 287000, tc: 800000, cost: 4.31, cc: 20,
    task: 'Composing SMS for lead #4892 — 2018 Honda CR-V seller', age: '3s', from: 'Pipeline Mgmt',
    logs: ['Drafting SMS #4892 — tone: casual, motivated seller', 'Email sent to #4876 in 18s (SLA <30s) ✓', 'Inbound SMS #4801 classified: PRICE_INQUIRY'] },
  { id: 3, n: 'Deal Intelligence', d: 'CRM', s: 'IDLE', model: 'Claude Opus 4', uptimeHrs: 142,
    cf: null, td: 12, sr: 100, turns: 72, tu: 45000, tc: 300000, cost: 0.68, cc: 8,
    task: 'Idle — waiting for deal assignment', age: '2m', from: null,
    logs: ['Deal #892: offers $18,400 / $19,200 / $20,100', 'Risk score #892: 23/100 (LOW)', 'Cycle forecast: 4.2 days vs 8-day SLA ✓'] },
  { id: 4, n: 'Pipeline Mgmt', d: 'CRM', s: 'RUNNING', model: 'Claude Sonnet 4', uptimeHrs: 142,
    cf: 92, td: 31, sr: 97, turns: 186, tu: 89000, tc: 400000, cost: 1.34, cc: 10,
    task: 'Follow-up: 5 deals stale >48h', age: '45s', from: null,
    logs: ['Deal #874 escalated → Senior Buyer (72h threshold)', '5 stale deals — follow-up sequence initiated', 'Deal #869 → Closed Won (6.3 days) ✓'] },
  { id: 5, n: 'Discovery Agent', d: 'Marketplace', s: 'RUNNING', model: 'Claude Haiku 4.5', uptimeHrs: 96,
    cf: 94, td: 2847, sr: 94, turns: 17082, tu: 512000, tc: 1000000, cost: 7.68, cc: 25,
    task: "Scanning FB Marketplace: 'Toyota 4Runner 2020–2023' Chicago", age: '8s', from: null,
    logs: ['GraphQL search: 47 listings found (200 OK, 312ms)', '12 listings → Vehicle Intelligence Agent', 'FB session active — rate limit 38%'] },
  { id: 6, n: 'Vehicle Intelligence', d: 'Marketplace', s: 'THINKING', model: 'Claude Sonnet 4', uptimeHrs: 96,
    cf: 78, td: 234, sr: 96, turns: 1404, tu: 198000, tc: 500000, cost: 2.97, cc: 15,
    task: 'LQI scoring: FB-29341 — fetching MMR + Carfax', age: '2s', from: 'Discovery Agent',
    logs: ['Fetching Carfax: VIN 1FTFW1ET0DFC10312...', 'FB-29341: 2020 Toyota 4Runner $34,200 41k mi', 'LQI #FB-29338: 87/100 → Lead Qualification Agent'] },
  { id: 7, n: 'Lead Qualification', d: 'Marketplace', s: 'RUNNING', model: 'Claude Sonnet 4', uptimeHrs: 96,
    cf: 91, td: 189, sr: 92, turns: 1134, tu: 156000, tc: 600000, cost: 2.34, cc: 15,
    task: 'Seller intent analysis: 8 listings in queue', age: '18s', from: 'Vehicle Intelligence',
    logs: ['Seller #8821: motivated (divorce, fast sale) — ELEVATED', '8 listings queued from Vehicle Intelligence', 'Lead #5098 qualified (LQI 91) → Lead Triage'] },
  { id: 8, n: 'Dealer Onboarding', d: 'Admin', s: 'IDLE', model: 'Claude Haiku 4.5', uptimeHrs: 312,
    cf: null, td: 3, sr: 100, turns: 18, tu: 28000, tc: 200000, cost: 0.42, cc: 5,
    task: 'Queue empty — next scan in 22 min', age: '8m', from: null,
    logs: ['#DA-043 Royal Motors Chicago onboarded (3h 42m)', 'DMV license IL-DL-482910 verified (exp 2027-08)', 'OCR: 12/12 documents verified'] },
  { id: 9, n: 'Compliance Monitor', d: 'Admin', s: 'RUNNING', model: 'Claude Opus 4', uptimeHrs: 312,
    cf: 99, td: 29, sr: 100, turns: 174, tu: 67000, tc: 300000, cost: 1.01, cc: 8,
    task: 'OFAC scan: 4 new dealer applications', age: '1m', from: null,
    logs: ['OFAC scan: 4 applications — 0 matches (CLEAR)', 'Expiry alert: Dealer #12 — 28 days', 'AML check passed: Dealer #41'] },
  { id: 10, n: 'Financial Ops', d: 'Admin', s: 'ERROR', model: 'Claude Sonnet 4', uptimeHrs: 312,
    cf: null, td: 8, sr: 87, turns: 48, tu: 34000, tc: 250000, cost: 0.51, cc: 6,
    task: 'BLOCKED: TX-4892 reconciliation gap ($12.40)', age: '5m', from: null,
    logs: ['ERROR: TX-4892 $12.40 discrepancy — needs review', 'Stripe webhook: charge.updated for TX-4892', '127 transactions in reconciliation queue'] },
];

export const LIVE_EVENTS: LiveEvent[] = [
  { t: '14:14:22', a: 'Discovery Agent',      d: 'Marketplace', msg: '47 new listings found — 12 passed filter' },
  { t: '14:14:18', a: 'Vehicle Intelligence', d: 'Marketplace', msg: 'LQI #FB-29338: 87/100 — forwarded to Lead Qual' },
  { t: '14:14:12', a: 'Communication',        d: 'CRM',         msg: 'SMS sent to lead #4891 (18s response time)' },
  { t: '14:14:05', a: 'Lead Triage',          d: 'CRM',         msg: 'Lead #5103 routed → Dealer #7 (95% match)' },
  { t: '14:13:58', a: 'Compliance Monitor',   d: 'Admin',       msg: 'OFAC scan complete — 0 matches' },
  { t: '14:13:44', a: 'Lead Qualification',   d: 'Marketplace', msg: 'Lead #5098 qualified (LQI 91) → CRM' },
  { t: '14:13:30', a: 'Financial Ops',        d: 'Admin',       msg: 'ERROR: TX-4892 gap — escalating to ops', err: true },
  { t: '14:13:22', a: 'Pipeline Mgmt',        d: 'CRM',         msg: 'Deal #874 escalated (72h stale threshold)' },
];

export const KB_COLS: KbColumn[] = [
  { id: 'new',    label: 'New Lead',      dot: '#9A958A', sub: null,         ai: false, hitl: false },
  { id: 'qual',   label: 'AI Qualifying', dot: '#5E7BA8', sub: 'AI scoring', ai: true,  hitl: false },
  { id: 'cont',   label: 'Contacted',     dot: '#A78BFA', sub: null,         ai: false, hitl: false },
  { id: 'neg',    label: 'Negotiating',   dot: '#C9A961', sub: null,         ai: false, hitl: false },
  { id: 'draft',  label: 'Deal Draft',    dot: '#CC785C', sub: 'Human gate', ai: false, hitl: true  },
  { id: 'closed', label: 'Closed Won',    dot: '#6B8E5A', sub: null,         ai: false, hitl: false },
];

export const KB_CARDS: Record<string, KbCard[]> = {
  new: [
    { id: 'L5103', v: '2019 Toyota RAV4',  p: '$19,200', mi: '62k mi', lqi: 91, ag: 'Discovery',   age: '4m' },
    { id: 'L5102', v: '2021 Ford F-150',   p: '$31,500', mi: '28k mi', lqi: 88, ag: 'Discovery',   age: '6m' },
    { id: 'L5099', v: '2020 Honda CR-V',   p: '$22,100', mi: '45k mi', lqi: 77, ag: 'Discovery',   age: '18m' },
  ],
  qual: [
    { id: 'L5098', v: '2022 Toyota Camry', p: '$24,800', mi: '18k mi', lqi: 94, ag: 'Vehicle Intel', age: '2m', pr: 72 },
    { id: 'L5097', v: '2020 Chevy Tahoe',  p: '$38,000', mi: '52k mi', lqi: 85, ag: 'Vehicle Intel', age: '5m', pr: 45 },
  ],
  cont: [
    { id: 'L5084', v: '2019 Jeep Wrangler',p: '$35,700', mi: '47k mi', lqi: 89, ag: 'Communication', age: '1h 12m', rep: 'Awaiting reply' },
    { id: 'L5081', v: '2021 BMW 3 Series', p: '$28,400', mi: '31k mi', lqi: 82, ag: 'Communication', age: '2h 4m',  rep: 'Replied — negotiating' },
    { id: 'L5078', v: '2020 Honda Pilot',  p: '$29,900', mi: '39k mi', lqi: 86, ag: 'Communication', age: '3h 31m', rep: 'Call scheduled' },
  ],
  neg: [
    { id: 'L5062', v: '2018 Ford Expedition', p: '$27,500', mi: '71k mi', lqi: 80, ag: 'Deal Intel', age: '1d 2h', offer: '$26,200 counter' },
    { id: 'L5055', v: '2021 RAM 1500',        p: '$34,100', mi: '22k mi', lqi: 91, ag: 'Deal Intel', age: '18h',   offer: '$33,000 pending' },
  ],
  draft: [
    { id: 'L5041', v: '2020 Toyota 4Runner', p: '$34,200', mi: '41k mi', lqi: 93, ag: 'Deal Intel', age: '2d 4h', hitl: 'warn' },
    { id: 'L5038', v: '2019 Lexus RX 350',   p: '$31,800', mi: '55k mi', lqi: 88, ag: 'Deal Intel', age: '1d 6h', hitl: 'ok' },
  ],
  closed: [
    { id: 'L4892', v: '2018 Honda CR-V',     p: '$18,400', lqi: 84, ag: 'Pipeline Mgmt', age: '3d' },
    { id: 'L4876', v: '2020 Ford Explorer',  p: '$29,700', lqi: 90, ag: 'Pipeline Mgmt', age: '4d' },
    { id: 'L4869', v: '2021 Chevy Equinox',  p: '$21,300', lqi: 87, ag: 'Pipeline Mgmt', age: '5d' },
  ],
};

export const RA_ROWS: { t: string; msg: string; a: string }[] = [
  { t: '14:14:05', msg: 'L5103 routed → Dealer #7 (95% inventory match)',         a: 'Lead Triage' },
  { t: '14:13:58', msg: 'L5098 moved to AI Qualifying (LQI 94 — threshold met)',  a: 'Vehicle Intel' },
  { t: '14:13:44', msg: 'SMS sent to L5084 — 18s turnaround, awaiting reply',     a: 'Communication' },
  { t: '14:13:22', msg: 'Deal #874 escalated after 72h inactivity — senior buyer',a: 'Pipeline Mgmt' },
  { t: '14:13:10', msg: '3-tier offer for L5062: $26,200 / $27,000 / $27,400',    a: 'Deal Intel' },
];
