// ============================================================
// AMBASSADOR SCORING ENGINE — 2-Dimension Quality Ranking
// Hard filters handle niche/location/followers/reels
// Scoring only RANKS creators who already passed all filters
// Audience size is NOT scored — it's shown as a Reach Label instead
// ============================================================

import type { Creator, CreatorScore } from '@/types';

// Fixed internal weights — not configurable, no sliders needed
const WEIGHTS = {
  engagement: 0.55,      // Most important: real audience connection
  reels_activity: 0.45,  // Video content production
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
  // > 10%   = Outstanding (or suspicious)
  if (rate >= 10) return 9.5; // Cap — extremely high may be fake
  if (rate >= 6) return 8 + ((rate - 6) / 4) * 2;
  if (rate >= 3) return 6 + ((rate - 3) / 3) * 2;
  if (rate >= 1) return 3 + ((rate - 1) / 2) * 3;
  return rate * 3; // 0–1% maps to 0–3
}

// ============================================================
// DIMENSION 2: Reels Activity Score (0–10)
// Rewards creators who produce video content
// ============================================================
export function scoreReelsActivity(creator: Creator): number {
  const reelsPercent = creator.reels_percentage ?? 0;
  const avgViews = creator.avg_reel_views ?? 0;

  // Base score from reels percentage
  let score = 0;
  if (reelsPercent >= 80) score = 9;
  else if (reelsPercent >= 60) score = 7;
  else if (reelsPercent >= 40) score = 5;
  else if (reelsPercent >= 20) score = 3;
  else if (reelsPercent > 0) score = 2;
  else score = 1; // Minimum — they passed the hard filter so they have some reels

  // Bonus for strong reel views relative to followers
  const viewsRatio = creator.followers_count > 0
    ? avgViews / creator.followers_count
    : 0;
  if (viewsRatio > 0.5) score = Math.min(10, score + 1);

  return score;
}

// ============================================================
// REACH LABEL — Based on where followers sit in the filter range
// Not a score, just a contextual label
// ============================================================
export type ReachLabel = 'High Reach' | 'Mid Reach' | 'Emerging Reach';

export function getReachLabel(
  followers: number,
  minFilter: number,
  maxFilter: number
): ReachLabel {
  const range = maxFilter - minFilter;
  if (range <= 0) return 'Mid Reach';

  const position = (followers - minFilter) / range;

  if (position >= 0.66) return 'High Reach';
  if (position >= 0.33) return 'Mid Reach';
  return 'Emerging Reach';
}

/** Get Tailwind classes for reach label styling */
export function getReachLabelColor(label: ReachLabel): string {
  switch (label) {
    case 'High Reach':
      return 'text-purple-700 bg-purple-50 border-purple-200';
    case 'Mid Reach':
      return 'text-blue-700 bg-blue-50 border-blue-200';
    case 'Emerging Reach':
      return 'text-teal-700 bg-teal-50 border-teal-200';
  }
}

// ============================================================
// LEGACY: Audience Size Score — kept for DB compatibility
// Returns 0 since audience size is no longer part of scoring
// ============================================================
export function scoreAudienceSize(_followers: number): number {
  return 0;
}

// ============================================================
// OVERALL AMBASSADOR SCORE
// Weighted average of 2 dimensions: Engagement + Reels
// ============================================================
export function calculateOverallScore(
  creator: Creator,
  _nicheHashtags: string[] = [],
  _keywords: string[] = []
): CreatorScore {
  const engagement_score = scoreEngagement(creator);
  const reels_focus_score = scoreReelsActivity(creator);

  // Audience size no longer scored — shown as Reach Label instead
  const audience_size_score = 0;

  // brand_fit and content_quality set to 0 — handled by hard filters now
  const content_quality_score = 0;
  const brand_fit_score = 0;

  const overall_score = Math.round((
    engagement_score * WEIGHTS.engagement +
    reels_focus_score * WEIGHTS.reels_activity
  ) * 10) / 10;

  return {
    id: '',
    creator_id: creator.id,
    batch_id: '',
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
