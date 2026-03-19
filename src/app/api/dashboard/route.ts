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
import { calculatePipelineCost } from '@/lib/ambassador-tiers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createServerClient();

    // Fetch ALL records then filter in JS to avoid Supabase query filter issues
    const { data: allRecordsRaw, error } = await supabase
      .from('outreach_records')
      .select('id, status, creator_id, updated_at');

    if (error) {
      console.error('[Dashboard] Query error:', error);
      return NextResponse.json({ error: 'Failed to load dashboard stats.' }, { status: 500 });
    }

    // Filter out 'presented' in JavaScript instead of Supabase
    const records = (allRecordsRaw ?? []).filter(r => r.status !== 'presented');

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

    // ----- PIPELINE COST CALCULATION -----
    // Get tier costs from brand_config
    const { data: brandConfig } = await supabase
      .from('brand_config')
      .select('tier_cost_high_profile, tier_cost_brand_ambassador, tier_cost_community_ambassador')
      .limit(1)
      .single();

    const tierCosts = {
      high_profile: brandConfig?.tier_cost_high_profile ?? 300,
      brand_ambassador: brandConfig?.tier_cost_brand_ambassador ?? 200,
      community_ambassador: brandConfig?.tier_cost_community_ambassador ?? 50,
    };

    // Get follower counts for all pipeline creators
    const allCreatorIds = [...uniqueCreators];
    let pipelineCostData = { total: 0, breakdown: { high_profile: { count: 0, subtotal: 0 }, brand_ambassador: { count: 0, subtotal: 0 }, community_ambassador: { count: 0, subtotal: 0 } } };

    if (allCreatorIds.length > 0) {
      const { data: creatorsWithFollowers } = await supabase
        .from('creators')
        .select('id, followers_count')
        .in('id', allCreatorIds);

      if (creatorsWithFollowers && creatorsWithFollowers.length > 0) {
        // Build a map of creator_id -> followers_count
        const followerMap = new Map(
          creatorsWithFollowers.map((c: { id: string; followers_count: number }) => [c.id, c.followers_count])
        );

        // Build array with followers + current status for cost calculation
        const creatorsForCost = records.map(r => ({
          followers_count: followerMap.get(r.creator_id as string) ?? 0,
          status: r.status as string,
        }));

        pipelineCostData = calculatePipelineCost(creatorsForCost, tierCosts);
      }
    }

    const response = NextResponse.json({
      stats,
      pipeline,
      recentActivity,
      pipelineCost: pipelineCostData,
      tierCosts,
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
    });

    // Prevent Vercel edge and browser caching
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  } catch (error) {
    console.error('[Dashboard] Error:', error);
    return NextResponse.json({ error: 'Failed to load dashboard.' }, { status: 500 });
  }
}
