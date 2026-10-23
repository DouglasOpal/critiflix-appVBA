import { User } from '../models/User.js';
import { Subscription } from '../models/Subscription.js';
import { Cashout } from '../models/Cashout.js';
import { PLANS, PAYOUT_POOL_RATIO, campaignPool, getPlan } from '../points.js';
import { getEconomy } from './settings.js';

// Activate a creator's CAMPAIGN package (simulated path + webhook). Buying a plan
// tops up the creator's points pool by campaignPool(plan) at the current
// Naira-per-point rate; the pool then depletes as critics earn from their
// titles. Not a monthly subscription.
export async function activatePlan(user, plan, { reference = null, providerRef = null } = {}) {
  const econ = await getEconomy();
  const pool = campaignPool(plan, econ.nairaPerPoint);
  user.plan = plan;
  user.campaignRemaining = (user.campaignRemaining || 0) + pool;
  user.campaignPool = user.campaignRemaining; // denominator resets to full after a top-up
  user.planRenews = null;
  await user.save();

  await Subscription.updateMany(
    { creator: user._id, status: { $in: ['active', 'pending'] } },
    { $set: { status: 'canceled', canceledAt: new Date() } }
  );
  await Subscription.create({
    creator: user._id, plan, price: getPlan(plan).price, status: 'active',
    provider: providerRef ? 'paystack' : 'manual', providerRef, reference,
  });
  return { campaignPool: user.campaignPool, campaignRemaining: user.campaignRemaining };
}

// Webhook: a checkout succeeded -> activate the matching pending subscription.
export async function activateSubscriptionByReference(reference, providerRef) {
  const sub = await Subscription.findOne({ reference });
  if (!sub || sub.status === 'active') return null;
  const user = await User.findById(sub.creator);
  if (!user) return null;
  await activatePlan(user, sub.plan, { reference, providerRef });
  return sub;
}

// Webhook: a transfer settled / failed -> update the cashout.
export async function settleCashout({ reference, transferCode }, outcome) {
  const q = transferCode ? { transferCode } : { providerRef: reference };
  const cashout = await Cashout.findOne(q);
  if (!cashout) return null;
  if (outcome === 'success') {
    cashout.status = 'paid';
  } else {
    cashout.status = 'failed';
    cashout.failureReason = 'Transfer failed at provider';
    // refund the points so the critic isn't out of pocket
    const user = await User.findById(cashout.user);
    if (user) { user.points += cashout.points; await user.save(); }
  }
  await cashout.save();
  return cashout;
}

// ---- Payout economics -------------------------------------------------------
// Only PAYOUT_POOL_RATIO (50%) of subscription revenue funds critic payouts.

export async function getSubscriptionRevenue() {
  const active = await Subscription.find({ status: 'active' }).select('plan price').lean();
  return active.reduce((sum, s) => sum + (s.price || getPlan(s.plan)?.price || 0), 0);
}

export async function getPayoutPool() {
  const revenue = await getSubscriptionRevenue();
  return Math.round(revenue * PAYOUT_POOL_RATIO);
}

// ₦ already committed to payouts (paid + in-flight, excluding rejected/failed).
export async function getAllocatedPayout() {
  const rows = await Cashout.find({ status: { $in: ['review', 'cleared', 'processing', 'paid'] } }).select('amount').lean();
  return rows.reduce((sum, c) => sum + (c.amount || 0), 0);
}

export async function getPayoutBudget() {
  const [pool, allocated] = await Promise.all([getPayoutPool(), getAllocatedPayout()]);
  return { pool, allocated, remaining: Math.max(0, pool - allocated) };
}
