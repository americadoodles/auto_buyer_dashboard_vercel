'use client';

// Professional per-listing vehicle damage inspection report.
//
// Presents the damage-detection agent's findings as a formal inspection report:
//   1. a titled header with the vehicle, VIN, and overall condition,
//   2. a key-facts summary grid (condition, confirmed/possible counts, estimated
//      repair, photo coverage),
//   3. the assessment narrative,
//   4. findings grouped BY PHOTO — each analyzed image is shown with its damage
//      markers drawn on it (via <DamageOverlay/>) and its localized findings,
//   5. a consolidated findings table, a severity legend, and an AI disclaimer.
//
// Decoration over the report payload — it self-hides when no report exists.

import React, { useMemo } from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, FileText } from 'lucide-react';
import { DamageOverlay, damagesForImage } from './DamageOverlay';
import type { DamageAreaItem } from '../../lib/agents/agentControl';

interface ReportImage {
  index: number;
  view?: string;
  vehicle_visible?: boolean;
  image_quality?: string;
  needs_human_review?: boolean;
}

export interface DamageReportPanelProps {
  /** Full damage report payload from the agent, or null when none exists. */
  report: Record<string, any> | null;
  /** The listing's image URLs (report image indexes point into this array). */
  images: string[];
  /** Listing's vehicle label (e.g. "2019 Toyota Camry") for the report header. */
  vehicleLabel?: string;
  /** Listing's VIN for the report header (falls back to the photo-read VIN). */
  vin?: string | null;
  className?: string;
}

const CONDITION_STYLE: Record<string, string> = {
  excellent: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  good: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  fair: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  poor: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  damaged: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

const SEVERITY_STYLE: Record<string, string> = {
  minor: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  moderate: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  severe: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

const humanize = (s?: string) => (s ? s.replace(/_/g, ' ') : '');

const formatCost = (cost: any): string | null => {
  if (!cost || typeof cost !== 'object') return null;
  const low = Number(cost.low);
  const high = Number(cost.high);
  if (!Number.isFinite(low) || !Number.isFinite(high)) return null;
  const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;
  return low === high ? fmt(low) : `${fmt(low)} – ${fmt(high)}`;
};

const SeverityChip: React.FC<{ d: DamageAreaItem }> = ({ d }) => {
  const possible = d.certainty === 'possible';
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
        SEVERITY_STYLE[d.severity] ?? SEVERITY_STYLE.minor
      }`}
      title={[
        possible ? 'POSSIBLE — may be a reflection/shadow/artifact' : null,
        d.description ?? undefined,
        possible && d.uncertainty_reason ? `uncertain: ${d.uncertainty_reason}` : null,
      ]
        .filter(Boolean)
        .join(' · ')}
    >
      {possible && <AlertTriangle className="w-3 h-3" />}
      <span className="capitalize">{d.part}</span>
      <span className="opacity-70">· {d.damage_type}</span>
      <span className="font-semibold capitalize">· {d.severity}</span>
      {possible && <span className="opacity-80">(possible)</span>}
    </span>
  );
};

const Fact: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="px-3 py-2">
    <dt className="text-[10px] uppercase tracking-wide text-claude-subtle dark:text-coal-400">{label}</dt>
    <dd className="text-sm font-semibold text-claude-ink dark:text-coal-100">{children}</dd>
  </div>
);

export const DamageReportPanel: React.FC<DamageReportPanelProps> = ({
  report,
  images,
  vehicleLabel,
  vin,
  className,
}) => {
  const reportImages: ReportImage[] = Array.isArray(report?.images) ? report!.images : [];
  const allDamages: DamageAreaItem[] = Array.isArray(report?.damages) ? report!.damages : [];

  // Build the per-image rows once: prefer the report's analyzed-image list, but
  // fall back to any image that carries damages, so nothing is hidden.
  const rows = useMemo(() => {
    const byIndex = new Map<number, ReportImage>();
    reportImages.forEach((img) => byIndex.set(img.index, img));
    allDamages.forEach((d) => {
      if (typeof d.image_index === 'number' && !byIndex.has(d.image_index)) {
        byIndex.set(d.image_index, { index: d.image_index });
      }
    });
    return Array.from(byIndex.values())
      .filter((img) => images[img.index] !== undefined)
      .sort((a, b) => a.index - b.index)
      .map((img) => ({ img, damages: damagesForImage(allDamages, img.index) }));
  }, [reportImages, allDamages, images]);

  if (!report) return null;

  const condition = String(report.overall_condition ?? '').toLowerCase();
  const damageCount = Number(report.damage_count ?? 0);
  const possibleCount = Number(report.possible_damage_count ?? 0);
  const summary = typeof report.summary === 'string' ? report.summary : null;
  const needsReview = Boolean(report.needs_human_review);
  const vehicleMatch = String(report.vehicle_match ?? '');
  // Older reports omit these; default to "fine" so we never show spurious flags.
  const vehicleDetected = report.vehicle_detected !== false;
  const inScope = report.in_scope !== false;
  const vehicleCategory = typeof report.vehicle_category === 'string' ? report.vehicle_category : '';
  const missingViews: string[] = Array.isArray(report.missing_views) ? report.missing_views : [];
  const analyzedCount = reportImages.length || rows.length;
  const repairEstimate = formatCost(report.total_estimated_repair_cost_usd);
  const reportVin = vin || report?.extracted?.vin || null;
  const identified = typeof report.vehicle_identified === 'string' ? report.vehicle_identified : null;
  const headerVehicle = vehicleLabel || identified || 'Vehicle';

  return (
    <section
      className={`bg-claude-surface dark:bg-coal-850 rounded-lg shadow-sm border border-claude-border dark:border-coal-700 overflow-hidden ${
        className ?? ''
      }`}
      aria-label="Vehicle damage inspection report"
    >
      {/* Report header */}
      <header className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 border-b border-claude-border dark:border-coal-700 bg-claude-cream dark:bg-coal-800">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 mt-0.5 text-claude-accent" />
          <div>
            <h3 className="text-base font-semibold text-claude-ink dark:text-coal-100">
              Vehicle Damage Inspection Report
            </h3>
            <p className="text-xs text-claude-muted dark:text-coal-300">
              {headerVehicle}
              {reportVin ? <span className="ml-2 font-mono">VIN {reportVin}</span> : null}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {condition && (
            <span
              className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize ${
                CONDITION_STYLE[condition] ?? 'bg-claude-sand text-claude-ink dark:bg-coal-700 dark:text-coal-200'
              }`}
            >
              {damageCount > 0 ? (
                <ShieldAlert className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
              ) : (
                <ShieldCheck className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
              )}
              {condition}
            </span>
          )}
        </div>
      </header>

      {/* Key facts */}
      <dl className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-claude-border dark:divide-coal-700 border-b border-claude-border dark:border-coal-700">
        <Fact label="Condition">
          <span className="capitalize">{condition || '—'}</span>
        </Fact>
        <Fact label="Confirmed Damage">
          {damageCount}
          {possibleCount > 0 ? (
            <span className="font-normal text-claude-muted dark:text-coal-300"> (+{possibleCount} possible)</span>
          ) : null}
        </Fact>
        <Fact label="Est. Repair">{repairEstimate ?? '—'}</Fact>
        <Fact label="Photos Analyzed">{analyzedCount}</Fact>
      </dl>

      <div className="px-5 py-4 space-y-5">
        {/* Status flags */}
        {(!vehicleDetected || !inScope || vehicleMatch === 'mismatch' || needsReview || missingViews.length > 0) && (
          <div className="flex flex-wrap gap-2">
            {!vehicleDetected && (
              <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">
                No vehicle detected in photos
              </span>
            )}
            {vehicleDetected && !inScope && (
              <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                Vehicle type out of scope{vehicleCategory ? `: ${humanize(vehicleCategory)}` : ''} — not inspected for damage
              </span>
            )}
            {vehicleMatch === 'mismatch' && (
              <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">
                Vehicle does not match listing
              </span>
            )}
            {needsReview && (
              <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                Flagged for human review
              </span>
            )}
            {missingViews.length > 0 && (
              <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                Missing views: {missingViews.map(humanize).join(', ')}
              </span>
            )}
          </div>
        )}

        {/* Assessment narrative */}
        {summary && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-claude-subtle dark:text-coal-400 mb-1">
              Assessment
            </h4>
            <p className="text-sm text-claude-ink dark:text-coal-200 whitespace-pre-line leading-relaxed">
              {summary}
            </p>
          </div>
        )}

        {/* Findings by photo */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-claude-subtle dark:text-coal-400 mb-2">
            Findings by Photo
          </h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {rows.map(({ img, damages }) => (
              <figure
                key={img.index}
                className="rounded-md border border-claude-border dark:border-coal-700 overflow-hidden bg-claude-cream dark:bg-coal-800"
              >
                <div className="relative bg-claude-sand dark:bg-coal-700 flex items-center justify-center">
                  <div className="relative">
                    <img
                      src={images[img.index]}
                      alt={`Photo ${img.index + 1}${img.view ? ` — ${humanize(img.view)}` : ''}`}
                      className="max-h-44 w-full object-contain"
                    />
                    <DamageOverlay damages={damages} />
                  </div>
                </div>
                <figcaption className="p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-claude-ink dark:text-coal-100">
                      Photo {img.index + 1}
                      {img.view ? (
                        <span className="text-claude-muted dark:text-coal-300"> · {humanize(img.view)}</span>
                      ) : null}
                    </span>
                    {damages.length === 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700 dark:text-green-400">
                        <ShieldCheck className="w-3 h-3" /> No damage
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-red-600 dark:text-red-400">
                        {damages.length} damage{damages.length === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                  {damages.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {damages.map((d, i) => (
                        <SeverityChip key={i} d={d} />
                      ))}
                    </div>
                  )}
                  {img.image_quality && img.image_quality !== 'good' && (
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 capitalize">
                      image quality: {img.image_quality}
                    </p>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
          {rows.length === 0 && (
            <p className="text-sm text-claude-muted dark:text-coal-300">
              No per-image findings are available for this report yet.
            </p>
          )}
        </div>

        {/* Consolidated findings table */}
        {allDamages.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-claude-subtle dark:text-coal-400 mb-2">
              All Findings
            </h4>
            <div className="overflow-x-auto rounded-md border border-claude-border dark:border-coal-700">
              <table className="w-full text-sm">
                <thead className="bg-claude-cream dark:bg-coal-800 text-claude-subtle dark:text-coal-400">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-medium">Photo</th>
                    <th className="px-3 py-2 font-medium">Part</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Severity</th>
                    <th className="px-3 py-2 font-medium">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-claude-border dark:divide-coal-700">
                  {allDamages.map((d, i) => (
                    <tr key={i} className="text-claude-ink dark:text-coal-200">
                      <td className="px-3 py-2 whitespace-nowrap">
                        {typeof d.image_index === 'number' ? `#${d.image_index + 1}` : '—'}
                      </td>
                      <td className="px-3 py-2 capitalize">{d.part}</td>
                      <td className="px-3 py-2">{d.damage_type}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${
                            SEVERITY_STYLE[d.severity] ?? SEVERITY_STYLE.minor
                          }`}
                        >
                          {d.severity}
                          {d.certainty === 'possible' ? ' (possible)' : ''}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-claude-muted dark:text-coal-300">
                        {Number.isFinite(d.confidence) ? `${Math.round(d.confidence * 100)}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Legend + disclaimer */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-[11px] text-claude-subtle dark:text-coal-400 border-t border-claude-border dark:border-coal-700">
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#EF4444' }} /> Confirmed damage
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#F59E0B' }} /> Possible (unverified)
          </span>
          <span className="ml-auto italic">
            AI-generated assessment — verify before relying on it for valuation or sale.
          </span>
        </div>
      </div>
    </section>
  );
};
