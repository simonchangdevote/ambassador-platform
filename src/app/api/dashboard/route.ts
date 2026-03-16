// ============================================================
// API: /api/dashboard — Aggregate stats for the dashboard
// Only counts creators that have been actually acted on (approved/skipped)
// plus those currently pending review in the active batch
// ============================================================
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createServerClient();

    // Get the latest active batch (same logic as candidates page)
    const { data: activeBatch } = await supabase
      .from('weekly_batches')
      .select('id')
      .in('status', ['review', 'scoring'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Step 1: Fetch records that have been ACTUALLY acted on (not stale 'presented')
    const { data: actedRecords, error: actedError } = await supabase
      .from('outreach_records')
      .select('id, status, creator_id, batch_id, created_at, updated_at')
      .in('status', [
        'approved', 'skipped', 'dm_drafted', 'dm_sent',
        'replied', 'interested', 'declined', 'no_response', 'onboarded',
      ]);

    if (actedError) {
      console.error('[Dashboard] Acted records query error:', actedError);
      return NextResponse.json({ error: 'Failed to load dashboard stats.' }, { status: 500 });
    }

    // Step 2: Fetch 'presented' records ONLY from the active batch (these are pending review)
    let pendingRecords: typeof actedRecords = [];
    if (activeBatch) {
      const { data: pending } = await supabase
        .from('outreach_records')
        .select('id, status, creator_id, batch_id, created_at, updated_at')
        .eq('batch_id', activeBatch.id)
        .eq('status', 'presented');

      pendingRecords = pending ?? [];
    }

    // Combine: acted records + active batch pending
    const allRecords = [...(actedRecords ?? []), ...pendingRecords];

    // Deduplicate by creator (keep latest status)
    const creatorLatest = new Map<string, { status: string; batch_id: string; updated_at: string }>();
    for (const r of allRecords) {
      const cid = r.creator_id as string;
      const existing = creatorLatest.get(cid);
      if (!existing || new Date(r.updated_at as string) > new Date(existing.updated_at)) {
        creatorLatest.set(cid, {
          status: r.status as string,
          batch_id: r.batch_id as string,
          updated_at: r.updated_at as string,
        });
      }
    }

    // Count unique creators by their latest status
    const statusCounts: Record<string, number> = {};
    for (const [, record] of creatorLatest) {
      statusCounts[record.status] = (statusCounts[record.status] || 0) + 1;
    }

    // Pending review = presented in active batch (after dedup)
    const pendingReview = statusCounts['presented'] || 0;

    // Pipeline numbers — each count is EXCLUSIVE (only creators at that exact current status)
    const approved = (statusCounts['approved'] || 0) + (statusCounts['dm_drafted'] || 0);
    const dmSent = statusCounts['dm_sent'] || 0;
    const replied = statusCounts['replied'] || 0;
    const interested = statusCounts['interested'] || 0;
    const declined = statusCounts['declined'] || 0;
    const noResponse = statusCounts['no_response'] || 0;
    const onboarded = statusCounts['onboarded'] || 0;
    const skipped = statusCounts['skipped'] || 0;

    const totalCreators = creatorLatest.size;
    const notSkipped = totalCreators - skipped - pendingReview;
    const reviewed = totalCreators - pendingReview;

    console.log('[Dashboard] Status counts:', statusCounts);
    console.log('[Dashboard] Total creators:', totalCreators, 'Reviewed:', reviewed);

    // Stats for the cards — each shows CURRENT count at that exact status
    const stats = [
      {
        label: 'Scouted',
        value: totalCreators,
        change: pendingReview > 0 ? `${pendingReview} pending review` : reviewed > 0 ? `${reviewed} reviewed` : 'No candidates yet',
        color: 'text-gray-900',
      },
      {
        label: 'Approved',
        value: approved,
        change: skipped > 0 ? `${skipped} skipped` : 'Awaiting DM',
        color: 'text-blue-600',
      },
      {
        label: 'DMs Sent',
        value: dmSent,
        change: noResponse > 0 ? `${noResponse} no response` : dmSent > 0 ? 'Awaiting replies' : 'None sent yet',
        color: 'text-purple-600',
      },
      {
        label: 'Replies',
        value: replied,
        change: declined > 0 ? `${declined} declined` : replied > 0 ? 'Awaiting follow-up' : 'Awaiting replies',
        color: 'text-amber-600',
      },
      {
        label: 'Interested',
        value: interested,
        change: interested > 0 ? 'Ready to onboard' : 'None yet',
        color: 'text-emerald-600',
      },
      {
        label: 'Onboarded',
        value: onboarded,
        change: onboarded > 0 ? `${Math.round(onboarded / totalCreators * 100)}% conversion` : 'None yet',
        color: 'text-ocean-600',
      },
    ];

    // Pipeline funnel data — also exclusive counts
    const maxCount = Math.max(totalCreators, 1);
    const pipeline = [
      { label: 'Scouted', count: totalCreators, color: 'bg-gray-400', percent: 100 },
      { label: 'Skipped', count: skipped, color: 'bg-gray-300', percent: Math.round(skipped / maxCount * 100) },
      { label: 'Approved', count: approved, color: 'bg-blue-500', percent: Math.round(approved / maxCount * 100) },
      { label: 'DM Sent', count: dmSent, color: 'bg-purple-500', percent: Math.round(dmSent / maxCount * 100) },
      { label: 'Replied', count: replied, color: 'bg-amber-500', percent: Math.round(replied / maxCount * 100) },
      { label: 'Interested', count: interested, color: 'bg-emerald-500', percent: Math.round(interested / maxCount * 100) },
      { label: 'Onboarded', count: onboarded, color: 'bg-ocean-500', percent: Math.round(onboarded / maxCount * 100) },
    ];

    // Recent activity (last 5 actually acted-on records)
    const recentRecords = (actedRecords ?? [])
      .sort((a, b) => new Date(b.updated_at as string).getTime() - new Date(a.updated_at as string).getTime())
      .slice(0, 5);

    let recentActivity: { status: string; username: string; updatedAt: string }[] = [];
    if (recentRecords.length > 0) {
      const creatorIds = recentRecords.map(r => r.creator_id);
      const { data: creators } = await supabase
        .from('creators')
        .select('id, instagram_username')
        .in('id', creatorIds as string[]);

      const creatorMap = new Map((creators ?? []).map((c: { id: string; instagram_username: string }) => [c.id, c.instagram_username]));

      recentActivity = recentRecords.map(r => ({
        status: r.status as string,
        username: creatorMap.get(r.creator_id as string) || 'Unknown',
        updatedAt: r.updated_at as string,
      }));
    }

    return NextResponse.json({
      stats,
      pipeline,
      recentActivity,
      summary: {
        totalCreators,
        pendingReview,
        approved,
        skipped,
        dmSent,
        replied,
        interested,
        onboarded,
      },
    });
  } catch (error) {
    console.error('[Dashboard] Error:', error);
    return NextResponse.json({ error: 'Failed to load dashboard.' }, { status: 500 });
  }
}
