// ============================================================
// API: /api/history — Fetch all reviewed creators (approved, skipped, etc.)
// ============================================================
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createServerClient();

    // First, do a simple count to check how many acted-on records exist
    const { data: countCheck, error: countError } = await supabase
      .from('outreach_records')
      .select('id, status, creator_id')
      .neq('status', 'presented');

    console.log('[History] Records with acted-on status:', countCheck?.length ?? 0);
    if (countCheck && countCheck.length > 0) {
      console.log('[History] Status breakdown:', countCheck.reduce((acc: Record<string, number>, r) => {
        acc[r.status as string] = (acc[r.status as string] || 0) + 1;
        return acc;
      }, {}));
    }

    if (countError) {
      console.error('[History] Count check error:', countError);
    }

    // Fetch all outreach records that have been acted on
    const { data: records, error } = await supabase
      .from('outreach_records')
      .select(`
        id,
        status,
        creator_id,
        batch_id,
        dm_message,
        dm_sent_at,
        response_received_at,
        response_notes,
        created_at,
        updated_at,
        creators (
          id,
          instagram_username,
          full_name,
          bio,
          profile_pic_url,
          followers_count,
          engagement_rate,
          avg_reel_views,
          reels_percentage,
          instagram_url,
          recent_hashtags,
          is_verified
        ),
        weekly_batches (
          week_number,
          year
        )
      `)
      .neq('status', 'presented')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[History] Query error:', error);
      return NextResponse.json({ error: 'Failed to load history.', debug: error.message }, { status: 500 });
    }

    console.log('[History] Records with joins:', records?.length ?? 0);

    if (!records || records.length === 0) {
      return NextResponse.json({ history: [], total: 0, debug: 'No records found with acted-on statuses' });
    }

    // Log how many have null creator joins
    const nullCreators = records.filter((r: Record<string, unknown>) => !r.creators).length;
    console.log('[History] Records with null creator join:', nullCreators, 'of', records.length);

    // Collect creator_id + batch_id pairs to fetch scores separately
    const creatorIds = [...new Set(records.map((r: Record<string, unknown>) => r.creator_id as string))];
    const batchIds = [...new Set(records.map((r: Record<string, unknown>) => r.batch_id as string).filter(Boolean))];

    // Fetch scores separately (no direct FK from outreach_records to creator_scores)
    const scoresMap = new Map<string, Record<string, unknown>>();
    if (creatorIds.length > 0 && batchIds.length > 0) {
      const { data: scores } = await supabase
        .from('creator_scores')
        .select('creator_id, batch_id, overall_score, engagement_score, audience_size_score, reels_focus_score')
        .in('creator_id', creatorIds)
        .in('batch_id', batchIds);

      if (scores) {
        for (const s of scores) {
          const key = `${s.creator_id}_${s.batch_id}`;
          scoresMap.set(key, s as Record<string, unknown>);
        }
      }
    }

    // Transform into a clean format
    const history = (records ?? []).map((r: Record<string, unknown>) => {
      const creator = r.creators as Record<string, unknown> | null;
      const batch = r.weekly_batches as Record<string, unknown> | null;
      const scoreKey = `${r.creator_id}_${r.batch_id}`;
      const score = scoresMap.get(scoreKey) ?? null;

      return {
        outreach_id: r.id,
        status: r.status,
        dm_message: r.dm_message,
        dm_sent_at: r.dm_sent_at,
        response_notes: r.response_notes,
        updated_at: r.updated_at,
        created_at: r.created_at,
        batch_week: batch ? `Week ${batch.week_number}` : 'Unknown',
        creator: creator ? {
          id: creator.id,
          username: creator.instagram_username,
          full_name: creator.full_name,
          bio: creator.bio,
          profile_pic_url: creator.profile_pic_url,
          followers: creator.followers_count,
          engagement_rate: creator.engagement_rate,
          instagram_url: creator.instagram_url,
          is_verified: creator.is_verified,
        } : null,
        score: score ? (score.overall_score as number) : 0,
      };
    }).filter((h: { creator: unknown }) => h.creator !== null);

    console.log('[History] Final history items after filtering null creators:', history.length);

    return NextResponse.json({ history, total: history.length });
  } catch (error) {
    console.error('[History] Error:', error);
    return NextResponse.json({ error: 'Failed to load history.' }, { status: 500 });
  }
}
