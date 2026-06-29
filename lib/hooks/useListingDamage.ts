'use client';

// Fetches the damage-detection agent's report for one listing and exposes the
// localizable damages (with area_points) for image overlays.

import { useEffect, useState } from 'react';
import { agentApi, type DamageAreaItem } from '../agents/agentControl';

const DAMAGE_AGENT_ID = 'damage-detection';

export interface UseListingDamage {
  /** Damages with image_index + area_points, ready for <DamageOverlay/>. */
  damages: DamageAreaItem[];
  /** Full report payload (summary, condition, ...) or null when none exists. */
  report: Record<string, unknown> | null;
  loading: boolean;
}

export function useListingDamage(listingId: string | number | undefined): UseListingDamage {
  const [damages, setDamages] = useState<DamageAreaItem[]>([]);
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (listingId === undefined || listingId === null || listingId === '') return;
    let abort = false;
    setLoading(true);

    agentApi(DAMAGE_AGENT_ID)
      .reports({ entityId: String(listingId), status: 'completed', limit: 1 })
      .then((page) => {
        if (abort) return;
        const rep = page.reports[0]?.report ?? null;
        setReport(rep);
        const items = Array.isArray((rep as any)?.damages) ? ((rep as any).damages as DamageAreaItem[]) : [];
        setDamages(items);
      })
      .catch(() => {
        // No report / endpoint unavailable — the gallery simply renders
        // without markers; this is decoration, not critical data.
        if (!abort) { setReport(null); setDamages([]); }
      })
      .finally(() => { if (!abort) setLoading(false); });

    return () => { abort = true; };
  }, [listingId]);

  return { damages, report, loading };
}
