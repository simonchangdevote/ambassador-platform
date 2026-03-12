-- ============================================================
-- MIGRATION 002: Add social media links & profile verification
-- Run this in Supabase SQL Editor AFTER migration 001
-- ============================================================

-- Add social media link columns to creators table
ALTER TABLE creators ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS facebook_url TEXT;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS tiktok_url TEXT;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS youtube_url TEXT;

-- Add profile verification columns
ALTER TABLE creators ADD COLUMN IF NOT EXISTS is_profile_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- Auto-generate Instagram URL from username if not set
UPDATE creators
SET instagram_url = 'https://www.instagram.com/' || instagram_username
WHERE instagram_url IS NULL;
