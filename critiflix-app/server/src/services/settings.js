// Admin-editable points economy:
//   earnThreshold  — the first N lifetime points a critic earns are a benchmark
//                    with no Naira value; only points beyond it are cashable.
//   nairaPerPoint  — Naira value of one cashable point (1 pt = ₦0.20 by default).
// Values live in the Setting collection and are cached briefly in memory.
import { Setting } from '../models/Setting.js';
import { REDEEM_RATE, CASHOUT_FEE } from '../points.js';

export const ECONOMY_DEFAULTS = Object.freeze({
  earnThreshold: 1000,
  nairaPerPoint: REDEEM_RATE,
});

export const ECONOMY_LIMITS = Object.freeze({
  earnThreshold: { min: 0, max: 10_000_000 },
  nairaPerPoint: { min: 0.001, max: 1000 },
});

const TTL_MS = 30_000;
let cache = null;
let cachedAt = 0;

function normalize(v = {}) {
  return {
    earnThreshold: Number.isFinite(+v.earnThreshold) ? Math.round(+v.earnThreshold) : ECONOMY_DEFAULTS.earnThreshold,
    nairaPerPoint: Number.isFinite(+v.nairaPerPoint) && +v.nairaPerPoint > 0 ? +v.nairaPerPoint : ECONOMY_DEFAULTS.nairaPerPoint,
  };
}

// Shape shared with clients (mobile Points/Redeem, admin console, /api/config).
export function describeEconomy(e) {
  return {
    earnThreshold: e.earnThreshold,
    nairaPerPoint: e.nairaPerPoint,
    pointsPerNaira: Math.round((1 / e.nairaPerPoint) * 1000) / 1000,
    cashoutFee: CASHOUT_FEE,
    updatedAt: e.updatedAt || null,
  };
}

export async function getEconomy({ fresh = false } = {}) {
  if (!fresh && cache && Date.now() - cachedAt < TTL_MS) return cache;
  try {
    const doc = await Setting.findOne({ key: 'economy' }).lean();
    cache = { ...normalize(doc?.value), updatedAt: doc?.updatedAt || null };
  } catch {
    // DB not ready: fall back to the last known values, else defaults.
    cache = cache || { ...ECONOMY_DEFAULTS, updatedAt: null };
  }
  cachedAt = Date.now();
  return cache;
}

// Validates and saves a partial update. Throws an Error with a user-facing
// message when a value is out of range.
export async function updateEconomy(patch = {}, adminId = null) {
  const current = await getEconomy({ fresh: true });
  const next = { earnThreshold: current.earnThreshold, nairaPerPoint: current.nairaPerPoint };

  if (patch.earnThreshold !== undefined) {
    const v = Number(patch.earnThreshold);
    const { min, max } = ECONOMY_LIMITS.earnThreshold;
    if (!Number.isInteger(v) || v < min || v > max) throw new Error(`Benchmark must be a whole number of points between ${min} and ${max.toLocaleString()}`);
    next.earnThreshold = v;
  }
  if (patch.nairaPerPoint !== undefined) {
    const v = Number(patch.nairaPerPoint);
    const { min, max } = ECONOMY_LIMITS.nairaPerPoint;
    if (!Number.isFinite(v) || v < min || v > max) throw new Error(`Naira per point must be between ₦${min} and ₦${max}`);
    next.nairaPerPoint = Math.round(v * 10000) / 10000;
  }

  const doc = await Setting.findOneAndUpdate(
    { key: 'economy' },
    { $set: { value: next, updatedBy: adminId } },
    { upsert: true, new: true }
  ).lean();
  cache = { ...normalize(doc.value), updatedAt: doc.updatedAt };
  cachedAt = Date.now();
  return cache;
}
