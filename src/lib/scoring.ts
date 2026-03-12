// ============================================================
// AMBASSADOR SCORING ENGINE
// Calculates the 0–10 Ambassador Score across 5 dimensions
// ============================================================

import type { Creator, CreatorScore, ScoringWeights } from '@/types';

/** Default scoring weights */
export const DEFAULT_WEIGHTS: ScoringWeights = {
  content_quality: 0.25,
  engagement: 0.25,
  audience_size: 0.15,
  reels_focus: 0.20,
  brand_fit: 0.15,
};

// ============================================================
// DIMENSION 1: Engagement Score (0–10)
// Based on engagement rate relative to follower count
// ============================================================
export function scoreEngagement(creator: Creator): number {
  const rate = creator.engagement_rate ?? 0;

  // Engagement rate benchmarks for Instagram:
  // < 1%    = Poor
  // 1–3%    = Average
  // 3–6%    = Good
  // 6–10%   = Excellent
  // > 10%   = Outstanding (or suspicious — flag for review)
  if (rate >= 10) return 9.5; // Cap at 9.5 — extremely high may be fake
  if (rate >= 6) return 8 + ((rate - 6) / 4) * 2;
  if (rate >= 3) return 6 + ((rate - 3) / 3) * 2;
  if (rate >= 1) return 3 + ((rate - 1) / 2) * 3;
  return rate * 3; // 0–1% maps to 0–3
}

// ============================================================
// DIMENSION 2: Audience Size Score (0–10)
// Sweet spot for micro-to-mid creators (1K–100K)
// ============================================================
export function scoreAudienceSize(
  followers: number,
  minFollowers: number = 1000,
  maxFollowers: number = 100000
): number {
  if (followers < 500) return 0;           // Too small
  if (followers < minFollowers) return 2;   // Below target range

  // Sweet spot: 5K–50K gets highest scores
  if (followers >= 5000 && followers <= 50000) {
    // Peak score at ~15K followers
    const peak = 15000;
    const distance = Math.abs(followers - peak) / peak;
    return Math.max(7, 10 - distance * 3);
  }

  if (followers <= maxFollowers) return 6;  // In range but outside sweet spot
  if (followers <= 500000) return 4;        // Large account — harder to partner
  return 2;                                  // Mega account — unlikely to respond
}

// ============================================================
// DIMENSION 3: Reels Focus Score (0–10)
// Rewards creators who prioritise video/reel content
// ============================================================
export function scoreReelsFocus(creator: Creator): number {
  const reelsPercent = creator.reels_percentage ?? 0;
  const avgViews = creator.avg_reel_views ?? 0;

  // Base score from reels percentage
  let score = 0;
  if (reelsPercent >= 80) score = 9;
  else if (reelsPercent >= 60) score = 7;
  else if (reelsPercent >= 40) score = 5;
  else if (reelsPercent >= 20) score = 3;
  else score = 1;

  // Bonus for strong reel views (relative to followers)
  const viewsRatio = creator.followers_count > 0
    ? avgViews / creator.followers_count
    : 0;
  if (viewsRatio > 0.5) score = Math.min(10, score + 1);

  return score;
}

// ============================================================
// DIMENSION 4: Brand Fit Score (0–10)
// Based on hashtag overlap with niche hashtags
// ============================================================
export function scoreBrandFit(
  creator: Creator,
  nicheHashtags: string[],
  keywords: string[]
): number {
  const creatorTags = (creator.recent_hashtags ?? []).map(t => t.toLowerCase());
  const bio = (creator.bio ?? '').toLowerCase();

  // Hashtag overlap score
  const nicheSet = new Set(nicheHashtags.map(h => h.toLowerCase()));
  const matchingTags = creatorTags.filter(t => nicheSet.has(t));
  const tagOverlap = nicheSet.size > 0
    ? matchingTags.length / Math.min(nicheSet.size, 5)
    : 0;

  // Keyword match in bio
  const keywordMatches = keywords.filter(kw => bio.includes(kw.toLowerCase()));
  const bioScore = keywords.length > 0
    ? keywordMatches.length / Math.min(keywords.length, 5)
    : 0;

  // Combined: 60% hashtag overlap + 40% bio relevance
  const combined = (tagOverlap * 0.6 + bioScore * 0.4) * 10;
  return Math.min(10, Math.round(combined * 10) / 10);
}

// ============================================================
// DIMENSION 5: Content Quality Score (0–10)
// Placeholder — requires AI vision analysis in production
// For MVP: estimate from engagement signals
// ============================================================
export function scoreContentQuality(creator: Creator): number {
  // MVP heuristic: high engagement + high reel views = likely good content
  // In production, replace with AI vision API analysis
  const engagementSignal = Math.min(10, (creator.engagement_rate ?? 0) * 1.5);
  const viewsSignal = creator.followers_count > 0
    ? Math.min(10, ((creator.avg_reel_views ?? 0) / creator.followers_count) * 15)
    : 0;

  // Average of signals, capped at 8 for MVP (AI analysis unlocks 8–10)
  return Math.min(8, (engagementSignal + viewsSignal) / 2);
}

// ============================================================
// OVERALL AMBASSADOR SCORE
// Weighted average of all 5 dimensions
// ============================================================
export function calculateOverallScore(
  creator: Creator,
  nicheHashtags: string[],
  keywords: string[],
  weights: ScoringWeights = DEFAULT_WEIGHTS
): CreatorScore {
  const content_quality_score = scoreContentQuality(creator);
  const engagement_score = scoreEngagement(creator);
  const audience_size_score = scoreAudienceSize(creator.followers_count);
  const reels_focus_score = scoreReelsFocus(creator);
  const brand_fit_score = scoreBrandFit(creator, nicheHashtags, keywords);

  const overall_score = Math.round((
    content_quality_score * weights.content_quality +
    engagement_score * weights.engagement +
    audience_size_score * weights.audience_size +
    reels_focus_score * weights.reels_focus +
    brand_fit_score * weights.brand_fit
  ) * 10) / 10;

  return {
    id: '',  // Set by database
    creator_id: creator.id,
    batch_id: '',  // Set when saving
    content_quality_score,
    engagement_score,
    audience_size_score,
    reels_focus_score,
    brand_fit_score,
    overall_score,
    scored_at: new Date().toISOString(),
  };
}

/** Get a human-readable label for the overall score */
export function getScoreLabel(score: number): string {
  if (score >= 8.5) return 'Outstanding';
  if (score >= 7) return 'Excellent';
  if (score >= 5.5) return 'Good';
  if (score >= 4) return 'Average';
  if (score >= 2.5) return 'Below Average';
  return 'Poor';
}

/** Get a colour for the score (Tailwind classes) */
export function getScoreColor(score: number): string {
  if (score >= 8) return 'text-emerald-600 bg-emerald-50';
  if (score >= 6) return 'text-blue-600 bg-blue-50';
  if (score >= 4) return 'text-amber-600 bg-amber-50';
  return 'text-red-600 bg-red-50';
}
