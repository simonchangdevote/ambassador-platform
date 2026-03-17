// ============================================================
// API: /api/outreach — Fetch and manage outreach pipeline
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { calculatePipelineCost } from '@/lib/ambassador-tiers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/outreach
 * Fetch all approved/dm_drafted/dm_sent/replied/interested creators for the pipeline
 */
export async function GET() {
  try {
    const supabase = createServerClient();

    // Fetch tier costs from brand_config
    const { data: brand_config } = await supabase
      .from('brand_config')
      .select('tier_cost_high_profile, tier_cost_brand_ambassador, tier_cost_community_ambassador')
      .limit(1)
      .single();

    const tierCosts = {
      high_profile: brand_config?.tier_cost_high_profile ?? 300,
      brand_ambassador: brand_config?.tier_cost_brand_ambassador ?? 200,
      community_ambassador: brand_config?.tier_cost_community_ambassador ?? 50,
    };

    // Fetch outreach records that have been approved (not skipped, not just presented)
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
          instagram_url,
          is_verified
        ),
        weekly_batches (
          week_number,
          year
        )
      `)
      .in('status', ['approved', 'dm_drafted', 'dm_sent', 'replied', 'interested', 'declined', 'no_response', 'onboarded'])
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[Outreach] Query error:', error);
      return NextResponse.json({ error: 'Failed to load outreach pipeline.' }, { status: 500 });
    }

    if (!records || records.length === 0) {
      return NextResponse.json({ items: [], total: 0, tierCosts, pipelineCost: { total: 0, breakdown: { high_profile: { count: 0, subtotal: 0 }, brand_ambassador: { count: 0, subtotal: 0 }, community_ambassador: { count: 0, subtotal: 0 } } } });
    }

    // Fetch scores separately (no direct FK from outreach_records to creator_scores)
    const creatorIds = [...new Set(records.map((r: Record<string, unknown>) => r.creator_id as string))];
    const batchIds = [...new Set(records.map((r: Record<string, unknown>) => r.batch_id as string).filter(Boolean))];

    const scoresMap = new Map<string, number>();
    if (creatorIds.length > 0 && batchIds.length > 0) {
      const { data: scores } = await supabase
        .from('creator_scores')
        .select('creator_id, batch_id, overall_score')
        .in('creator_id', creatorIds)
        .in('batch_id', batchIds);

      if (scores) {
        for (const s of scores) {
          const key = `${s.creator_id}_${s.batch_id}`;
          scoresMap.set(key, s.overall_score as number);
        }
      }
    }

    // Transform into pipeline items
    const items = records.map((r: Record<string, unknown>) => {
      const creator = r.creators as Record<string, unknown> | null;
      const batch = r.weekly_batches as Record<string, unknown> | null;
      const scoreKey = `${r.creator_id}_${r.batch_id}`;

      if (!creator) return null;

      return {
        id: r.id,
        username: creator.instagram_username,
        fullName: creator.full_name || creator.instagram_username,
        profilePic: creator.profile_pic_url,
        followers: creator.followers_count,
        engagementRate: creator.engagement_rate,
        instagramUrl: creator.instagram_url,
        isVerified: creator.is_verified,
        score: scoresMap.get(scoreKey) ?? 0,
        status: r.status,
        dmMessage: r.dm_message || '',
        dmSentAt: r.dm_sent_at,
        responseNote: r.response_notes,
        batchWeek: batch ? `Week ${batch.week_number}` : 'Unknown',
        updatedAt: r.updated_at,
        createdAt: r.created_at,
      };
    }).filter(Boolean);

    // Calculate pipeline cost from the items (using followers + status)
    const creatorsForCost = items.map((item: Record<string, unknown>) => ({
      followers_count: (item.followers as number) || 0,
      status: item.status as string,
    }));
    const pipelineCost = calculatePipelineCost(creatorsForCost, tierCosts);

    return NextResponse.json({ items, total: items.length, tierCosts, pipelineCost });
  } catch (error) {
    console.error('[Outreach] Error:', error);
    return NextResponse.json({ error: 'Failed to load outreach pipeline.' }, { status: 500 });
  }
}

/**
 * PATCH /api/outreach
 * Update outreach status (mark as sent, replied, etc.)
 * Body: { outreach_id: string, status: string, notes?: string }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { outreach_id, status, notes } = body;

    console.log('[Outreach PATCH] Updating:', { outreach_id, status, notes });

    if (!outreach_id || !status) {
      return NextResponse.json(
        { error: 'outreach_id and status are required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    // Set dm_sent_at when marking as sent
    if (status === 'dm_sent') {
      updateData.dm_sent_at = new Date().toISOString();
    }

    // Set response timestamp when a response comes in
    if (['replied', 'interested', 'declined'].includes(status)) {
      updateData.response_received_at = new Date().toISOString();
    }

    // Save any notes
    if (notes) {
      updateData.response_notes = notes;
    }

    const { error } = await supabase
      .from('outreach_records')
      .update(updateData)
      .eq('id', outreach_id);

    if (error) {
      console.error('[Outreach PATCH] Update error:', error);
      return NextResponse.json({ error: 'Failed to update outreach status.', debug: error.message }, { status: 500 });
    }

    console.log('[Outreach PATCH] Success:', { outreach_id, status });

    // Log activity
    await supabase.from('activity_log').insert({
      action: `outreach_${status}`,
      details: { outreach_id, status, notes },
    });

    return NextResponse.json({
      success: true,
      message: `Outreach updated to ${status}`,
    });
  } catch (error) {
    console.error('[Outreach] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Status update failed.' },
      { status: 500 }
    );
  }
}
