/**
 * One-shot codemod that migrates legacy Tailwind gray/white surface classes
 * to the Claude warm palette tokens. Idempotent: re-running is a no-op.
 *
 * Run with:  node scripts/migrate-theme-tokens.mjs
 */
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const SCAN_DIRS = ['app', 'components'];
// Skip already-migrated areas so the codemod is safely re-runnable.
const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', 'build']);
const SKIP_FILE_HINTS = ['/app/agents/', '\\app\\agents\\'];

/**
 * Mapping table — ORDER MATTERS. Process the longest/most-specific patterns
 * first so we don't double-rewrite (e.g. dark:bg-gray-800 → dark:bg-coal-850
 * must run BEFORE any bare bg-gray-800 rule).
 */
/**
 * Base mappings (without variant prefix). The expander below cross-products
 * these with common Tailwind variant prefixes (hover:, focus:, dark:, etc.)
 * so we catch dark:hover:bg-gray-700 alongside bg-gray-700.
 */
const BASE_MAPPINGS = [
  // Surfaces
  ['bg-white',     'bg-claude-surface'],
  ['bg-gray-50',   'bg-claude-cream'],
  ['bg-gray-100',  'bg-claude-sand'],
  ['bg-gray-200',  'bg-claude-sand'],
  ['bg-gray-300',  'bg-claude-divider'],
  ['bg-gray-400',  'bg-claude-subtle'],
  ['bg-gray-500',  'bg-claude-subtle'],
  ['bg-gray-600',  'bg-coal-600'],
  ['bg-gray-700',  'bg-coal-700'],
  ['bg-gray-800',  'bg-coal-850'],
  ['bg-gray-900',  'bg-coal-900'],

  // Borders
  ['border-gray-100', 'border-claude-border'],
  ['border-gray-200', 'border-claude-border'],
  ['border-gray-300', 'border-claude-divider'],
  ['border-gray-500', 'border-coal-500'],
  ['border-gray-600', 'border-coal-600'],
  ['border-gray-700', 'border-coal-700'],
  ['border-gray-800', 'border-coal-700'],

  // Text
  ['text-white',    'text-coal-100'],   // mainly used for dark-mode contrast text
  ['text-gray-100', 'text-coal-100'],
  ['text-gray-200', 'text-coal-200'],
  ['text-gray-300', 'text-coal-300'],
  ['text-gray-400', 'text-claude-subtle'],
  ['text-gray-500', 'text-claude-subtle'],
  ['text-gray-600', 'text-claude-muted'],
  ['text-gray-700', 'text-claude-text'],
  ['text-gray-800', 'text-claude-ink'],
  ['text-gray-900', 'text-claude-ink'],
];

// Variants we want to apply the same mappings under. The empty string is
// the bare class (no variant prefix). Order does not matter for correctness
// but we keep dark variants first so they appear first in the regex list.
const VARIANTS = ['', 'hover:', 'focus:', 'group-hover:', 'group-focus:', 'focus-within:'];
const DARK_VARIANTS = ['dark:', 'dark:hover:', 'dark:focus:', 'dark:group-hover:'];

const MAPPINGS = [];

// For dark variants, route bg-white/bg-gray-50/etc. to the same coal targets
// as the bare dark token mappings — keeps dark mode coherent regardless of
// whether the source used `dark:bg-white` (rare) or `dark:bg-gray-800` (common).
const DARK_OVERRIDES = new Map([
  ['bg-white',     'bg-coal-850'],
  ['bg-gray-50',   'bg-coal-850'],
  ['bg-gray-100',  'bg-coal-800'],
  ['bg-gray-200',  'bg-coal-700'],
  ['bg-gray-300',  'bg-coal-600'],
  ['bg-gray-400',  'bg-coal-500'],
  ['bg-gray-500',  'bg-coal-500'],
  ['bg-gray-600',  'bg-coal-600'],
  ['bg-gray-700',  'bg-coal-700'],
  ['bg-gray-800',  'bg-coal-850'],
  ['bg-gray-900',  'bg-coal-900'],
  ['border-gray-100', 'border-coal-700'],
  ['border-gray-200', 'border-coal-700'],
  ['border-gray-300', 'border-coal-600'],
  ['border-gray-500', 'border-coal-500'],
  ['border-gray-600', 'border-coal-600'],
  ['border-gray-700', 'border-coal-700'],
  ['border-gray-800', 'border-coal-700'],
  ['text-white',    'text-coal-100'],
  ['text-gray-100', 'text-coal-100'],
  ['text-gray-200', 'text-coal-200'],
  ['text-gray-300', 'text-coal-300'],
  ['text-gray-400', 'text-coal-400'],
  ['text-gray-500', 'text-coal-500'],
  ['text-gray-600', 'text-coal-400'],
  ['text-gray-700', 'text-coal-300'],
  ['text-gray-800', 'text-coal-200'],
  ['text-gray-900', 'text-coal-100'],
]);

for (const [from, to] of BASE_MAPPINGS) {
  for (const v of VARIANTS) MAPPINGS.push([v + from, v + to]);
  const darkTo = DARK_OVERRIDES.get(from) ?? to;
  for (const v of DARK_VARIANTS) MAPPINGS.push([v + from, v + darkTo]);
}

/**
 * Compile each pattern as `(?<![\w-])PATTERN(?![\w-])` so we only replace
 * standalone class tokens. Hyphens count as word chars for our purposes so
 * we don't accidentally match `bg-gray-100` inside `bg-gray-1000` (unlikely
 * but cheap to guard against).
 */
const REGEXES = MAPPINGS.map(([from, to]) => [
  new RegExp(`(?<![\\w-])${from.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}(?![\\w-])`, 'g'),
  to,
]);

async function walk(dir, out) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      await walk(p, out);
    } else if (/\.(tsx|ts)$/.test(e.name)) {
      out.push(p);
    }
  }
}

function shouldSkip(filePath) {
  return SKIP_FILE_HINTS.some((hint) => filePath.includes(hint));
}

let touched = 0;
let totalReplacements = 0;

for (const dir of SCAN_DIRS) {
  const abs = join(ROOT, dir);
  try { statSync(abs); } catch { continue; }
  const files = [];
  await walk(abs, files);
  for (const file of files) {
    if (shouldSkip(file)) continue;
    const original = readFileSync(file, 'utf8');
    let updated = original;
    let perFile = 0;
    for (const [re, to] of REGEXES) {
      updated = updated.replace(re, () => { perFile += 1; return to; });
    }
    if (updated !== original) {
      writeFileSync(file, updated, 'utf8');
      touched += 1;
      totalReplacements += perFile;
      process.stdout.write(`updated ${relative(ROOT, file).split(sep).join('/')}  (${perFile})\n`);
    }
  }
}

process.stdout.write(`\nDone. ${touched} file(s) changed, ${totalReplacements} replacement(s).\n`);
