// ============================================================
// API: /api/dashboard — Aggregate stats for the dashboard
// Matches exactly what the Outreach Pipeline and Candidates pages show
// ============================================================
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createServerClient();

    // Get the latest active batch (same as candidates page)
    const { data: activeBatch } = await supabase
      .from('weekly_batches')
      .select('id')
      .in('status', ['review', 'scoring'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const activeBatchId = activeBatch?.id ?? null;

    // ---- PENDING REVIEW: presented records in the active batch only ----
    let pendingReview = 0;
    if (activeBatchId) {
      const { data: pending } = await supabase
        .from('outreach_records')
        .select('id')
        .eq('batch_id', activeBatchId)
        .eq('status', 'presented');
      pendingReview = pending?.length ?? 0;
    }

    // ---- SKIPPED: records in the active batch that were skipped ----
    // (Only count skips from the active batch to match what the user actually did)
    let skipped = 0;
    if (activeBatchId) {
      const { data: skippedRecords } = await supabase
        .from('outreach_records')
        .select('id')
        .eq('batch_id', activeBatchId)
        .eq('status', 'skipped');
      skipped = skippedRecords?.length ?? 0;
    }

    // ---- OUTREACH PIPELINE: exact same query as /api/outreach GET ----
    // These are the records the user sees and manages on the Outreach Pipeline page
    const { data: pipelineRecords, error: pipelineError } = await supabase
      .from('outreach_records')
      .select('id, status, creator_id, updated_at')
      .in('status', [
        'approved', 'dm_drafted', 'dm_sent',
        'replied', 'interested', 'declined', 'no_response', 'onboarded',
      ]);

    if (pipelineError) {
      console.error('[Dashboard] Pipeline query error:', pipelineError);
      return NextResponse.json({ error: 'Failed to load dashboard stats.' }, { status: 500 });
    }

    const pipeline = pipelineRecords ?? [];

    // Count each pipeline status directly — NO dedup, just raw counts
    const pipelineCounts: Record<string, number> = {};
    for (const r of pipeline) {
      const s = r.status as string;
      pipelineCounts[s] = (pipelineCounts[s] || 0) + 1;
    }

    console.log('[Dashboard] Active batch:', activeBatchId);
    console.log('[Dashboard] Pending review:', pendingReview);
    console.log('[Dashboard] Skipped:', skipped);
    console.log('[Dashboard] Pipeline records:', pipeline.length);
    console.log('[Dashboard] Pipeline status counts:', pipelineCounts);
    // Log each record for debugging
    for (const r of pipeline) {
      console.log(`[Dashboard] Record ${r.id}: status=${r.status}, creator=${r.creator_id}`);
    }

    // Pipeline numbers — EXCLUSIVE counts per current status
    const approved = (pipelineCounts['approved'] || 0) + (pipelineCounts['dm_drafted'] || 0);
    const dmSent = pipelineCounts['dm_sent'] || 0;
    const replied = pipelineCounts['replied'] || 0;
    const interested = pipelineCounts['interested'] || 0;
    const declined = pipelineCounts['declined'] || 0;
    const noResponse = pipelineCounts['no_response'] || 0;
    const onboarded = pipelineCounts['onboarded'] || 0;

    // Total scouted = pipeline creators + skipped + pending
    const totalScouted = pipeline.length + skipped + pendingReview;

    // Stats cards
    const stats = [
      {
        label: 'Scouted',
        value: totalScouted,
        change: pendingReview > 0 ? `${pendingReview} pending review` : `${skipped + pipeline.length} reviewed`,
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
        change: onboarded > 0 ? `${Math.round(onboarded / Math.max(totalScouted, 1) * 100)}% conversion` : 'None yet',
        color: 'text-ocean-600',
      },
    ];

    // Pipeline funnel
    const maxCount = Math.max(totalScouted, 1);
    const pipelineFunnel = [
      { label: 'Scouted', count: totalScouted, color: 'bg-gray-400', percent: 100 },
      { label: 'Skipped', count: skipped, color: 'bg-gray-300', percent: Math.round(skipped / maxCount * 100) },
      { label: 'Approved', count: approved, color: 'bg-blue-500', percent: Math.round(approved / maxCount * 100) },
      { label: 'DM Sent', count: dmSent, color: 'bg-purple-500', percent: Math.round(dmSent / maxCount * 100) },
      { label: 'Replied', count: replied, color: 'bg-amber-500', percent: Math.round(replied / maxCount * 100) },
      { label: 'Interested', count: interested, color: 'bg-emerald-500', percent: Math.round(interested / maxCount * 100) },
      { label: 'Onboarded', count: onboarded, color: 'bg-ocean-500', percent: Math.round(onboarded / maxCount * 100) },
    ];

    // Recent activity
    const recentRecords = pipeline
      .sort((a, b) => new Date(b.updated_at as string).getTime() - new Date(a.updated_at as string).getTime())
      .slice(0, 5);

    let recentActivity: { status: string; username: string; updatedAt: string }[] = [];
    if (recentRecords.length > 0) {
      const creatorIds = recentRecords.map(r => r.creator_id);
      const { data: creators } = await supabase
        .from('creators')
        .select('id, instagram_username')
        .in('id', creatorIds as string[]);

      const creatorMap = new Map(
        (creators ?? []).map((c: { id: string; instagram_username: string }) => [c.id, c.instagram_username])
      );

      recentActivity = recentRecords.map(r => ({
        status: r.status as string,
        username: creatorMap.get(r.creator_id as string) || 'Unknown',
        updatedAt: r.updated_at as string,
      }));
    }

    return NextResponse.json({
      stats,
      pipeline: pipelineFunnel,
      recentActivity,
      summary: {
        totalCreators: totalScouted,
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
