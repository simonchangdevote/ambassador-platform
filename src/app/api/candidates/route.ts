// ============================================================
// API: /api/candidates — Fetch, approve, and skip candidates
// Returns real candidate data from Supabase
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { generateOutreachMessage } from '@/lib/message-templates';
import type { CandidateCard, Creator, CreatorScore, OutreachRecord } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/candidates
 * Fetch current batch of candidates from Supabase
 * Returns candidates with status 'presented' (pending review)
 */
export async function GET() {
  try {
    const supabase = createServerClient();

    // Get brand config for follower filter range (used for Reach Labels) and tier costs
    const { data: brandConfig } = await supabase
      .from('brand_config')
      .select('target_follower_min, target_follower_max, tier_cost_high_profile, tier_cost_brand_ambassador, tier_cost_community_ambassador')
      .limit(1)
      .single();

    const followerRange = {
      min: brandConfig?.target_follower_min ?? 500,
      max: brandConfig?.target_follower_max ?? 500000,
    };

    const tierCosts = {
      high_profile: brandConfig?.tier_cost_high_profile ?? 300,
      brand_ambassador: brandConfig?.tier_cost_brand_ambassador ?? 200,
      community_ambassador: brandConfig?.tier_cost_community_ambassador ?? 50,
    };

    // Get the latest batch in 'review' status
    const { data: batch } = await supabase
      .from('weekly_batches')
      .select('*')
      .in('status', ['review', 'scoring'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!batch) {
      return NextResponse.json({
        candidates: [],
        message: 'No active scouting batch. Click "Refresh" to scout for new ambassadors.',
        has_batch: false,
      });
    }

    // Get outreach records for this batch that are 'presented' (pending review)
    const { data: outreachRecords, error: outreachError } = await supabase
      .from('outreach_records')
      .select('*')
      .eq('batch_id', batch.id)
      .in('status', ['presented', 'approved', 'skipped']);

    if (outreachError || !outreachRecords || outreachRecords.length === 0) {
      return NextResponse.json({
        candidates: [],
        message: 'No candidates in the current batch. Click "Refresh" to scout.',
        has_batch: true,
        batch_id: batch.id,
      });
    }

    // Get creator IDs from outreach records
    const creatorIds = outreachRecords.map((o: OutreachRecord) => o.creator_id);

    // Fetch all creators
    const { data: creators } = await supabase
      .from('creators')
      .select('*')
      .in('id', creatorIds);

    // Fetch all scores for this batch
    const { data: scores } = await supabase
      .from('creator_scores')
      .select('*')
      .eq('batch_id', batch.id)
      .in('creator_id', creatorIds);

    // Build candidate cards
    const creatorsMap = new Map((creators ?? []).map((c: Creator) => [c.id, c]));
    const scoresMap = new Map((scores ?? []).map((s: CreatorScore) => [s.creator_id, s]));

    const candidates: CandidateCard[] = outreachRecords
      .map((outreach: OutreachRecord, index: number) => {
        const creator = creatorsMap.get(outreach.creator_id);
        const score = scoresMap.get(outreach.creator_id);
        if (!creator || !score) return null;

        return {
          creator,
          score,
          outreach,
          example_reels: [],
          top_hashtags: (creator.recent_hashtags ?? []).slice(0, 6),
          rank: index + 1,
        } as CandidateCard;
      })
      .filter(Boolean)
      // Sort by score descending
      .sort((a: CandidateCard, b: CandidateCard) =>
        b.score.overall_score - a.score.overall_score
      )
      // Re-assign ranks after sorting
      .map((c: CandidateCard, i: number) => ({ ...c, rank: i + 1 }));

    const response = NextResponse.json({
      candidates,
      has_batch: true,
      batch_id: batch.id,
      total: candidates.length,
      pending: candidates.filter((c: CandidateCard) => c.outreach.status === 'presented').length,
      followerRange,
      tierCosts,
    });
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  } catch (error) {
    console.error('[Candidates] Error:', error);
    return NextResponse.json(
      { candidates: [], error: 'Failed to fetch candidates.' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/candidates
 * Update a candidate's outreach status (approve or skip)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { outreach_id, action, creator_id } = body;

    if (!outreach_id || !action) {
      return NextResponse.json(
        { error: 'outreach_id and action are required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    if (action === 'approve') {
      console.log('[Candidates] Approving outreach_id:', outreach_id);

      // Update outreach status to 'approved'
      const { data: approveResult, error: approveError } = await supabase
        .from('outreach_records')
        .update({
          status: 'approved',
          updated_at: new Date().toISOString(),
        })
        .eq('id', outreach_id)
        .select();

      if (approveError) {
        console.error('[Candidates] Approve DB error:', approveError);
        return NextResponse.json({ success: false, error: approveError.message }, { status: 500 });
      }

      if (!approveResult || approveResult.length === 0) {
        console.error('[Candidates] Approve matched 0 rows for outreach_id:', outreach_id);
        return NextResponse.json({ success: false, error: 'No record found to approve.' }, { status: 404 });
      }

      console.log('[Candidates] Approve success:', approveResult[0].id);

      // Generate a DM message
      let dmMessage = '';
      if (creator_id) {
        const { data: creator } = await supabase
          .from('creators')
          .select('*')
          .eq('id', creator_id)
          .single();

        if (creator) {
          dmMessage = generateOutreachMessage(creator as Creator, 'Your Brand');
          // Save the DM message
          await supabase
            .from('outreach_records')
            .update({
              dm_message: dmMessage,
              status: 'dm_drafted',
            })
            .eq('id', outreach_id);
        }
      }

      // Log activity
      await supabase.from('activity_log').insert({
        action: 'candidate_approved',
        details: { outreach_id, creator_id },
      });

      return NextResponse.json({
        success: true,
        action: 'approved',
        dm_message: dmMessage,
      });
    }

    if (action === 'skip') {
      console.log('[Candidates] Skipping outreach_id:', outreach_id);

      const { data: skipResult, error: skipError } = await supabase
        .from('outreach_records')
        .update({
          status: 'skipped',
          updated_at: new Date().toISOString(),
        })
        .eq('id', outreach_id)
        .select();

      if (skipError) {
        console.error('[Candidates] Skip DB error:', skipError);
        return NextResponse.json({ success: false, error: skipError.message }, { status: 500 });
      }

      if (!skipResult || skipResult.length === 0) {
        console.error('[Candidates] Skip matched 0 rows for outreach_id:', outreach_id);
        return NextResponse.json({ success: false, error: 'No record found to skip.' }, { status: 404 });
      }

      console.log('[Candidates] Skip success:', skipResult[0].id, '→', skipResult[0].status);

      // Log activity
      await supabase.from('activity_log').insert({
        action: 'candidate_skipped',
        details: { outreach_id, creator_id },
      });

      return NextResponse.json({ success: true, action: 'skipped' });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "approve" or "skip".' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Candidates] PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update candidate.' },
      { status: 500 }
    );
  }
}
