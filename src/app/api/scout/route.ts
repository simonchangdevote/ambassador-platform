// ============================================================
// API: /api/scout — Ambassador Scouting Engine
// Search → Pre-sort → Verify-until-10 → Rank → Present
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

const TARGET_CANDIDATES = 10;  // Stop when we have this many qualified creators
const MAX_TIME_MS = 240000;     // 240 seconds — leaves 60s buffer for Vercel's 300s limit
const PROFILE_TIMEOUT_MS = 20000; // 20 seconds max per profile verification

export async function POST() {
  try {
    const apifyToken = process.env.APIFY_API_TOKEN;
    if (!apifyToken) {
      return NextResponse.json(
        { success: false, error: 'APIFY_API_TOKEN not configured. Add it to your Vercel environment variables.' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const startTime = Date.now();

    // ----- LOAD CONFIG -----
    const { data: brandConfig } = await supabase
      .from('brand_config')
      .select('*')
      .limit(1)
      .single();

    const searchHashtags = brandConfig?.niche_hashtags ?? [
      'spearfishing', 'spearo', 'freediving', 'spearfishingaustralia', 'australianspearfishing',
    ];
    const locationTags: string[] = brandConfig?.required_hashtags ?? ['australia', 'australian', 'aussie'];
    const minFollowers = brandConfig?.target_follower_min ?? 500;
    const maxFollowers = brandConfig?.target_follower_max ?? 500000;
    const minReels = brandConfig?.min_reels ?? 5;

    console.log(`[Scout] === CONFIG ===`);
    console.log(`[Scout] Search hashtags: [${searchHashtags.join(', ')}]`);
    console.log(`[Scout] Location tags: [${locationTags.join(', ')}]`);
    console.log(`[Scout] Followers: ${minFollowers}–${maxFollowers}`);
    console.log(`[Scout] Min reels: ${minReels}`);
    console.log(`[Scout] Target: ${TARGET_CANDIDATES} qualified creators`);

    // ----- STEP 1: Create batch -----
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

    // ----- STEP 2: Search Instagram via Apify -----
    const posts = await scoutByHashtags(searchHashtags, 200);
    console.log(`[Scout] Found ${posts.length} total posts`);

    if (posts.length === 0) {
      await supabase.from('weekly_batches')
        .update({ status: 'completed', candidates_found: 0 })
        .eq('id', batch.id);
      return NextResponse.json({
        success: true,
        message: 'No posts found for your search hashtags. Try adjusting them in Settings.',
        batch_id: batch.id,
        candidates_found: 0,
      });
    }

    // ----- STEP 3: Aggregate into creator profiles -----
    const aggregated = aggregateCreatorProfiles(posts);
    console.log(`[Scout] ${aggregated.length} unique creators`);

    // ----- STEP 4: Only exclude creators you've already reviewed (approved/skipped/dm_sent) -----
    const { data: reviewedRecords } = await supabase
      .from('outreach_records')
      .select('creator_id, creators(instagram_username)')
      .in('status', ['approved', 'skipped', 'dm_drafted', 'dm_sent', 'replied', 'interested', 'declined', 'no_response', 'onboarded']);

    const reviewedUsernames = (reviewedRecords ?? [])
      .map((r: { creators: { instagram_username: string } | null }) => r.creators?.instagram_username)
      .filter(Boolean) as string[];

    console.log(`[Scout] ${reviewedUsernames.length} previously reviewed creators (will skip)`);

    const fresh = filterCreators(aggregated, {
      minFollowers,
      maxFollowers,
      excludeUsernames: reviewedUsernames,
    });
    console.log(`[Scout] ${fresh.length} candidates to check`);

    // ----- STEP 5: Pre-sort by location match -----
    const locLower = locationTags.map(k => k.toLowerCase());
    const sorted = [...fresh].sort((a, b) => {
      const aSourceTags = (a.source_hashtags ?? []).map(h => h.toLowerCase());
      const bSourceTags = (b.source_hashtags ?? []).map(h => h.toLowerCase());
      const aCaptions = (a.recent_captions ?? []).join(' ').toLowerCase();
      const bCaptions = (b.recent_captions ?? []).join(' ').toLowerCase();

      const aScore = locLower.filter(kw =>
        aSourceTags.some(t => t.includes(kw)) || aCaptions.includes(kw)
      ).length;
      const bScore = locLower.filter(kw =>
        bSourceTags.some(t => t.includes(kw)) || bCaptions.includes(kw)
      ).length;

      return bScore - aScore;
    });

    console.log(`[Scout] Top 5 after sort: ${sorted.slice(0, 5).map(c => `@${c.instagram_username}`).join(', ')}`);

    // ----- STEP 6: Verify-until-10 loop -----
    await supabase.from('weekly_batches')
      .update({ status: 'scoring' })
      .eq('id', batch.id);

    const qualified: Creator[] = [];
    let verifiedCount = 0;
    let skippedCount = 0;

    for (const candidate of sorted) {
      // Stop conditions
      if (qualified.length >= TARGET_CANDIDATES) {
        console.log(`[Scout] Reached ${TARGET_CANDIDATES} qualified creators — stopping`);
        break;
      }
      if (Date.now() - startTime > MAX_TIME_MS) {
        console.log(`[Scout] Time limit reached (${Math.round((Date.now() - startTime) / 1000)}s) — stopping with ${qualified.length} qualified`);
        break;
      }
      if (!candidate.instagram_username) continue;

      // Verify profile via Apify (with timeout)
      try {
        console.log(`[Scout] [${qualified.length}/${TARGET_CANDIDATES}] Verifying @${candidate.instagram_username}...`);

        const result = await Promise.race([
          verifyCreatorProfile(candidate.instagram_username),
          new Promise<{ exists: false; creator: null }>((resolve) =>
            setTimeout(() => {
              console.log(`[Scout] ⏱ @${candidate.instagram_username} — timed out, skipping`);
              resolve({ exists: false, creator: null });
            }, PROFILE_TIMEOUT_MS)
          ),
        ]);

        if (!result.exists || !result.creator) {
          skippedCount++;
          continue;
        }

        verifiedCount++;
        const creator: Creator = {
          ...result.creator,
          source_hashtags: candidate.source_hashtags,
        };

        console.log(`[Scout] ✓ @${creator.instagram_username} — ${creator.followers_count} followers`);

        // --- FILTER 1: Follower range ---
        if (creator.followers_count < minFollowers) {
          console.log(`[Scout] ✗ @${creator.instagram_username} — ${creator.followers_count} followers (below ${minFollowers})`);
          continue;
        }
        if (creator.followers_count > maxFollowers) {
          console.log(`[Scout] ✗ @${creator.instagram_username} — ${creator.followers_count} followers (above ${maxFollowers})`);
          continue;
        }

        // --- FILTER 2: Location tag ---
        if (locationTags.length > 0) {
          const allTags = [
            ...(creator.recent_hashtags ?? []),
            ...(creator.source_hashtags ?? []),
          ].map(h => h.toLowerCase().replace(/^#/, ''));
          const bio = (creator.bio ?? '').toLowerCase();
          const captionText = (creator.recent_captions ?? []).join(' ').toLowerCase();

          const matchesLocation = locLower.some(loc =>
            allTags.some(tag => tag.includes(loc)) || bio.includes(loc) || captionText.includes(loc)
          );

          if (!matchesLocation) {
            console.log(`[Scout] ✗ @${creator.instagram_username} — no location match`);
            continue;
          }
        }

        // --- FILTER 3: Minimum reels ---
        if (minReels > 0) {
          const estimatedReels = Math.round(((creator.reels_percentage ?? 0) / 100) * creator.posts_count);
          if (creator.reels_percentage !== undefined && creator.reels_percentage !== null && estimatedReels < minReels) {
            console.log(`[Scout] ✗ @${creator.instagram_username} — ~${estimatedReels} reels (below ${minReels})`);
            continue;
          }
        }

        // Passed all filters!
        console.log(`[Scout] ★ @${creator.instagram_username} QUALIFIED (${qualified.length + 1}/${TARGET_CANDIDATES})`);
        qualified.push(creator);

      } catch (err) {
        console.error(`[Scout] Error verifying @${candidate.instagram_username}:`, err);
        skippedCount++;
      }
    }

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`[Scout] Verification complete in ${elapsed}s — ${verifiedCount} verified, ${skippedCount} skipped, ${qualified.length} qualified`);

    if (qualified.length === 0) {
      await supabase.from('weekly_batches')
        .update({ status: 'completed', candidates_found: 0 })
        .eq('id', batch.id);
      return NextResponse.json({
        success: true,
        message: `Verified ${verifiedCount} creators but none passed all filters. Try broadening your location tags or adjusting follower range in Settings.`,
        batch_id: batch.id,
        candidates_found: 0,
      });
    }

    // ----- STEP 7: Score & rank -----
    const scored = qualified.map(creator => ({
      creator,
      score: calculateOverallScore(creator),
    }));
    scored.sort((a, b) => b.score.overall_score - a.score.overall_score);
    const top10 = scored.slice(0, TARGET_CANDIDATES);

    // ----- STEP 8: Save to Supabase -----
    for (const { creator, score } of top10) {
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
        console.error(`[Scout] Error saving @${creator.instagram_username}:`, creatorError);
        continue;
      }

      await supabase.from('creator_scores').insert({
        creator_id: savedCreator.id,
        batch_id: batch.id,
        content_quality_score: score.content_quality_score,
        engagement_score: score.engagement_score,
        audience_size_score: score.audience_size_score,
        reels_focus_score: score.reels_focus_score,
        brand_fit_score: score.brand_fit_score,
        overall_score: score.overall_score,
        scored_at: new Date().toISOString(),
      });

      await supabase.from('outreach_records').insert({
        creator_id: savedCreator.id,
        batch_id: batch.id,
        status: 'presented',
      });
    }

    // ----- STEP 9: Update batch -----
    await supabase.from('weekly_batches')
      .update({ status: 'review', candidates_found: top10.length })
      .eq('id', batch.id);

    await supabase.from('activity_log').insert({
      action: 'scouting_completed',
      details: {
        batch_id: batch.id,
        posts_found: posts.length,
        creators_aggregated: aggregated.length,
        verified: verifiedCount,
        qualified: qualified.length,
        presented: top10.length,
        elapsed_seconds: elapsed,
      },
    });

    console.log(`[Scout] Done! ${top10.length} candidates ready for review.`);

    return NextResponse.json({
      success: true,
      message: `Found ${top10.length} qualified ambassadors ready for review!`,
      batch_id: batch.id,
      candidates_found: top10.length,
      verified_count: verifiedCount,
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
  } catch (err) {
    return NextResponse.json({
      status: 'idle',
      last_run: null,
      apify_configured: !!process.env.APIFY_API_TOKEN,
    });
  }
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
