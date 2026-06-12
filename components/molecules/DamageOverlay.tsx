'use client';

// Red-circle damage markers drawn over a listing image.
//
// Coordinates come from the damage-detection agent as fractions of the image
// dimensions (0..1). The overlay is an absolutely-positioned SVG with
// viewBox "0 0 100 100" + preserveAspectRatio "none", so it stretches exactly
// with the rendered image regardless of its display size — including inside
// the carousel's zoom/pan viewer, where it shares the parent transform.
//
// Render it as a sibling of an <img> inside a `relative` wrapper whose box
// matches the painted image (true for object-contain images sized to content).

import React from 'react';
import type { DamageAreaItem } from '../../lib/agents/agentControl';

const SEVERITY_OPACITY: Record<string, number> = {
  minor: 0.55,
  moderate: 0.75,
  severe: 0.95,
};

interface Circle {
  cx: number;       // viewBox units (0..100)
  cy: number;
  rx: number;
  ry: number;
  title: string;
  opacity: number;
  possible: boolean; // uncertain finding — amber dashed instead of red solid
}

/** Fit an ellipse around a normalized point outline (centroid + half-extent). */
function fitCircle(d: DamageAreaItem): Circle | null {
  const pts = d.area_points;
  if (!pts || pts.length < 3) return null;
  const xs = pts.map((p) => p.x * 100);
  const ys = pts.map((p) => p.y * 100);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const PAD = 1.5;   // breathing room around the outline (viewBox units)
  const MIN_R = 3;   // keep tiny damages visible
  const possible = d.certainty === 'possible';
  const title = [
    possible ? 'POSSIBLE damage' : null,
    d.part,
    d.damage_type,
    d.severity,
    `confidence ${(d.confidence * 100).toFixed(0)}%`,
    possible && d.uncertainty_reason ? `uncertain: ${d.uncertainty_reason}` : null,
    d.description ?? '',
  ].filter(Boolean).join(' · ');
  return {
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    rx: Math.max(MIN_R, (maxX - minX) / 2 + PAD),
    ry: Math.max(MIN_R, (maxY - minY) / 2 + PAD),
    title,
    opacity: SEVERITY_OPACITY[d.severity] ?? 0.75,
    possible,
  };
}

export interface DamageOverlayProps {
  /** Damages for the CURRENT image only (already filtered by image_index). */
  damages: DamageAreaItem[];
  /** Also trace the raw outline polygon, not just the fitted circle. */
  showOutline?: boolean;
  className?: string;
}

export const DamageOverlay: React.FC<DamageOverlayProps> = ({
  damages,
  showOutline = false,
  className,
}) => {
  const circles = damages
    .map((d) => ({ d, c: fitCircle(d) }))
    .filter((e): e is { d: DamageAreaItem; c: Circle } => e.c !== null);
  if (circles.length === 0) return null;

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={`absolute inset-0 w-full h-full pointer-events-none ${className ?? ''}`}
      aria-label={`${circles.length} damage marker(s)`}
      role="img"
    >
      {circles.map(({ d, c }, i) => {
        const color = c.possible ? '#F59E0B' : '#EF4444'; // amber = possible, red = confirmed
        return (
          <g key={i} className="pointer-events-auto">
            <title>{c.title}</title>
            {/* soft halo so the marker reads on any paint color */}
            <ellipse
              cx={c.cx} cy={c.cy} rx={c.rx} ry={c.ry}
              fill={color} fillOpacity={0.12}
            />
            {/* vectorEffect keeps the ring 2px on screen regardless of zoom */}
            <ellipse
              cx={c.cx} cy={c.cy} rx={c.rx} ry={c.ry}
              fill="none" stroke={color} strokeOpacity={c.opacity}
              vectorEffect="non-scaling-stroke"
              style={{ strokeWidth: 2 }}
              strokeDasharray={c.possible ? '6 4' : undefined}
            />
            {showOutline && d.area_points && (
              <polygon
                points={d.area_points.map((p) => `${p.x * 100},${p.y * 100}`).join(' ')}
                fill="none" stroke={color} strokeOpacity={0.5}
                style={{ strokeWidth: 1 }}
                vectorEffect="non-scaling-stroke"
                strokeDasharray="3 2"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
};

/** Filter a report's damages to those localizable on a given image. */
export function damagesForImage(damages: DamageAreaItem[] | undefined, imageIndex: number): DamageAreaItem[] {
  return (damages ?? []).filter(
    (d) => d.image_index === imageIndex && Array.isArray(d.area_points) && d.area_points.length >= 3,
  );
}
