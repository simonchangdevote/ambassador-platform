// ============================================================
// API: /api/dashboard — Aggregate stats for the dashboard
// ============================================================
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = createServerClient();

    // Fetch ALL outreach records with their status
    const { data: records, error } = await supabase
      .from('outreach_records')
      .select('id, status, creator_id, batch_id, created_at, updated_at');

    if (error) {
      console.error('[Dashboard] Query error:', error);
      return NextResponse.json({ error: 'Failed to load dashboard stats.' }, { status: 500 });
    }

    const allRecords = records ?? [];

    // Count by status
    const statusCounts: Record<string, number> = {};
    for (const r of allRecords) {
      const status = r.status as string;
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    }

    // Calculate pipeline numbers
    const discovered = allRecords.length;
    const presented = statusCounts['presented'] || 0;
    const approved = (statusCounts['approved'] || 0) + (statusCounts['dm_drafted'] || 0);
    const dmSent = statusCounts['dm_sent'] || 0;
    const replied = statusCounts['replied'] || 0;
    const interested = statusCounts['interested'] || 0;
    const declined = statusCounts['declined'] || 0;
    const noResponse = statusCounts['no_response'] || 0;
    const onboarded = statusCounts['onboarded'] || 0;
    const skipped = statusCounts['skipped'] || 0;

    // Total that have been reviewed (approved + skipped)
    const reviewed = approved + skipped + dmSent + replied + interested + declined + noResponse + onboarded;

    // Calculate rates
    const approvalRate = reviewed > 0 ? Math.round((approved + dmSent + replied + interested + onboarded) / reviewed * 100) : 0;
    const dmSentTotal = dmSent + replied + interested + declined + noResponse + onboarded;
    const sendRate = approved + dmSentTotal > 0 ? Math.round(dmSentTotal / (approved + dmSentTotal) * 100) : 0;
    const replyTotal = replied + interested + declined + onboarded;
    const responseRate = dmSentTotal > 0 ? Math.round(replyTotal / dmSentTotal * 100) : 0;
    const interestRate = replyTotal > 0 ? Math.round((interested + onboarded) / replyTotal * 100) : 0;

    // Stats for the cards
    const stats = [
      {
        label: 'Discovered',
        value: discovered,
        change: `${presented} pending review`,
        color: 'text-gray-900',
      },
      {
        label: 'Approved',
        value: approved + dmSentTotal,
        change: reviewed > 0 ? `${approvalRate}% approval rate` : 'No reviews yet',
        color: 'text-blue-600',
      },
      {
        label: 'DMs Sent',
        value: dmSentTotal,
        change: dmSentTotal > 0 ? `${sendRate}% of approved` : 'None sent yet',
        color: 'text-purple-600',
      },
      {
        label: 'Replies',
        value: replyTotal,
        change: dmSentTotal > 0 ? `${responseRate}% response rate` : 'Awaiting replies',
        color: 'text-amber-600',
      },
      {
        label: 'Interested',
        value: interested + onboarded,
        change: replyTotal > 0 ? `${interestRate}% of replies` : 'None yet',
        color: 'text-emerald-600',
      },
      {
        label: 'Onboarded',
        value: onboarded,
        change: onboarded > 0 ? `${Math.round(onboarded / discovered * 100)}% conversion` : 'None yet',
        color: 'text-ocean-600',
      },
    ];

    // Pipeline funnel data
    const maxCount = Math.max(discovered, 1);
    const pipeline = [
      { label: 'Discovered', count: discovered, color: 'bg-gray-400', percent: 100 },
      { label: 'Presented', count: presented + reviewed, color: 'bg-brand-400', percent: Math.round((presented + reviewed) / maxCount * 100) },
      { label: 'Approved', count: approved + dmSentTotal, color: 'bg-blue-500', percent: Math.round((approved + dmSentTotal) / maxCount * 100) },
      { label: 'DM Sent', count: dmSentTotal, color: 'bg-purple-500', percent: Math.round(dmSentTotal / maxCount * 100) },
      { label: 'Replied', count: replyTotal, color: 'bg-amber-500', percent: Math.round(replyTotal / maxCount * 100) },
      { label: 'Interested', count: interested + onboarded, color: 'bg-emerald-500', percent: Math.round((interested + onboarded) / maxCount * 100) },
      { label: 'Onboarded', count: onboarded, color: 'bg-ocean-500', percent: Math.round(onboarded / maxCount * 100) },
    ];

    // Recent activity (last 5 actions)
    const recentRecords = allRecords
      .filter(r => r.status !== 'discovered' && r.status !== 'scored')
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 5);

    // Fetch creator names for recent activity
    let recentActivity: { status: string; username: string; updatedAt: string }[] = [];
    if (recentRecords.length > 0) {
      const creatorIds = recentRecords.map(r => r.creator_id);
      const { data: creators } = await supabase
        .from('creators')
        .select('id, instagram_username')
        .in('id', creatorIds);

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
        discovered,
        presented,
        approved,
        skipped,
        dmSent: dmSentTotal,
        replied: replyTotal,
        interested,
        onboarded,
      },
    });
  } catch (error) {
    console.error('[Dashboard] Error:', error);
    return NextResponse.json({ error: 'Failed to load dashboard.' }, { status: 500 });
  }
}
