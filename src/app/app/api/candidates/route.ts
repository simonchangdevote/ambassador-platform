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

    return NextResponse.json({
      candidates,
      has_batch: true,
      batch_id: batch.id,
      total: candidates.length,
      pending: candidates.filter((c: CandidateCard) => c.outreach.status === 'presented').length,
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
      // Update outreach status to 'approved'
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
      await supabase
        .from('outreach_records')
        .update({
          status: 'skipped',
          updated_at: new Date().toISOString(),
        })
        .eq('id', outreach_id);

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
