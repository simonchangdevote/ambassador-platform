// ============================================================
// AMBASSADOR SCORING ENGINE — Simplified 3-Dimension Ranking
// Hard filters handle niche/location/followers/reels
// Scoring only RANKS creators who already passed all filters
// ============================================================

import type { Creator, CreatorScore } from '@/types';

// Fixed internal weights — not configurable, no sliders needed
const WEIGHTS = {
  engagement: 0.40,    // Most important: real audience connection
  audience_size: 0.30, // Sweet spot followers
  reels_activity: 0.30,// Video content production
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
// DIMENSION 2: Audience Size Score (0–10)
// Sweet spot for micro-to-mid creators
// ============================================================
export function scoreAudienceSize(followers: number): number {
  if (followers < 500) return 0;
  if (followers < 1000) return 2;

  // Sweet spot: 5K–50K gets highest scores
  if (followers >= 5000 && followers <= 50000) {
    const peak = 15000;
    const distance = Math.abs(followers - peak) / peak;
    return Math.max(7, 10 - distance * 3);
  }

  if (followers <= 100000) return 6;
  if (followers <= 500000) return 4;
  return 2;
}

// ============================================================
// DIMENSION 3: Reels Activity Score (0–10)
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
// OVERALL AMBASSADOR SCORE
// Weighted average of the 3 dimensions
// ============================================================
export function calculateOverallScore(
  creator: Creator,
  _nicheHashtags: string[] = [],
  _keywords: string[] = []
): CreatorScore {
  const engagement_score = scoreEngagement(creator);
  const audience_size_score = scoreAudienceSize(creator.followers_count);
  const reels_focus_score = scoreReelsActivity(creator);

  // brand_fit and content_quality set to 0 — handled by hard filters now
  const content_quality_score = 0;
  const brand_fit_score = 0;

  const overall_score = Math.round((
    engagement_score * WEIGHTS.engagement +
    audience_size_score * WEIGHTS.audience_size +
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
