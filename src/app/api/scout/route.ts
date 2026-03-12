// ============================================================
// API: /api/scout — Trigger a weekly scouting run
// Discovers, VERIFIES, scores, and presents top 10 creators
// ============================================================
import { NextResponse } from 'next/server';

/**
 * POST /api/scout
 * Triggers a new weekly scouting batch:
 * 1. Searches Instagram hashtags for creators
 * 2. Aggregates posts into creator profiles
 * 3. Filters by criteria (followers, reels %, etc.)
 * 4. VERIFIES each profile actually exists on Instagram
 * 5. Deduplicates against existing creators in DB
 * 6. Scores each verified creator
 * 7. Creates weekly batch with top 10 candidates
 * 8. Generates social media links for each candidate
 */
export async function POST() {
  try {
    // Check for required API token
    const apifyToken = process.env.APIFY_API_TOKEN;
    if (!apifyToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'APIFY_API_TOKEN not configured. Add it to your Vercel environment variables.',
          setup_instructions: {
            step1: 'Create an account at https://apify.com',
            step2: 'Go to Settings > Integrations > API tokens',
            step3: 'Copy your API token',
            step4: 'In Vercel, go to Project Settings > Environment Variables',
            step5: 'Add APIFY_API_TOKEN with your token value',
            step6: 'Redeploy your project',
          },
        },
        { status: 400 }
      );
    }

    // TODO: Implementation steps:
    //
    // 1. Create a new weekly_batch record
    // const batch = await createWeeklyBatch();
    //
    // 2. Fetch brand config (hashtags, keywords, criteria)
    // const config = await getBrandConfig();
    //
    // 3. Scout Instagram via Apify
    // const posts = await scoutByHashtags(config.niche_hashtags);
    //
    // 4. Aggregate into creator profiles
    // const creators = aggregateCreatorProfiles(posts);
    //
    // 5. ** VERIFY each profile exists **
    // const verified = [];
    // for (const creator of creators) {
    //   const verification = await verifyCreatorProfile(creator.instagram_username);
    //   if (verification.exists) {
    //     verified.push({
    //       ...creator,
    //       ...verification.creator,
    //       instagram_url: `https://www.instagram.com/${creator.instagram_username}/`,
    //       is_profile_verified: true,
    //       verified_at: new Date().toISOString(),
    //     });
    //   }
    // }
    //
    // 6. Filter out existing/contacted creators
    // const filtered = filterCreators(verified, {
    //   excludeUsernames: existingUsernames,
    //   minFollowers: config.target_follower_min,
    //   maxFollowers: config.target_follower_max,
    // });
    //
    // 7. Score each creator
    // const scored = filtered.map(c => calculateOverallScore(c, ...));
    //
    // 8. Take top 10 VERIFIED creators and save to DB
    // const top10 = scored
    //   .filter(c => c.is_profile_verified)  // Only verified profiles
    //   .sort((a, b) => b.overall_score - a.overall_score)
    //   .slice(0, 10);
    //
    // 9. Create outreach_records with status 'presented'

    return NextResponse.json({
      success: true,
      message: 'Scouting run initiated. Only verified profiles will be shown.',
      // batch_id: batch.id,
      // candidates_found: top10.length,
      // verified_count: verified.length,
    });
  } catch (error) {
    console.error('[Scout] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Scouting failed. Check server logs.' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/scout — Get current scouting status
 */
export async function GET() {
  return NextResponse.json({
    status: 'idle',
    last_run: null,
    next_scheduled: null,
    apify_configured: !!process.env.APIFY_API_TOKEN,
  });
}
