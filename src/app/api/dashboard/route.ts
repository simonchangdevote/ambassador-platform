// ============================================================
// API: /api/dashboard — Aggregate stats for the dashboard
//
// Mental model:
//   Scouted   = everyone who appeared on Weekly Candidates (unique creators)
//   Approved  = everyone the user clicked Approve on (permanent milestone)
//   Then each Outreach Pipeline status is tracked exclusively:
//   DM Drafted / DM Sent / Replied / Interested / Declined / No Response / Onboarded
// ============================================================
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createServerClient();

    // Only fetch records the user has actually acted on (clicked approve or skip)
    // This excludes stale 'presented' records from old batches
    const { data: actedRecords, error } = await supabase
      .from('outreach_records')
      .select('id, status, creator_id, updated_at')
      .in('status', [
        'approved', 'skipped', 'dm_drafted', 'dm_sent',
        'replied', 'interested', 'declined', 'no_response', 'onboarded',
      ]);

    if (error) {
      console.error('[Dashboard] Query error:', error);
      return NextResponse.json({ error: 'Failed to load dashboard stats.' }, { status: 500 });
    }

    const records = actedRecords ?? [];

    // Scouted = unique creators the user has acted on (approved + skipped)
    const uniqueCreators = new Set(records.map(r => r.creator_id));
    const scouted = uniqueCreators.size;

    // Pending review = 0 here (we don't count presented in this query)
    // The candidates page handles pending review separately
    const pendingReview = 0;

    // Skipped by current status
    const skipped = records.filter(r => r.status === 'skipped').length;

    // Pipeline records = everything in the outreach pipeline (non-skipped)
    const pipelineRecords = records.filter(r => r.status !== 'skipped');

    // Approved = total pipeline creators (permanent milestone — everyone user clicked Approve on)
    const totalApproved = pipelineRecords.length;

    // Current exclusive status counts from the Outreach Pipeline
    const currentCounts: Record<string, number> = {};
    for (const r of pipelineRecords) {
      const s = r.status as string;
      currentCounts[s] = (currentCounts[s] || 0) + 1;
    }

    const dmDrafted = (currentCounts['approved'] || 0) + (currentCounts['dm_drafted'] || 0);
    const dmSent = currentCounts['dm_sent'] || 0;
    const replied = currentCounts['replied'] || 0;
    const interested = currentCounts['interested'] || 0;
    const declined = currentCounts['declined'] || 0;
    const noResponse = currentCounts['no_response'] || 0;
    const onboarded = currentCounts['onboarded'] || 0;

    console.log('[Dashboard] Scouted:', scouted, 'Skipped:', skipped, 'Approved:', totalApproved);
    console.log('[Dashboard] Pipeline statuses:', currentCounts);

    // Stats cards — match Outreach Pipeline status names exactly
    const stats = [
      {
        label: 'Scouted',
        value: scouted,
        change: scouted > 0 ? `${skipped} skipped, ${totalApproved} approved` : 'No candidates yet',
        color: 'text-gray-900',
      },
      {
        label: 'Approved',
        value: totalApproved,
        change: skipped > 0 ? `${skipped} skipped` : 'All approved',
        color: 'text-blue-600',
      },
      {
        label: 'DM Drafted',
        value: dmDrafted,
        change: dmDrafted > 0 ? 'Ready to send' : 'None yet',
        color: 'text-indigo-600',
      },
      {
        label: 'DM Sent',
        value: dmSent,
        change: dmSent > 0 ? 'Awaiting replies' : 'None sent yet',
        color: 'text-purple-600',
      },
      {
        label: 'Replied',
        value: replied,
        change: replied > 0 ? 'Awaiting follow-up' : 'None yet',
        color: 'text-amber-600',
      },
      {
        label: 'Interested',
        value: interested,
        change: interested > 0 ? 'Ready to onboard' : 'None yet',
        color: 'text-emerald-600',
      },
      {
        label: 'Declined',
        value: declined,
        change: declined > 0 ? `${declined} declined` : 'None',
        color: 'text-red-600',
      },
      {
        label: 'No Response',
        value: noResponse,
        change: noResponse > 0 ? `${noResponse} awaiting` : 'None',
        color: 'text-gray-500',
      },
      {
        label: 'Onboarded',
        value: onboarded,
        change: onboarded > 0 ? `${Math.round(onboarded / Math.max(totalApproved, 1) * 100)}% conversion` : 'None yet',
        color: 'text-ocean-600',
      },
    ];

    // Pipeline funnel
    const maxCount = Math.max(scouted, 1);
    const pipeline = [
      { label: 'Scouted', count: scouted, color: 'bg-gray-400', percent: 100 },
      { label: 'Skipped', count: skipped, color: 'bg-gray-300', percent: Math.round(skipped / maxCount * 100) },
      { label: 'Approved', count: totalApproved, color: 'bg-blue-500', percent: Math.round(totalApproved / maxCount * 100) },
      { label: 'DM Drafted', count: dmDrafted, color: 'bg-indigo-400', percent: Math.round(dmDrafted / maxCount * 100) },
      { label: 'DM Sent', count: dmSent, color: 'bg-purple-500', percent: Math.round(dmSent / maxCount * 100) },
      { label: 'Replied', count: replied, color: 'bg-amber-500', percent: Math.round(replied / maxCount * 100) },
      { label: 'Interested', count: interested, color: 'bg-emerald-500', percent: Math.round(interested / maxCount * 100) },
      { label: 'Declined', count: declined, color: 'bg-red-400', percent: Math.round(declined / maxCount * 100) },
      { label: 'No Response', count: noResponse, color: 'bg-gray-300', percent: Math.round(noResponse / maxCount * 100) },
      { label: 'Onboarded', count: onboarded, color: 'bg-ocean-500', percent: Math.round(onboarded / maxCount * 100) },
    ];

    // Recent activity
    const recentRecords = records
      .filter(r => r.status !== 'presented')
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
      pipeline,
      recentActivity,
      summary: {
        totalCreators: scouted,
        pendingReview,
        approved: totalApproved,
        skipped,
        dmDrafted,
        dmSent,
        replied,
        interested,
        declined,
        noResponse,
        onboarded,
      },
      debug: {
        totalRecordsFromQuery: records.length,
        uniqueCreatorIds: scouted,
        statusBreakdown: records.reduce((acc: Record<string, number>, r) => {
          const s = r.status as string;
          acc[s] = (acc[s] || 0) + 1;
          return acc;
        }, {}),
      },
    });
  } catch (error) {
    console.error('[Dashboard] Error:', error);
    return NextResponse.json({ error: 'Failed to load dashboard.' }, { status: 500 });
  }
}
