// ============================================================
// API: /api/scout — Trigger a weekly scouting run
// ============================================================
import { NextResponse } from 'next/server';

/**
 * POST /api/scout
 * Triggers a new weekly scouting batch:
 * 1. Searches Instagram hashtags for creators
 * 2. Aggregates posts into creator profiles
 * 3. Filters by criteria (followers, reels %, etc.)
 * 4. Deduplicates against existing creators in DB
 * 5. Scores each creator
 * 6. Creates weekly batch with top 10 candidates
 */
export async function POST() {
  try {
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
    // 5. Fetch full profiles for top candidates
    // for (const creator of creators) {
    //   const profile = await fetchCreatorProfile(creator.instagram_username);
    //   // Merge profile data
    // }
    //
    // 6. Filter out existing/contacted creators
    // const filtered = filterCreators(creators, {
    //   excludeUsernames: existingUsernames,
    //   minFollowers: config.target_follower_min,
    //   maxFollowers: config.target_follower_max,
    // });
    //
    // 7. Score each creator
    // const scored = filtered.map(c => calculateOverallScore(c, ...));
    //
    // 8. Take top 10 and save to DB
    // const top10 = scored.sort((a, b) => b.overall_score - a.overall_score).slice(0, 10);
    //
    // 9. Create outreach_records with status 'presented'

    return NextResponse.json({
      success: true,
      message: 'Scouting run initiated. Check candidates page for results.',
      // batch_id: batch.id,
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
  });
}
