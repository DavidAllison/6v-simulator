/**
 * Shareable-config URL codec (issue #60).
 *
 * Encodes the user-facing simulator configuration (size, weights, seed, render
 * options …) into compact URL query params so a run is reproducible from a link,
 * and decodes+validates them back. Decoding is defensive: unknown params are
 * ignored and out-of-range / malformed values are dropped (never throws), so a
 * hand-edited or stale link degrades to defaults rather than breaking the app.
 *
 * The lattice STATE is intentionally not encoded — a config + seed reproduces
 * the run deterministically, which keeps links short. (Full-state sharing is the
 * job of the JSON import/export in SaveLoadPanel.)
 */

import { BoundaryCondition, RenderMode } from './types';

export interface ShareableConfig {
  latticeSize: number;
  stepsPerFrame: number;
  temperature: number;
  boundaryCondition: BoundaryCondition;
  dwbcType: 'high' | 'low';
  renderMode: RenderMode;
  showGrid: boolean;
  animateFlips: boolean;
  seed: number;
  weights: { a1: number; a2: number; b1: number; b2: number; c1: number; c2: number };
}

// Hard bounds mirror the UI controls so a link can't drive the app out of range.
const SIZE_MIN = 2;
const SIZE_MAX = 2048;
const SPF_MIN = 1;
const SPF_MAX = 100000;
const TEMP_MIN = 0.01;
const TEMP_MAX = 100;
const WEIGHT_MIN = 0;
const WEIGHT_MAX = 1000;
const WEIGHT_KEYS = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'] as const;

// Short query keys keep links compact.
const KEY = {
  size: 'n',
  stepsPerFrame: 'spf',
  temperature: 't',
  boundaryCondition: 'bc',
  dwbcType: 'dw',
  renderMode: 'rm',
  showGrid: 'g',
  animateFlips: 'af',
  seed: 's',
  weights: 'w', // "a1,a2,b1,b2,c1,c2"
} as const;

const BOUNDARY_VALUES = Object.values(BoundaryCondition) as string[];
const RENDER_VALUES = Object.values(RenderMode) as string[];

function clampInt(raw: string | null, min: number, max: number): number | undefined {
  if (raw === null) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return undefined;
  if (n < min || n > max) return undefined;
  return n;
}

function clampFloat(raw: string | null, min: number, max: number): number | undefined {
  if (raw === null) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min || n > max) return undefined;
  return n;
}

function parseBool(raw: string | null): boolean | undefined {
  if (raw === '1' || raw === 'true') return true;
  if (raw === '0' || raw === 'false') return false;
  return undefined;
}

/** Encode a config into URL query params (compact, lossless for in-range values). */
export function encodeConfig(config: ShareableConfig): URLSearchParams {
  const p = new URLSearchParams();
  p.set(KEY.size, String(config.latticeSize));
  p.set(KEY.stepsPerFrame, String(config.stepsPerFrame));
  p.set(KEY.temperature, String(config.temperature));
  p.set(KEY.boundaryCondition, config.boundaryCondition);
  p.set(KEY.dwbcType, config.dwbcType);
  p.set(KEY.renderMode, config.renderMode);
  p.set(KEY.showGrid, config.showGrid ? '1' : '0');
  p.set(KEY.animateFlips, config.animateFlips ? '1' : '0');
  p.set(KEY.seed, String(config.seed));
  p.set(KEY.weights, WEIGHT_KEYS.map((k) => config.weights[k]).join(','));
  return p;
}

/**
 * Decode a partial config from URL params. Returns only the fields that were
 * present AND valid; callers spread this over their defaults. Never throws.
 */
export function decodeConfig(params: URLSearchParams): Partial<ShareableConfig> {
  const out: Partial<ShareableConfig> = {};

  const size = clampInt(params.get(KEY.size), SIZE_MIN, SIZE_MAX);
  if (size !== undefined) out.latticeSize = size;

  const spf = clampInt(params.get(KEY.stepsPerFrame), SPF_MIN, SPF_MAX);
  if (spf !== undefined) out.stepsPerFrame = spf;

  const temp = clampFloat(params.get(KEY.temperature), TEMP_MIN, TEMP_MAX);
  if (temp !== undefined) out.temperature = temp;

  const bc = params.get(KEY.boundaryCondition);
  if (bc !== null && BOUNDARY_VALUES.includes(bc)) out.boundaryCondition = bc as BoundaryCondition;

  const dw = params.get(KEY.dwbcType);
  if (dw === 'high' || dw === 'low') out.dwbcType = dw;

  const rm = params.get(KEY.renderMode);
  if (rm !== null && RENDER_VALUES.includes(rm)) out.renderMode = rm as RenderMode;

  const g = parseBool(params.get(KEY.showGrid));
  if (g !== undefined) out.showGrid = g;

  const af = parseBool(params.get(KEY.animateFlips));
  if (af !== undefined) out.animateFlips = af;

  const seed = clampInt(params.get(KEY.seed), 0, Number.MAX_SAFE_INTEGER);
  if (seed !== undefined) out.seed = seed;

  const w = params.get(KEY.weights);
  if (w !== null) {
    const parts = w.split(',');
    if (parts.length === WEIGHT_KEYS.length) {
      const vals = parts.map((s) => Number(s));
      if (vals.every((v) => Number.isFinite(v) && v >= WEIGHT_MIN && v <= WEIGHT_MAX)) {
        out.weights = {
          a1: vals[0],
          a2: vals[1],
          b1: vals[2],
          b2: vals[3],
          c1: vals[4],
          c2: vals[5],
        };
      }
    }
  }

  return out;
}

/** Build a full shareable URL for the given config against a base href. */
export function buildShareUrl(config: ShareableConfig, baseHref: string): string {
  const url = new URL(baseHref);
  url.search = encodeConfig(config).toString();
  return url.toString();
}

/** Decode whatever config is present in a location's query string. */
export function readConfigFromSearch(search: string): Partial<ShareableConfig> {
  return decodeConfig(new URLSearchParams(search));
}
