// ============================================================
// API: /api/scout — Trigger a weekly scouting run
// HARD FILTERS → then RANK by simplified 3-dimension score
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
 * Pipeline:
 * 1. Search Instagram hashtags → raw posts
 * 2. Aggregate posts into creator profiles
 * 3. Basic filter (remove duplicates, skip existing DB creators)
 * 4. Verify each profile via Apify (get real data)
 * 5. HARD FILTER: follower range
 * 6. HARD FILTER: niche keywords (must match in hashtags or bio)
 * 7. HARD FILTER: location tags (must match in hashtags or bio)
 * 8. HARD FILTER: minimum reels count
 * 9. Score & rank top 10
 * 10. Save to Supabase
 */
export async function POST() {
  try {
    const apifyToken = process.env.APIFY_API_TOKEN;
    if (!apifyToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'APIFY_API_TOKEN not configured. Add it to your Vercel environment variables.',
        },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // ----- LOAD CONFIG -----
    const { data: brandConfig } = await supabase
      .from('brand_config')
      .select('*')
      .limit(1)
      .single();

    const searchHashtags = brandConfig?.niche_hashtags ?? [
      'spearfishing', 'spearo', 'freediving', 'spearfishingaustralia',
      'australianspearfishing', 'catchandcook',
    ];
    const nicheKeywords: string[] = brandConfig?.keywords ?? [
      'spearfishing', 'spearo', 'freediving', 'spearfish',
    ];
    const locationTags: string[] = brandConfig?.required_hashtags ?? [
      'australia', 'australian', 'cairns', 'qld', 'queensland',
    ];
    const minFollowers = brandConfig?.target_follower_min ?? 1000;
    const maxFollowers = brandConfig?.target_follower_max ?? 500000;
    const minReels = brandConfig?.min_reels ?? 5;

    console.log(`[Scout] === CONFIG ===`);
    console.log(`[Scout] Search hashtags: [${searchHashtags.join(', ')}]`);
    console.log(`[Scout] Niche keywords: [${nicheKeywords.join(', ')}]`);
    console.log(`[Scout] Location tags: [${locationTags.join(', ')}]`);
    console.log(`[Scout] Followers: ${minFollowers}–${maxFollowers}`);
    console.log(`[Scout] Min reels: ${minReels}`);

    // ----- STEP 1: Create a weekly batch -----
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

    console.log(`[Scout] Created batch ${batch.id}`);

    // ----- STEP 2: Search Instagram via Apify -----
    const posts = await scoutByHashtags(searchHashtags, 50);
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

    // ----- STEP 4: Skip existing DB creators -----
    const { data: existingCreators } = await supabase
      .from('creators')
      .select('instagram_username');
    const existingUsernames = (existingCreators ?? []).map(
      (c: { instagram_username: string }) => c.instagram_username
    );

    const fresh = filterCreators(aggregated, {
      minFollowers,
      maxFollowers,
      excludeUsernames: existingUsernames,
    });
    console.log(`[Scout] ${fresh.length} new creators (after removing existing)`);

    // ----- STEP 4b: PRE-SORT — Prioritise creators found via location-specific hashtags -----
    // This ensures we don't waste Apify credits verifying creators from other countries
    const allLocationKeywords = [...locationTags, ...nicheKeywords].map(k => k.toLowerCase());
    const sorted = [...fresh].sort((a, b) => {
      const aSourceTags = (a.source_hashtags ?? []).map(h => h.toLowerCase());
      const bSourceTags = (b.source_hashtags ?? []).map(h => h.toLowerCase());
      const aCaptions = (a.recent_captions ?? []).join(' ').toLowerCase();
      const bCaptions = (b.recent_captions ?? []).join(' ').toLowerCase();

      // Count how many location keywords appear in source hashtags + captions
      const aScore = allLocationKeywords.filter(kw =>
        aSourceTags.some(t => t.includes(kw)) || aCaptions.includes(kw)
      ).length;
      const bScore = allLocationKeywords.filter(kw =>
        bSourceTags.some(t => t.includes(kw)) || bCaptions.includes(kw)
      ).length;

      return bScore - aScore; // Higher match count first
    });

    const topCreators = sorted.slice(0, 5);
    console.log(`[Scout] Top 5 prioritised creators: ${topCreators.map(c => `@${c.instagram_username} (source: ${(c.source_hashtags ?? []).join(', ')})`).join(' | ')}`);

    // ----- STEP 5: Verify profiles via Apify -----
    // Limited to 12 profiles with 20s timeout each to avoid Vercel 300s limit
    await supabase.from('weekly_batches')
      .update({ status: 'scoring' })
      .eq('id', batch.id);

    const verified: Creator[] = [];
    const toVerify = sorted.slice(0, 12); // 12 max — keeps total under 240s worst case
    const PROFILE_TIMEOUT = 20000; // 20 seconds per profile max

    for (const candidate of toVerify) {
      if (!candidate.instagram_username) continue;
      try {
        console.log(`[Scout] Verifying @${candidate.instagram_username}...`);

        // Race the verification against a timeout
        const result = await Promise.race([
          verifyCreatorProfile(candidate.instagram_username),
          new Promise<{ exists: false; creator: null }>((resolve) =>
            setTimeout(() => {
              console.log(`[Scout] ⏱ @${candidate.instagram_username} — timed out after 20s, skipping`);
              resolve({ exists: false, creator: null });
            }, PROFILE_TIMEOUT)
          ),
        ]);

        if (result.exists && result.creator) {
          verified.push({
            ...result.creator,
            source_hashtags: candidate.source_hashtags,
          });
          console.log(`[Scout] ✓ @${candidate.instagram_username} — ${result.creator.followers_count} followers, ${result.creator.posts_count} posts`);
        } else if (result.exists === false && result.creator === null) {
          // Timed out or not found — already logged
        } else {
          console.log(`[Scout] ✗ @${candidate.instagram_username} — profile not found`);
        }
      } catch (err) {
        console.error(`[Scout] Error verifying @${candidate.instagram_username}:`, err);
      }
    }
    console.log(`[Scout] ${verified.length} profiles verified`);

    // ----- STEP 6: HARD FILTER — Follower range -----
    let qualified = verified.filter(c => {
      if (c.followers_count < minFollowers) {
        console.log(`[Scout] FILTER: @${c.instagram_username} — ${c.followers_count} followers (below ${minFollowers})`);
        return false;
      }
      if (c.followers_count > maxFollowers) {
        console.log(`[Scout] FILTER: @${c.instagram_username} — ${c.followers_count} followers (above ${maxFollowers})`);
        return false;
      }
      return true;
    });
    console.log(`[Scout] ${qualified.length} pass follower filter (${minFollowers}–${maxFollowers})`);

    // ----- STEP 7: HARD FILTER — Niche keywords -----
    // Checks: hashtags + bio + post captions
    if (nicheKeywords.length > 0) {
      const nicheL = nicheKeywords.map(k => k.toLowerCase());
      qualified = qualified.filter(c => {
        const allTags = [
          ...(c.recent_hashtags ?? []),
          ...(c.source_hashtags ?? []),
        ].map(h => h.toLowerCase().replace(/^#/, ''));
        const bio = (c.bio ?? '').toLowerCase();
        const captionText = (c.recent_captions ?? []).join(' ').toLowerCase();

        const matchesNiche = nicheL.some(kw =>
          allTags.some(tag => tag.includes(kw)) || bio.includes(kw) || captionText.includes(kw)
        );

        if (!matchesNiche) {
          console.log(`[Scout] FILTER: @${c.instagram_username} — no niche keyword match in hashtags/bio/captions`);
        }
        return matchesNiche;
      });
      console.log(`[Scout] ${qualified.length} pass niche filter [${nicheKeywords.join(', ')}]`);
    }

    // ----- STEP 8: HARD FILTER — Location keywords -----
    // Checks: hashtags + bio + post captions (many creators mention location in captions, not hashtags)
    if (locationTags.length > 0) {
      const locL = locationTags.map(t => t.toLowerCase());
      qualified = qualified.filter(c => {
        const allTags = [
          ...(c.recent_hashtags ?? []),
          ...(c.source_hashtags ?? []),
        ].map(h => h.toLowerCase().replace(/^#/, ''));
        const bio = (c.bio ?? '').toLowerCase();
        const captionText = (c.recent_captions ?? []).join(' ').toLowerCase();

        const matchesLocation = locL.some(loc =>
          allTags.some(tag => tag.includes(loc)) || bio.includes(loc) || captionText.includes(loc)
        );

        if (!matchesLocation) {
          console.log(`[Scout] FILTER: @${c.instagram_username} — no location match in hashtags/bio/captions`);
        }
        return matchesLocation;
      });
      console.log(`[Scout] ${qualified.length} pass location filter [${locationTags.join(', ')}]`);
    }

    // ----- STEP 9: HARD FILTER — Minimum reels -----
    if (minReels > 0) {
      qualified = qualified.filter(c => {
        // Use reels_percentage * posts_count to estimate reels count
        const estimatedReels = Math.round(((c.reels_percentage ?? 0) / 100) * c.posts_count);
        // If we don't have reels data, be lenient (don't filter out)
        if (c.reels_percentage === undefined || c.reels_percentage === null) return true;
        if (estimatedReels < minReels) {
          console.log(`[Scout] FILTER: @${c.instagram_username} — ~${estimatedReels} reels (below ${minReels})`);
          return false;
        }
        return true;
      });
      console.log(`[Scout] ${qualified.length} pass min reels filter (${minReels}+)`);
    }

    if (qualified.length === 0) {
      await supabase.from('weekly_batches')
        .update({ status: 'completed', candidates_found: 0 })
        .eq('id', batch.id);

      return NextResponse.json({
        success: true,
        message: `Found ${verified.length} creators but none passed all filters. Try relaxing your niche keywords, location tags, or follower range in Settings.`,
        batch_id: batch.id,
        candidates_found: 0,
      });
    }

    // ----- STEP 10: Score & rank -----
    const scored = qualified.map(creator => ({
      creator,
      score: calculateOverallScore(creator),
    }));

    scored.sort((a, b) => b.score.overall_score - a.score.overall_score);
    const top10 = scored.slice(0, 10);

    // ----- STEP 11: Save to Supabase -----
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

      const creatorId = savedCreator.id;

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

      await supabase.from('outreach_records').insert({
        creator_id: creatorId,
        batch_id: batch.id,
        status: 'presented',
      });
    }

    // ----- STEP 12: Update batch -----
    await supabase.from('weekly_batches')
      .update({ status: 'review', candidates_found: top10.length })
      .eq('id', batch.id);

    await supabase.from('activity_log').insert({
      action: 'scouting_completed',
      details: {
        batch_id: batch.id,
        posts_found: posts.length,
        creators_aggregated: aggregated.length,
        creators_verified: verified.length,
        pass_followers: qualified.length,
        top_candidates: top10.length,
      },
    });

    console.log(`[Scout] Done! ${top10.length} candidates ready for review.`);

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

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
