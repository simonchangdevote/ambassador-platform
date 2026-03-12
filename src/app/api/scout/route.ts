// ============================================================
// API: /api/scout — Trigger a weekly scouting run
// Discovers, VERIFIES, scores, and presents top 10 creators
// Uses REAL Apify API calls + Supabase storage
// ============================================================
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import {
  scoutByHashtags,
  aggregateCreatorProfiles,
  filterCreators,
  verifyCreatorProfile,
} from '@/lib/instagram';
import { calculateOverallScore } from '@/lib/scoring';
import type { Creator } from '@/types';

/**
 * POST /api/scout
 * Triggers a new weekly scouting batch:
 * 1. Searches Instagram hashtags for creators via Apify
 * 2. Aggregates posts into creator profiles
 * 3. Filters by criteria (followers, reels %, etc.)
 * 4. VERIFIES each profile actually exists on Instagram
 * 5. Deduplicates against existing creators in DB
 * 6. Scores each verified creator
 * 7. Creates weekly batch with top 10 candidates
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

    const supabase = createServerClient();

    // ----- STEP 1: Get brand config -----
    const { data: brandConfig } = await supabase
      .from('brand_config')
      .select('*')
      .limit(1)
      .single();

    const nicheHashtags = brandConfig?.niche_hashtags ?? [
      'spearfishing', 'spearo', 'freediving', 'spearfishingaustralia',
      'australianspearfishing', 'catchandcook',
    ];
    const keywords = brandConfig?.keywords ?? [
      'spearfishing', 'freediving', 'ocean', 'diving', 'australia',
    ];
    const minFollowers = brandConfig?.target_follower_min ?? 1000;
    const maxFollowers = brandConfig?.target_follower_max ?? 100000;

    // ----- STEP 2: Create a weekly batch -----
    const now = new Date();
    const weekNumber = getWeekNumber(now);
    const year = now.getFullYear();

    const { data: batch, error: batchError } = await supabase
      .from('weekly_batches')
      .insert({
        week_number: weekNumber,
        year,
        start_date: now.toISOString(),
        end_date: new Date(now.getTime() + 7 * 86400000).toISOString(),
        status: 'scouting',
        candidates_found: 0,
        candidates_approved: 0,
        candidates_skipped: 0,
      })
      .select()
      .single();

    if (batchError) {
      console.error('[Scout] Batch creation error:', batchError);
      return NextResponse.json(
        { success: false, error: 'Failed to create scouting batch.' },
        { status: 500 }
      );
    }

    console.log(`[Scout] Created batch ${batch.id} for week ${weekNumber}/${year}`);

    // ----- STEP 3: Scout Instagram via Apify -----
    console.log(`[Scout] Searching hashtags: ${nicheHashtags.join(', ')}`);
    const posts = await scoutByHashtags(nicheHashtags, 50);
    console.log(`[Scout] Found ${posts.length} total posts`);

    if (posts.length === 0) {
      await supabase
        .from('weekly_batches')
        .update({ status: 'completed', candidates_found: 0 })
        .eq('id', batch.id);

      return NextResponse.json({
        success: true,
        message: 'No posts found for the configured hashtags. Try adjusting your hashtags in Settings.',
        batch_id: batch.id,
        candidates_found: 0,
      });
    }

    // ----- STEP 4: Aggregate into creator profiles -----
    const aggregated = aggregateCreatorProfiles(posts);
    console.log(`[Scout] Aggregated into ${aggregated.length} unique creators`);

    // ----- STEP 5: Get existing usernames to avoid duplicates -----
    const { data: existingCreators } = await supabase
      .from('creators')
      .select('instagram_username');
    const existingUsernames = (existingCreators ?? []).map(
      (c: { instagram_username: string }) => c.instagram_username
    );

    // ----- STEP 6: Filter by criteria -----
    const filtered = filterCreators(aggregated, {
      minFollowers,
      maxFollowers,
      minReelsPercentage: 15,
      excludeUsernames: existingUsernames,
    });
    console.log(`[Scout] ${filtered.length} creators pass filters`);

    // ----- STEP 7: Verify each profile exists via Apify -----
    await supabase
      .from('weekly_batches')
      .update({ status: 'scoring' })
      .eq('id', batch.id);

    const verified: Creator[] = [];
    // Limit verification to top 20 to save Apify credits
    const toVerify = filtered.slice(0, 20);

    for (const candidate of toVerify) {
      if (!candidate.instagram_username) continue;
      try {
        console.log(`[Scout] Verifying @${candidate.instagram_username}...`);
        const result = await verifyCreatorProfile(candidate.instagram_username);
        if (result.exists && result.creator) {
          verified.push({
            ...result.creator,
            source_hashtags: candidate.source_hashtags,
          });
          console.log(`[Scout] Verified: @${candidate.instagram_username} (${result.creator.followers_count} followers)`);
        } else {
          console.log(`[Scout] Skipped: @${candidate.instagram_username} — profile not found`);
        }
      } catch (err) {
        console.error(`[Scout] Verification error for @${candidate.instagram_username}:`, err);
      }
    }
    console.log(`[Scout] ${verified.length} creators verified`);

    if (verified.length === 0) {
      await supabase
        .from('weekly_batches')
        .update({ status: 'completed', candidates_found: 0 })
        .eq('id', batch.id);

      return NextResponse.json({
        success: true,
        message: 'No verified creators found in this scouting run. Try again or adjust criteria.',
        batch_id: batch.id,
        candidates_found: 0,
      });
    }

    // ----- STEP 8: Score each verified creator -----
    const scored = verified.map(creator => ({
      creator,
      score: calculateOverallScore(creator, nicheHashtags, keywords),
    }));

    // Sort by overall score and take top 10
    scored.sort((a, b) => b.score.overall_score - a.score.overall_score);
    const top10 = scored.slice(0, 10);

    // ----- STEP 9: Save to Supabase -----
    for (const { creator, score } of top10) {
      // Upsert creator
      const { data: savedCreator, error: creatorError } = await supabase
        .from('creators')
        .upsert(
          {
            instagram_username: creator.instagram_username,
            instagram_id: creator.instagram_id ?? null,
            full_name: creator.full_name ?? null,
            bio: creator.bio ?? null,
            profile_pic_url: creator.profile_pic_url ?? null,
            followers_count: creator.followers_count,
            following_count: creator.following_count,
            posts_count: creator.posts_count,
            is_verified: creator.is_verified,
            is_business_account: creator.is_business_account,
            engagement_rate: creator.engagement_rate ?? null,
            avg_reel_views: creator.avg_reel_views ?? null,
            reels_percentage: creator.reels_percentage ?? null,
            recent_hashtags: creator.recent_hashtags ?? [],
            instagram_url: creator.instagram_url ?? `https://www.instagram.com/${creator.instagram_username}/`,
            is_profile_verified: true,
            verified_at: new Date().toISOString(),
            discovered_at: creator.discovered_at ?? new Date().toISOString(),
            last_checked_at: new Date().toISOString(),
          },
          { onConflict: 'instagram_username' }
        )
        .select()
        .single();

      if (creatorError) {
        console.error(`[Scout] Error saving creator @${creator.instagram_username}:`, creatorError);
        continue;
      }

      const creatorId = savedCreator.id;

      // Save score
      await supabase.from('creator_scores').insert({
        creator_id: creatorId,
        batch_id: batch.id,
        content_quality_score: score.content_quality_score,
        engagement_score: score.engagement_score,
        audience_size_score: score.audience_size_score,
        reels_focus_score: score.reels_focus_score,
        brand_fit_score: score.brand_fit_score,
        overall_score: score.overall_score,
        scored_at: new Date().toISOString(),
      });

      // Create outreach record with 'presented' status
      await supabase.from('outreach_records').insert({
        creator_id: creatorId,
        batch_id: batch.id,
        status: 'presented',
      });
    }

    // ----- STEP 10: Update batch status -----
    await supabase
      .from('weekly_batches')
      .update({
        status: 'review',
        candidates_found: top10.length,
      })
      .eq('id', batch.id);

    // Log activity
    await supabase.from('activity_log').insert({
      action: 'scouting_completed',
      details: {
        batch_id: batch.id,
        posts_found: posts.length,
        creators_aggregated: aggregated.length,
        creators_verified: verified.length,
        top_candidates: top10.length,
      },
    });

    console.log(`[Scout] Scouting complete! ${top10.length} candidates ready for review.`);

    return NextResponse.json({
      success: true,
      message: `Found ${top10.length} verified ambassadors ready for review!`,
      batch_id: batch.id,
      candidates_found: top10.length,
      verified_count: verified.length,
      total_posts_scanned: posts.length,
    });
  } catch (error) {
    console.error('[Scout] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Scouting failed. Check server logs for details.' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/scout — Get current scouting status
 */
export async function GET() {
  try {
    const supabase = createServerClient();

    const { data: latestBatch } = await supabase
      .from('weekly_batches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      status: latestBatch?.status ?? 'idle',
      last_run: latestBatch?.created_at ?? null,
      batch_id: latestBatch?.id ?? null,
      candidates_found: latestBatch?.candidates_found ?? 0,
      apify_configured: !!process.env.APIFY_API_TOKEN,
    });
  } catch {
    return NextResponse.json({
      status: 'idle',
      last_run: null,
      apify_configured: !!process.env.APIFY_API_TOKEN,
    });
  }
}

/** Get ISO week number */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
