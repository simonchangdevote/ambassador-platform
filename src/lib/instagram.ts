// ============================================================
// INSTAGRAM DATA LAYER — LIVE Apify Integration
// Fetches real creator data from Instagram via Apify actors
// ============================================================

import type { Creator, ReelPreview } from '@/types';

const APIFY_BASE = 'https://api.apify.com/v2';

// ============================================================
// APIFY: Search hashtags and return real posts
// Uses the Instagram Hashtag Scraper actor
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
  url?: string;
}

interface ApifyProfileResult {
  username: string;
  fullName?: string;
  biography?: string;
  followersCount: number;
  followsCount: number;
  postsCount: number;
  isVerified: boolean;
  isBusinessAccount: boolean;
  profilePicUrl?: string;
  externalUrl?: string;
  igtvVideoCount?: number;
  latestPosts?: Array<{
    type: string;
    likesCount: number;
    commentsCount: number;
    videoViewCount?: number;
    caption?: string;
    hashtags?: string[];
    url?: string;
    displayUrl?: string;
  }>;
}

/**
 * Scout creators by searching hashtags via Apify
 * Makes a REAL API call to the Instagram Hashtag Scraper actor
 */
export async function scoutByHashtags(
  hashtags: string[],
  postsPerHashtag: number = 100
): Promise<ApifyHashtagResult[]> {
  const apiToken = process.env.APIFY_API_TOKEN;
  if (!apiToken) throw new Error('APIFY_API_TOKEN not configured');

  console.log(`[Scout] Searching ${hashtags.length} hashtags via Apify...`);

  const allResults: ApifyHashtagResult[] = [];

  for (const hashtag of hashtags) {
    try {
      // Run the Instagram Hashtag Scraper actor synchronously
      const response = await fetch(
        `${APIFY_BASE}/acts/apify~instagram-hashtag-scraper/run-sync-get-dataset-items?token=${apiToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hashtags: [hashtag],
            resultsLimit: postsPerHashtag,
            searchType: 'hashtag',
          }),
        }
      );

      if (!response.ok) {
        console.error(`[Scout] Apify error for #${hashtag}: ${response.status}`);
        continue;
      }

      const posts: ApifyHashtagResult[] = await response.json();
      console.log(`[Scout] Found ${posts.length} posts for #${hashtag}`);
      allResults.push(...posts);
    } catch (error) {
      console.error(`[Scout] Error fetching #${hashtag}:`, error);
    }
  }

  return allResults;
}

/**
 * Fetch detailed profile data for a specific username via Apify
 * Makes a REAL API call to the Instagram Profile Scraper actor
 */
export async function fetchCreatorProfile(username: string): Promise<Creator | null> {
  const apiToken = process.env.APIFY_API_TOKEN;
  if (!apiToken) throw new Error('APIFY_API_TOKEN not configured');

  console.log(`[Scout] Fetching profile: @${username}`);

  try {
    const response = await fetch(
      `${APIFY_BASE}/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${apiToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usernames: [username],
        }),
      }
    );

    if (!response.ok) {
      console.error(`[Scout] Profile fetch failed for @${username}: ${response.status}`);
      return null;
    }

    const profiles: ApifyProfileResult[] = await response.json();
    if (!profiles || profiles.length === 0) return null;

    const p = profiles[0];
    const latestPosts = p.latestPosts ?? [];
    const videoPosts = latestPosts.filter(post =>
      post.type === 'Video' || post.type === 'Sidecar' || (post.videoViewCount && post.videoViewCount > 0)
    );
    const reelsPercentage = latestPosts.length > 0
      ? (videoPosts.length / latestPosts.length) * 100
      : 0;

    const totalLikes = latestPosts.reduce((sum, post) => sum + (post.likesCount ?? 0), 0);
    const totalComments = latestPosts.reduce((sum, post) => sum + (post.commentsCount ?? 0), 0);
    const engagementRate = p.followersCount > 0 && latestPosts.length > 0
      ? ((totalLikes + totalComments) / latestPosts.length / p.followersCount) * 100
      : 0;

    const videoViews = videoPosts.reduce((sum, post) => sum + (post.videoViewCount ?? 0), 0);
    const avgReelViews = videoPosts.length > 0 ? Math.round(videoViews / videoPosts.length) : 0;

    const allHashtags = [...new Set(latestPosts.flatMap(post => post.hashtags ?? []))];
    const allCaptions = latestPosts
      .map(post => post.caption ?? '')
      .filter(c => c.length > 0)
      .slice(0, 12); // Keep last 12 captions for keyword matching

    return {
      id: '',
      instagram_username: p.username,
      instagram_id: undefined,
      full_name: p.fullName ?? undefined,
      bio: p.biography ?? undefined,
      profile_pic_url: p.profilePicUrl ?? undefined,
      followers_count: p.followersCount,
      following_count: p.followsCount,
      posts_count: p.postsCount,
      is_verified: p.isVerified,
      is_business_account: p.isBusinessAccount,
      engagement_rate: Math.round(engagementRate * 100) / 100,
      avg_reel_views: avgReelViews,
      reels_percentage: Math.round(reelsPercentage * 100) / 100,
      recent_hashtags: allHashtags.slice(0, 30),
      recent_captions: allCaptions,
      instagram_url: `https://www.instagram.com/${p.username}/`,
      is_profile_verified: true,
      verified_at: new Date().toISOString(),
      discovered_at: new Date().toISOString(),
      last_checked_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`[Scout] Error fetching profile @${username}:`, error);
    return null;
  }
}

/**
 * Fetch recent reels for a creator
 */
export async function fetchCreatorReels(
  username: string,
  limit: number = 6
): Promise<ReelPreview[]> {
  const apiToken = process.env.APIFY_API_TOKEN;
  if (!apiToken) return [];

  try {
    const response = await fetch(
      `${APIFY_BASE}/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${apiToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usernames: [username],
          resultsLimit: limit,
        }),
      }
    );

    if (!response.ok) return [];

    const profiles: ApifyProfileResult[] = await response.json();
    if (!profiles || profiles.length === 0) return [];

    const posts = profiles[0].latestPosts ?? [];
    return posts
      .filter(post => post.videoViewCount && post.videoViewCount > 0)
      .slice(0, limit)
      .map((post, i) => ({
        id: String(i),
        thumbnail_url: post.displayUrl ?? '',
        video_url: undefined,
        views_count: post.videoViewCount ?? 0,
        likes_count: post.likesCount ?? 0,
        comments_count: post.commentsCount ?? 0,
        caption: post.caption ?? undefined,
        posted_at: new Date().toISOString(),
      }));
  } catch {
    return [];
  }
}

// ============================================================
// AGGREGATION: Convert raw post data into Creator profiles
// ============================================================

export function aggregateCreatorProfiles(
  posts: ApifyHashtagResult[]
): Partial<Creator>[] {
  // Group posts by username
  const byUsername = new Map<string, ApifyHashtagResult[]>();
  for (const post of posts) {
    if (!post.ownerUsername) continue;
    const existing = byUsername.get(post.ownerUsername) ?? [];
    existing.push(post);
    byUsername.set(post.ownerUsername, existing);
  }

  const creators: Partial<Creator>[] = [];

  for (const [username, userPosts] of byUsername) {
    const totalLikes = userPosts.reduce((sum, p) => sum + (p.likesCount ?? 0), 0);
    const totalComments = userPosts.reduce((sum, p) => sum + (p.commentsCount ?? 0), 0);
    const videoPosts = userPosts.filter(p => p.isVideo);
    const videoViews = videoPosts.reduce((sum, p) => sum + (p.videoViewCount ?? 0), 0);
    const reelsPercentage = userPosts.length > 0
      ? (videoPosts.length / userPosts.length) * 100
      : 0;

    const allHashtags = [...new Set(userPosts.flatMap(p => p.hashtags ?? []))];
    const allCaptions = userPosts
      .map(p => p.caption ?? '')
      .filter(c => c.length > 0)
      .slice(0, 12);
    const avgReelViews = videoPosts.length > 0 ? Math.round(videoViews / videoPosts.length) : 0;

    creators.push({
      instagram_username: username,
      full_name: userPosts[0]?.ownerFullName ?? undefined,
      instagram_id: userPosts[0]?.ownerId,
      reels_percentage: Math.round(reelsPercentage * 100) / 100,
      avg_reel_views: avgReelViews,
      recent_hashtags: allHashtags.slice(0, 30),
      recent_captions: allCaptions,
      instagram_url: `https://www.instagram.com/${username}/`,
      is_profile_verified: false,
      source_hashtags: allHashtags, // Keep all source hashtags for filter matching
    });
  }

  return creators;
}

// ============================================================
// VERIFICATION: Confirm a creator profile actually exists
// ============================================================

export async function verifyCreatorProfile(username: string): Promise<{
  exists: boolean;
  creator?: Creator | null;
}> {
  const cleanUsername = username.replace(/^@/, '').trim().toLowerCase();
  if (!cleanUsername) return { exists: false };

  const profile = await fetchCreatorProfile(cleanUsername);
  if (profile && profile.followers_count > 0) {
    return { exists: true, creator: profile };
  }

  return { exists: false, creator: null };
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
    maxFollowers = 500000,
    excludeUsernames = [],
  } = options;

  const excludeSet = new Set(excludeUsernames.map(u => u.toLowerCase()));

  return creators.filter(c => {
    // Skip existing creators
    if (excludeSet.has((c.instagram_username ?? '').toLowerCase())) return false;
    // Only filter by followers if we have that data (profile-verified creators)
    if (c.followers_count !== undefined && c.followers_count > 0) {
      if (c.followers_count < minFollowers || c.followers_count > maxFollowers) return false;
    }
    // NOTE: We skip reels_percentage filter here because hashtag post data
    // doesn't reliably indicate video content. Accurate reels data comes
    // from the profile verification step later.
    return true;
  });
}
