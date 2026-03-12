// ============================================================
// API: /api/candidates — Fetch, approve, and skip candidates
// Returns real candidate data from Supabase
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { generateOutreachMessage } from '@/lib/message-templates';
import type { CandidateCard } from '@/types';

/**
 * GET /api/candidates
 * Fetch current batch of candidates from Supabase
 */
export async function GET() {
  try {
    const supabase = createServerClient();

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

    // Get outreach records for this batch
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const creatorIds = outreachRecords.map((o: any) => o.creator_id);

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

    // Build lookup maps
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const creatorsMap = new Map((creators ?? []).map((c: any) => [c.id, c]));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scoresMap = new Map((scores ?? []).map((s: any) => [s.creator_id, s]));

    // Build candidate cards
    const candidates: CandidateCard[] = [];

    for (let i = 0; i < outreachRecords.length; i++) {
      const outreach = outreachRecords[i];
      const creator = creatorsMap.get(outreach.creator_id);
      const score = scoresMap.get(outreach.creator_id);
      if (!creator || !score) continue;

      candidates.push({
        creator,
        score,
        outreach,
        example_reels: [],
        top_hashtags: (creator.recent_hashtags ?? []).slice(0, 6),
        rank: i + 1,
      });
    }

    // Sort by score descending and re-assign ranks
    candidates.sort((a, b) => b.score.overall_score - a.score.overall_score);
    candidates.forEach((c, i) => { c.rank = i + 1; });

    return NextResponse.json({
      candidates,
      has_batch: true,
      batch_id: batch.id,
      total: candidates.length,
      pending: candidates.filter((c) => c.outreach.status === 'presented').length,
    });
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
      await supabase
        .from('outreach_records')
        .update({
          status: 'approved',
          updated_at: new Date().toISOString(),
        })
        .eq('id', outreach_id);

      // Generate a DM message
      let dmMessage = '';
      if (creator_id) {
        const { data: creator } = await supabase
          .from('creators')
          .select('*')
          .eq('id', creator_id)
          .single();

        if (creator) {
          dmMessage = generateOutreachMessage(creator, 'Your Brand');
          await supabase
            .from('outreach_records')
            .update({
              dm_message: dmMessage,
              status: 'dm_drafted',
            })
            .eq('id', outreach_id);
        }
      }

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
      await supabase
        .from('outreach_records')
        .update({
          status: 'skipped',
          updated_at: new Date().toISOString(),
        })
        .eq('id', outreach_id);

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
