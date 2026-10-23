import { PointsLedger } from '../models/PointsLedger.js';
import { getEconomy } from './settings.js';

// Points economy with an earning benchmark:
//   Critics earn points from their very first watch/review. The first
//   `earnThreshold` lifetime points (default 1000, set in the admin console)
//   fill a non-cash benchmark. Every point after that is cashable and is worth
//   `nairaPerPoint` Naira. `user.points` is the cashable balance only.
//
// If an admin lowers the benchmark, critics who already banked more than the
// new value get the excess released into their cashable balance (see
// releaseExcessBenchmark). Raising it never takes back points already cashable;
// future earnings simply top the benchmark up to the new level first.
//
// Caller is responsible for await user.save() afterward (batched).

export async function releaseExcessBenchmark(user, econ) {
  const e = econ || (await getEconomy());
  const excess = (user.benchmarkPoints || 0) - e.earnThreshold;
  if (excess <= 0) return 0;
  user.benchmarkPoints = e.earnThreshold;
  user.points = (user.points || 0) + excess;
  await PointsLedger.create({
    user: user._id, type: 'adjustment', points: excess, benchmark: -excess,
    ref: 'Benchmark lowered — points released to cashable balance', balanceAfter: user.points,
  });
  return excess;
}

// Returns { awarded, toBenchmark, cashable } — awarded is the full amount earned.
export async function award(user, type, points, ref, titleId = null) {
  if (!points || points <= 0) return { awarded: 0, toBenchmark: 0, cashable: 0 };
  const econ = await getEconomy();
  await releaseExcessBenchmark(user, econ);

  const room = Math.max(0, econ.earnThreshold - (user.benchmarkPoints || 0));
  const toBenchmark = Math.min(points, room);
  const cashable = points - toBenchmark;

  user.benchmarkPoints = (user.benchmarkPoints || 0) + toBenchmark;
  user.lifetimePoints = (user.lifetimePoints || 0) + points;
  user.points = (user.points || 0) + cashable;

  await PointsLedger.create({
    user: user._id, type, points, benchmark: toBenchmark, ref: ref || '', title: titleId, balanceAfter: user.points,
  });
  return { awarded: points, toBenchmark, cashable };
}

// Snapshot used by GET /me/points and the review response.
export function pointsSummary(user, econ) {
  const earned = Math.min(user.benchmarkPoints || 0, econ.earnThreshold);
  const balance = user.points || 0;
  return {
    balance,
    lifetime: user.lifetimePoints || 0,
    nairaPerPoint: econ.nairaPerPoint,
    nairaValue: Math.round(balance * econ.nairaPerPoint * 100) / 100,
    benchmark: {
      threshold: econ.earnThreshold,
      earned,
      remaining: Math.max(0, econ.earnThreshold - earned),
      reached: earned >= econ.earnThreshold,
    },
  };
}
