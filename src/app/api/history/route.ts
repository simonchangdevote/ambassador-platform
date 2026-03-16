// ============================================================
// API: /api/history — Fetch all reviewed creators (approved, skipped, etc.)
// ============================================================
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = createServerClient();

    // Fetch all outreach records that have been acted on (not just 'presented')
    // NOTE: creator_scores has no direct FK from outreach_records, so we query it separately
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
      .in('status', ['approved', 'skipped', 'dm_drafted', 'dm_sent', 'replied', 'interested', 'declined', 'no_response', 'onboarded'])
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[History] Query error:', error);
      return NextResponse.json({ error: 'Failed to load history.' }, { status: 500 });
    }

    if (!records || records.length === 0) {
      return NextResponse.json({ history: [], total: 0 });
    }

    // Collect creator_id + batch_id pairs to fetch scores separately
    const creatorIds = [...new Set(records.map((r: Record<string, unknown>) => r.creator_id as string))];
    const batchIds = [...new Set(records.map((r: Record<string, unknown>) => r.batch_id as string).filter(Boolean))];

    // Fetch scores separately (no direct FK from outreach_records to creator_scores)
    let scoresMap = new Map<string, Record<string, unknown>>();
    if (creatorIds.length > 0 && batchIds.length > 0) {
      const { data: scores } = await supabase
        .from('creator_scores')
        .select('creator_id, batch_id, overall_score, engagement_score, audience_size_score, reels_focus_score')
        .in('creator_id', creatorIds)
        .in('batch_id', batchIds);

      if (scores) {
        for (const s of scores) {
          // Key by creator_id + batch_id so we match the right score to the right outreach record
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

    return NextResponse.json({ history, total: history.length });
  } catch (error) {
    console.error('[History] Error:', error);
    return NextResponse.json({ error: 'Failed to load history.' }, { status: 500 });
  }
}
