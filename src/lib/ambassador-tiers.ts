// ============================================================
// AMBASSADOR TIERS — Cost categorisation based on followers
// Fixed thresholds, editable costs via Settings
// ============================================================

export interface AmbassadorTier {
  name: string;
  label: string;
  minFollowers: number;
  maxFollowers: number | null; // null = no upper limit
  defaultCost: number;
  color: string; // Tailwind classes for badge styling
}

// Fixed tier thresholds (follower boundaries never change)
export const TIER_THRESHOLDS = {
  HIGH_PROFILE_MIN: 50000,
  BRAND_AMBASSADOR_MIN: 5000,
} as const;

// Default costs (can be overridden in Settings)
export const DEFAULT_TIER_COSTS = {
  high_profile: 300,
  brand_ambassador: 200,
  community_ambassador: 50,
} as const;

export type TierKey = 'high_profile' | 'brand_ambassador' | 'community_ambassador';

export interface TierCosts {
  high_profile: number;
  brand_ambassador: number;
  community_ambassador: number;
}

/**
 * Get the tier for a creator based on their follower count
 */
export function getAmbassadorTier(
  followers: number,
  costs?: Partial<TierCosts>
): { key: TierKey; name: string; cost: number; color: string } {
  const tierCosts: TierCosts = {
    high_profile: costs?.high_profile ?? DEFAULT_TIER_COSTS.high_profile,
    brand_ambassador: costs?.brand_ambassador ?? DEFAULT_TIER_COSTS.brand_ambassador,
    community_ambassador: costs?.community_ambassador ?? DEFAULT_TIER_COSTS.community_ambassador,
  };

  if (followers >= TIER_THRESHOLDS.HIGH_PROFILE_MIN) {
    return {
      key: 'high_profile',
      name: 'High Profile',
      cost: tierCosts.high_profile,
      color: 'text-amber-700 bg-amber-50 border-amber-200',
    };
  }

  if (followers >= TIER_THRESHOLDS.BRAND_AMBASSADOR_MIN) {
    return {
      key: 'brand_ambassador',
      name: 'Brand Ambassador',
      cost: tierCosts.brand_ambassador,
      color: 'text-blue-700 bg-blue-50 border-blue-200',
    };
  }

  return {
    key: 'community_ambassador',
    name: 'Community Ambassador',
    cost: tierCosts.community_ambassador,
    color: 'text-teal-700 bg-teal-50 border-teal-200',
  };
}

/**
 * Calculate total pipeline cost for a set of creators
 * Excludes skipped and declined statuses
 */
export function calculatePipelineCost(
  creators: Array<{ followers_count: number; status: string }>,
  costs?: Partial<TierCosts>
): { total: number; breakdown: Record<TierKey, { count: number; subtotal: number }> } {
  const EXCLUDED_STATUSES = ['skipped', 'declined'];

  const breakdown: Record<TierKey, { count: number; subtotal: number }> = {
    high_profile: { count: 0, subtotal: 0 },
    brand_ambassador: { count: 0, subtotal: 0 },
    community_ambassador: { count: 0, subtotal: 0 },
  };

  let total = 0;

  for (const creator of creators) {
    if (EXCLUDED_STATUSES.includes(creator.status)) continue;

    const tier = getAmbassadorTier(creator.followers_count, costs);
    breakdown[tier.key].count++;
    breakdown[tier.key].subtotal += tier.cost;
    total += tier.cost;
  }

  return { total, breakdown };
}
