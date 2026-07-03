// Points economy — single source of truth.
export const POINTS = {
  review: 80,      // publish a review
  rating: 20,      // leave a rating
  referral: 250,   // referred critic joins & reviews
};

// ---- Point → cash conversion: 1 point = ₦0.2 ----
export const REDEEM_RATE = 0.2;      // 1 point -> ₦0.2
export const CASHOUT_FEE = 25;       // flat ₦ fee per cashout

// ---- Earning + cashout eligibility: 50 watched-&-reviewed titles ----
export const EARN_MIN_FOLLOWERS = 0;
export const EARN_MIN_REVIEWS = 50;

// ---- Watch gate ----
export const WATCH_REQUIRED_PCT = 0.75;

// ---- Payout pool: only half of subscription revenue funds critic payouts ----
export const PAYOUT_POOL_RATIO = 0.5;

// ---- Subscription plans are CAMPAIGN PACKAGES, not monthly ----
// Buying a plan funds a points campaign of pool = (0.5 * price) / 0.2 = 2.5 * price.
// Critics who watch/review the creator's titles draw points from this pool; when it
// runs out the campaign is exhausted and the creator must renew (buy again) or
// upgrade to a bigger package. The FREE plan funds nothing (0 points).
export const PLANS = {
  free:    { id: 'free',    name: 'Free',    price: 0,     activeTitles: 3,        priority: 1, featured: false, canEdit: false, analytics: false, oneTime: true, maxLifetimeUploads: 3 },
  curious: { id: 'curious', name: 'Curious', price: 7500,  activeTitles: 5,        priority: 2, featured: false, canEdit: true,  analytics: true },
  growth:  { id: 'growth',  name: 'Growth',  price: 30000, activeTitles: 15,       priority: 3, featured: true,  canEdit: true,  analytics: true },
  premium: { id: 'premium', name: 'Premium', price: 75000, activeTitles: Infinity, priority: 4, featured: true,  canEdit: true,  analytics: true },
};

// Legacy plan ids (from the old monthly model) mapped onto the new campaign tiers.
const LEGACY = { starter: 'free', pro: 'curious', studio: 'growth' };
export function normalizePlan(planId) {
  if (PLANS[planId]) return planId;
  return LEGACY[planId] || 'free';
}
export function getPlan(planId) {
  return PLANS[normalizePlan(planId)];
}

// Points a campaign package funds (shared across the creator's titles).
export function campaignPool(planId) {
  const price = getPlan(planId).price || 0;
  return Math.round((0.5 * price) / REDEEM_RATE); // = 2.5 * price
}

// ---- Per-title watch points (max 50): plan base + runtime + boost(0–15). Free = 0.
export const TITLE_POINTS = {
  max: 50,
  planBase: { free: 0, curious: 15, growth: 22, premium: 30 },
  perMinute: 0.25, lengthCapMin: 60,   // runtime bonus max +15
  perBoost: 5, boostCap: 3,            // boost 1..3 => +5..+15
};
export function titleWatchPoints(planId, runtimeMinutes = 0, boost = 0) {
  const plan = normalizePlan(planId);
  if (plan === 'free') return 0;
  const base = TITLE_POINTS.planBase[plan] ?? 0;
  const runtimeBonus = Math.min(Math.max(runtimeMinutes, 0), TITLE_POINTS.lengthCapMin) * TITLE_POINTS.perMinute;
  const boostBonus = Math.min(Math.max(boost, 0), TITLE_POINTS.boostCap) * TITLE_POINTS.perBoost;
  return Math.round(Math.max(0, Math.min(TITLE_POINTS.max, base + runtimeBonus + boostBonus)));
}

export function runtimeToMinutes(runtime) {
  if (!runtime) return 0;
  const s = String(runtime).toLowerCase();
  const h = s.match(/(\d+)\s*h/);
  const m = s.match(/(\d+)\s*m/);
  if (h || m) return (h ? +h[1] : 0) * 60 + (m ? +m[1] : 0);
  const n = s.match(/\d+/);
  return n ? +n[0] : 0;
}

export function isEligibleToEarn(user) {
  return (user?.reviewCount || 0) >= EARN_MIN_REVIEWS;
}
export function planCan(planId, feature) {
  return !!getPlan(planId)?.[feature];
}
