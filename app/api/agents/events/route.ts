import { LIVE_EVENTS, type LiveEvent } from '../../../../lib/agents/data';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TICK_MS = 3000;

function stamp(): string {
  const d = new Date();
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => String(n).padStart(2, '0'))
    .join(':');
}

// Emit a single SSE frame. Each named event uses the `event:` field so
// EventSource clients can subscribe to specific event types.
function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(req: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let ticks = 0;
      let cancelled = false;

      // Initial snapshot so the UI can render immediately.
      controller.enqueue(encoder.encode(sse('snapshot', { events: LIVE_EVENTS })));

      const interval = setInterval(() => {
        if (cancelled) return;
        const next: LiveEvent = { ...LIVE_EVENTS[ticks % LIVE_EVENTS.length], t: stamp() };
        try {
          controller.enqueue(encoder.encode(sse('agent_event', next)));
        } catch {
          clearInterval(interval);
          cancelled = true;
        }
        ticks += 1;
      }, TICK_MS);

      // Heartbeat every 15s — keeps proxies from killing the connection.
      const heartbeat = setInterval(() => {
        if (cancelled) return;
        try {
          controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`));
        } catch {
          clearInterval(heartbeat);
          cancelled = true;
        }
      }, 15000);

      req.signal.addEventListener('abort', () => {
        cancelled = true;
        clearInterval(interval);
        clearInterval(heartbeat);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
