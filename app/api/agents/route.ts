import { NextResponse } from 'next/server';
import { AGENTS } from '../../../lib/agents/data';

// Mark as dynamic so it isn't statically cached during builds.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const stats = {
    total: AGENTS.length,
    active: AGENTS.filter((a) => a.s === 'RUNNING' || a.s === 'THINKING').length,
    errors: AGENTS.filter((a) => a.s === 'ERROR').length,
    cost: AGENTS.reduce((s, a) => s + a.cost, 0),
    tokens: AGENTS.reduce((s, a) => s + a.tu, 0),
  };
  return NextResponse.json({ agents: AGENTS, stats });
}
