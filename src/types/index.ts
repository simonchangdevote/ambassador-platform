// ============================================================
// AMBASSADOR OUTREACH PLATFORM — Type Definitions
// ============================================================

/** Status of a creator in the outreach pipeline */
export type OutreachStatus =
  | 'discovered'    // Found by scouting
  | 'scored'        // Evaluated and scored
  | 'presented'     // Shown on dashboard for review
  | 'approved'      // User approved — ready for outreach
  | 'skipped'       // User skipped this candidate
  | 'dm_drafted'    // DM message generated
  | 'dm_sent'       // DM was manually sent by user
  | 'replied'       // Creator replied
  | 'interested'    // Creator expressed interest
  | 'declined'      // Creator declined
  | 'no_response'   // No response after follow-up window
  | 'onboarded';    // Successfully onboarded as ambassador

/** A potential ambassador/creator profile */
export interface Creator {
  id: string;
  instagram_username: string;
  instagram_id?: string;
  full_name?: string;
  bio?: string;
  profile_pic_url?: string;
  followers_count: number;
  following_count: number;
  posts_count: number;
  is_verified: boolean;
  is_business_account: boolean;
  category?: string;

  // Computed metrics
  engagement_rate?: number;
  avg_reel_views?: number;
  reels_percentage?: number;  // % of recent posts that are reels
  recent_hashtags?: string[];

  // Metadata
  discovered_at: string;
  last_checked_at: string;
  source_hashtags?: string[];
}

/** Scoring breakdown for a creator */
export interface CreatorScore {
  id: string;
  creator_id: string;
  batch_id: string;

  // Individual scores (0–10)
  content_quality_score: number;
  engagement_score: number;
  audience_size_score: number;
  reels_focus_score: number;
  brand_fit_score: number;

  // Weighted overall score (0–10)
  overall_score: number;

  // Scoring metadata
  scoring_notes?: string;
  scored_at: string;
}

/** Weekly scouting batch */
export interface WeeklyBatch {
  id: string;
  week_number: number;
  year: number;
  start_date: string;
  end_date: string;
  status: 'scouting' | 'scoring' | 'review' | 'completed';
  candidates_found: number;
  candidates_approved: number;
  candidates_skipped: number;
  created_at: string;
}

/** Outreach record for a creator */
export interface OutreachRecord {
  id: string;
  creator_id: string;
  batch_id: string;
  status: OutreachStatus;
  dm_message?: string;
  dm_sent_at?: string;
  response_received_at?: string;
  response_notes?: string;
  follow_up_date?: string;
  created_at: string;
  updated_at: string;
}

/** Dashboard candidate card data */
export interface CandidateCard {
  creator: Creator;
  score: CreatorScore;
  outreach: OutreachRecord;
  example_reels?: ReelPreview[];
  top_hashtags: string[];
  rank: number;
}

/** Reel preview data */
export interface ReelPreview {
  id: string;
  thumbnail_url: string;
  video_url?: string;
  views_count: number;
  likes_count: number;
  comments_count: number;
  caption?: string;
  posted_at: string;
}

/** Scoring weights configuration */
export interface ScoringWeights {
  content_quality: number;  // default: 0.25
  engagement: number;       // default: 0.25
  audience_size: number;    // default: 0.15
  reels_focus: number;      // default: 0.20
  brand_fit: number;        // default: 0.15
}

/** Brand configuration */
export interface BrandConfig {
  id: string;
  name: string;
  niche_hashtags: string[];
  keywords: string[];
  target_follower_min: number;
  target_follower_max: number;
  target_engagement_min: number;
  outreach_message_template: string;
  scoring_weights: ScoringWeights;
}

/** Dashboard statistics */
export interface DashboardStats {
  total_discovered: number;
  total_approved: number;
  total_dms_sent: number;
  total_replies: number;
  total_interested: number;
  total_onboarded: number;
  response_rate: number;
  interest_rate: number;
  current_week_candidates: number;
}
