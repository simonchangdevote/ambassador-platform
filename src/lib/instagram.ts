// ============================================================
// INSTAGRAM DATA LAYER
// Handles fetching creator data from Instagram via third-party APIs
//
// IMPORTANT: Instagram's official API does NOT support:
// - Searching by hashtag (without approved Facebook app)
// - Sending DMs programmatically
// - Accessing non-business account metrics
//
// This module uses third-party data providers.
// Recommended: Apify Instagram Scraper (pay-per-use, no monthly fee)
// Alternative: RapidAPI Instagram endpoints
// ============================================================

import type { Creator, ReelPreview } from '@/types';

// ============================================================
// OPTION A: Apify Instagram Scraper
// https://apify.com/apify/instagram-hashtag-scraper
// ============================================================

interface ApifyHashtagResult {
  ownerUsername: string;
  ownerFullName?: string;
  ownerId: string;
  caption: string;
  likesCount: number;
  commentsCount: number;
  videoViewCount?: number;
  isVideo: boolean;
  hashtags: string[];
  timestamp: string;
  displayUrl: string;
  videoUrl?: string;
}

/**
 * Scout creators by searching hashtags via Apify
 * Returns raw post data — needs aggregation into creator profiles
 */
export async function scoutByHashtags(
  hashtags: string[],
  postsPerHashtag: number = 50
): Promise<ApifyHashtagResult[]> {
  const apiToken = process.env.APIFY_API_TOKEN;
  if (!apiToken) throw new Error('APIFY_API_TOKEN not configured');

  // TODO: Implement Apify actor run
  // 1. Start the Instagram Hashtag Scraper actor
  // 2. Wait for results
  // 3. Return parsed results
  //
  // Example Apify API call:
  // POST https://api.apify.com/v2/acts/apify~instagram-hashtag-scraper/runs
  // Body: { hashtags, resultsLimit: postsPerHashtag }

  console.log(`[Scout] Searching ${hashtags.length} hashtags, ${postsPerHashtag} posts each`);

  // Placeholder — replace with actual API call
  return [];
}

/**
 * Fetch detailed profile data for a specific username
 */
export async function fetchCreatorProfile(username: string): Promise<Creator | null> {
  const apiToken = process.env.APIFY_API_TOKEN;
  if (!apiToken) throw new Error('APIFY_API_TOKEN not configured');

  // TODO: Implement Apify Profile Scraper
  // POST https://api.apify.com/v2/acts/apify~instagram-profile-scraper/runs
  // Body: { usernames: [username] }

  console.log(`[Scout] Fetching profile: @${username}`);
  return null;
}

/**
 * Fetch recent reels for a creator
 */
export async function fetchCreatorReels(
  username: string,
  limit: number = 12
): Promise<ReelPreview[]> {
  // TODO: Implement via Apify or RapidAPI
  console.log(`[Scout] Fetching ${limit} reels for @${username}`);
  return [];
}

// ============================================================
// AGGREGATION: Convert raw post data into Creator profiles
// ============================================================

/**
 * Aggregate raw hashtag posts into unique creator profiles
 * Calculates engagement rate, reels percentage, etc.
 */
export function aggregateCreatorProfiles(
  posts: ApifyHashtagResult[],
  minFollowers: number = 1000,
  maxFollowers: number = 100000
): Partial<Creator>[] {
  // Group posts by username
  const byUsername = new Map<string, ApifyHashtagResult[]>();
  for (const post of posts) {
    const existing = byUsername.get(post.ownerUsername) ?? [];
    existing.push(post);
    byUsername.set(post.ownerUsername, existing);
  }

  const creators: Partial<Creator>[] = [];

  for (const [username, userPosts] of byUsername) {
    // Calculate metrics from available posts
    const totalLikes = userPosts.reduce((sum, p) => sum + p.likesCount, 0);
    const totalComments = userPosts.reduce((sum, p) => sum + p.commentsCount, 0);
    const videoViews = userPosts.filter(p => p.isVideo)
      .reduce((sum, p) => sum + (p.videoViewCount ?? 0), 0);
    const videoPosts = userPosts.filter(p => p.isVideo);
    const reelsPercentage = (videoPosts.length / userPosts.length) * 100;

    // Collect all hashtags used
    const allHashtags = [...new Set(userPosts.flatMap(p => p.hashtags))];

    // Average engagement per post
    const avgEngagement = (totalLikes + totalComments) / userPosts.length;
    const avgReelViews = videoPosts.length > 0 ? videoViews / videoPosts.length : 0;

    creators.push({
      instagram_username: username,
      full_name: userPosts[0]?.ownerFullName,
      instagram_id: userPosts[0]?.ownerId,
      reels_percentage: Math.round(reelsPercentage * 100) / 100,
      avg_reel_views: Math.round(avgReelViews),
      recent_hashtags: allHashtags.slice(0, 30),
      source_hashtags: allHashtags.filter(h =>
        ['spearfishing', 'spearo', 'freediving', 'australia'].some(
          nh => h.toLowerCase().includes(nh)
        )
      ),
    });
  }

  return creators;
}

// ============================================================
// VERIFICATION: Confirm a creator profile actually exists
// ============================================================

/**
 * Verify that an Instagram profile exists and is accessible.
 * Uses Apify's profile scraper to confirm the account is real.
 * Returns the creator profile data if valid, or null if not found.
 */
export async function verifyCreatorProfile(username: string): Promise<{
  exists: boolean;
  creator?: Partial<Creator>;
  socialLinks?: {
    instagram_url: string;
    facebook_url?: string;
  };
}> {
  const cleanUsername = username.replace(/^@/, '').trim().toLowerCase();

  if (!cleanUsername) {
    return { exists: false };
  }

  const instagramUrl = `https://www.instagram.com/${cleanUsername}/`;

  // Try fetching the profile via Apify if configured
  const apiToken = process.env.APIFY_API_TOKEN;
  if (apiToken) {
    try {
      const profile = await fetchCreatorProfile(cleanUsername);
      if (profile) {
        return {
          exists: true,
          creator: {
            ...profile,
            instagram_url: instagramUrl,
            is_profile_verified: true,
            verified_at: new Date().toISOString(),
          },
          socialLinks: {
            instagram_url: instagramUrl,
            facebook_url: profile.is_business_account
              ? undefined // Business accounts may have a linked Facebook
              : undefined,
          },
        };
      }
    } catch (error) {
      console.error(`[Verify] Apify error for @${cleanUsername}:`, error);
    }
  }

  // Fallback: construct the Instagram URL (profile not fully verified without API)
  return {
    exists: false,  // Cannot confirm without API
    creator: {
      instagram_username: cleanUsername,
      instagram_url: instagramUrl,
      is_profile_verified: false,
    },
    socialLinks: {
      instagram_url: instagramUrl,
    },
  };
}

/**
 * Verify multiple creator profiles in batch.
 * Filters out any that don't exist.
 */
export async function verifyCreatorBatch(
  usernames: string[]
): Promise<Array<{ username: string; exists: boolean; creator?: Partial<Creator> }>> {
  const results = [];

  for (const username of usernames) {
    const result = await verifyCreatorProfile(username);
    results.push({
      username: username.replace(/^@/, '').trim(),
      exists: result.exists,
      creator: result.creator,
    });

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return results;
}

// ============================================================
// FILTER: Remove creators that don't meet criteria
// ============================================================

export function filterCreators(
  creators: Partial<Creator>[],
  options: {
    minFollowers?: number;
    maxFollowers?: number;
    minReelsPercentage?: number;
    excludeUsernames?: string[];
  } = {}
): Partial<Creator>[] {
  const {
    minFollowers = 1000,
    maxFollowers = 100000,
    minReelsPercentage = 20,
    excludeUsernames = [],
  } = options;

  const excludeSet = new Set(excludeUsernames.map(u => u.toLowerCase()));

  return creators.filter(c => {
    // Exclude already-contacted creators
    if (excludeSet.has((c.instagram_username ?? '').toLowerCase())) return false;

    // Filter by follower count (if available)
    if (c.followers_count !== undefined) {
      if (c.followers_count < minFollowers || c.followers_count > maxFollowers) return false;
    }

    // Filter by reels focus
    if ((c.reels_percentage ?? 0) < minReelsPercentage) return false;

    return true;
  });
}
