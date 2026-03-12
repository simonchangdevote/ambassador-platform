-- ============================================================
-- AMBASSADOR OUTREACH PLATFORM — Database Schema
-- Run this migration in your Supabase SQL Editor
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. BRAND CONFIGURATION
-- Stores brand settings, target criteria, and scoring weights
-- ============================================================
CREATE TABLE brand_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  niche_hashtags TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}',
  target_follower_min INTEGER DEFAULT 1000,
  target_follower_max INTEGER DEFAULT 100000,
  target_engagement_min NUMERIC(5,2) DEFAULT 2.0,
  outreach_message_template TEXT,
  scoring_weights JSONB DEFAULT '{
    "content_quality": 0.25,
    "engagement": 0.25,
    "audience_size": 0.15,
    "reels_focus": 0.20,
    "brand_fit": 0.15
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. CREATORS
-- Discovered Instagram creator profiles
-- ============================================================
CREATE TABLE creators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instagram_username TEXT UNIQUE NOT NULL,
  instagram_id TEXT,
  full_name TEXT,
  bio TEXT,
  profile_pic_url TEXT,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  posts_count INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  is_business_account BOOLEAN DEFAULT FALSE,
  category TEXT,

  -- Computed engagement metrics
  engagement_rate NUMERIC(6,3),
  avg_reel_views INTEGER,
  reels_percentage NUMERIC(5,2),
  recent_hashtags TEXT[] DEFAULT '{}',

  -- Source tracking
  source_hashtags TEXT[] DEFAULT '{}',
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  last_checked_at TIMESTAMPTZ DEFAULT NOW(),

  -- Indexes for filtering
  CONSTRAINT followers_positive CHECK (followers_count >= 0)
);

CREATE INDEX idx_creators_username ON creators(instagram_username);
CREATE INDEX idx_creators_followers ON creators(followers_count);
CREATE INDEX idx_creators_engagement ON creators(engagement_rate);

-- ============================================================
-- 3. WEEKLY BATCHES
-- Groups candidates into weekly scouting rounds
-- ============================================================
CREATE TABLE weekly_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'scouting'
    CHECK (status IN ('scouting', 'scoring', 'review', 'completed')),
  candidates_found INTEGER DEFAULT 0,
  candidates_approved INTEGER DEFAULT 0,
  candidates_skipped INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(week_number, year)
);

-- ============================================================
-- 4. CREATOR SCORES
-- Scoring breakdown per creator per batch
-- ============================================================
CREATE TABLE creator_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES weekly_batches(id) ON DELETE CASCADE,

  -- Individual dimension scores (0–10)
  content_quality_score NUMERIC(4,2) DEFAULT 0
    CHECK (content_quality_score BETWEEN 0 AND 10),
  engagement_score NUMERIC(4,2) DEFAULT 0
    CHECK (engagement_score BETWEEN 0 AND 10),
  audience_size_score NUMERIC(4,2) DEFAULT 0
    CHECK (audience_size_score BETWEEN 0 AND 10),
  reels_focus_score NUMERIC(4,2) DEFAULT 0
    CHECK (reels_focus_score BETWEEN 0 AND 10),
  brand_fit_score NUMERIC(4,2) DEFAULT 0
    CHECK (brand_fit_score BETWEEN 0 AND 10),

  -- Weighted overall (0–10)
  overall_score NUMERIC(4,2) DEFAULT 0
    CHECK (overall_score BETWEEN 0 AND 10),

  scoring_notes TEXT,
  scored_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(creator_id, batch_id)
);

CREATE INDEX idx_scores_overall ON creator_scores(overall_score DESC);
CREATE INDEX idx_scores_batch ON creator_scores(batch_id);

-- ============================================================
-- 5. OUTREACH RECORDS
-- Tracks the full outreach pipeline per creator
-- ============================================================
CREATE TABLE outreach_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES weekly_batches(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'discovered'
    CHECK (status IN (
      'discovered', 'scored', 'presented', 'approved', 'skipped',
      'dm_drafted', 'dm_sent', 'replied', 'interested',
      'declined', 'no_response', 'onboarded'
    )),
  dm_message TEXT,
  dm_sent_at TIMESTAMPTZ,
  response_received_at TIMESTAMPTZ,
  response_notes TEXT,
  follow_up_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(creator_id, batch_id)
);

CREATE INDEX idx_outreach_status ON outreach_records(status);
CREATE INDEX idx_outreach_batch ON outreach_records(batch_id);

-- ============================================================
-- 6. REEL PREVIEWS
-- Sample reels for each creator (for dashboard display)
-- ============================================================
CREATE TABLE reel_previews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  instagram_reel_id TEXT,
  thumbnail_url TEXT,
  video_url TEXT,
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  caption TEXT,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reels_creator ON reel_previews(creator_id);

-- ============================================================
-- 7. ACTIVITY LOG
-- Audit trail for all platform actions
-- ============================================================
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_created ON activity_log(created_at DESC);

-- ============================================================
-- SEED: Default brand configuration
-- ============================================================
INSERT INTO brand_config (name, niche_hashtags, keywords, outreach_message_template)
VALUES (
  'Your Brand',
  ARRAY['spearfishing', 'spearo', 'spearfishingaustralia', 'australianspearfishing',
        'divingaustralia', 'freediving', 'underwaterhunting', 'oceanlife',
        'reeflife', 'spearfishinglife', 'catchandcook'],
  ARRAY['spearfishing', 'freediving', 'diving', 'ocean', 'reef',
        'australia', 'cairns', 'queensland', 'great barrier reef',
        'underwater', 'fishing', 'catch and cook'],
  E'Hey! We''ve been checking out your content and love what you''re doing.\n\nWe''re always on the lookout for passionate creators in the ocean/spearfishing/diving space and we''d love to explore working together.\n\nWe''re particularly looking for creators who enjoy making reels and video content, and we''d be keen to chat about sending you some gear and building a partnership.\n\nLet us know if you''d be interested!'
);
