// ============================================================
// WEEKLY CANDIDATES — Review and approve/skip creators
// Shows minimum 10 candidates per week with social links
// and profile verification status
// ============================================================
'use client';

import { useState } from 'react';
import CandidateCard from '@/components/CandidateCard';
import type { CandidateCard as CandidateCardType } from '@/types';

// ============================================================
// IMPORTANT: These are EXAMPLE candidates showing the UI layout.
// In production, this data comes from Supabase after scouting.
//
// To connect real data:
// 1. Set up Apify API token in Vercel environment variables
// 2. Run a scouting cycle via the Refresh button or /api/scout
// 3. The system will discover, verify, and score real creators
// 4. Only verified profiles (confirmed to exist) are shown
// ============================================================

function createExampleCandidate(
  rank: number,
  username: string,
  fullName: string,
  bio: string,
  followers: number,
  engagement: number,
  reelViews: number,
  reelsPercent: number,
  hashtags: string[],
  overallScore: number,
  scores: { cq: number; en: number; as: number; rf: number; bf: number },
  socialLinks: { instagram?: string; tiktok?: string; youtube?: string; facebook?: string },
  verified: boolean
): CandidateCardType {
  return {
    rank,
    creator: {
      id: String(rank),
      instagram_username: username,
      full_name: fullName,
      bio,
      profile_pic_url: '',
      followers_count: followers,
      following_count: Math.round(followers * 0.15),
      posts_count: Math.round(Math.random() * 400 + 100),
      is_verified: false,
      is_business_account: false,
      engagement_rate: engagement,
      avg_reel_views: reelViews,
      reels_percentage: reelsPercent,
      recent_hashtags: hashtags,
      instagram_url: socialLinks.instagram || `https://www.instagram.com/${username}/`,
      tiktok_url: socialLinks.tiktok,
      youtube_url: socialLinks.youtube,
      facebook_url: socialLinks.facebook,
      is_profile_verified: verified,
      verified_at: verified ? new Date().toISOString() : undefined,
      discovered_at: new Date().toISOString(),
      last_checked_at: new Date().toISOString(),
      source_hashtags: ['spearfishing', 'australia'],
    },
    score: {
      id: String(rank),
      creator_id: String(rank),
      batch_id: '1',
      content_quality_score: scores.cq,
      engagement_score: scores.en,
      audience_size_score: scores.as,
      reels_focus_score: scores.rf,
      brand_fit_score: scores.bf,
      overall_score: overallScore,
      scored_at: new Date().toISOString(),
    },
    outreach: {
      id: String(rank),
      creator_id: String(rank),
      batch_id: '1',
      status: 'presented',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    example_reels: [],
    top_hashtags: hashtags.slice(0, 5),
  };
}

// 10 example candidates — replace with Supabase data in production
const EXAMPLE_CANDIDATES: CandidateCardType[] = [
  createExampleCandidate(
    1, 'example_creator_1', 'Creator One',
    'Example creator — replace with real data from Apify scouting',
    14200, 5.8, 9200, 78,
    ['spearfishing', 'freediving', 'cairns', 'reeflife', 'australia'],
    8.4, { cq: 7.5, en: 8.5, as: 8.2, rf: 8.8, bf: 9.0 },
    { instagram: 'https://www.instagram.com/example/' }, true
  ),
  createExampleCandidate(
    2, 'example_creator_2', 'Creator Two',
    'Example creator — replace with real data from Apify scouting',
    8700, 6.1, 7400, 82,
    ['spearfishing', 'spearo', 'underwaterhunting', 'queensland'],
    8.1, { cq: 7.2, en: 8.8, as: 7.5, rf: 9.0, bf: 8.5 },
    { instagram: 'https://www.instagram.com/example/' }, true
  ),
  createExampleCandidate(
    3, 'example_creator_3', 'Creator Three',
    'Example creator — replace with real data from Apify scouting',
    22100, 4.2, 15600, 65,
    ['freediving', 'oceanlife', 'australia', 'divinglife', 'reeflife'],
    7.8, { cq: 8.0, en: 7.0, as: 8.8, rf: 7.2, bf: 8.0 },
    { instagram: 'https://www.instagram.com/example/', youtube: 'https://youtube.com/@example' }, true
  ),
  createExampleCandidate(
    4, 'example_creator_4', 'Creator Four',
    'Example creator — replace with real data from Apify scouting',
    5400, 7.3, 4800, 88,
    ['spearfishing', 'catchandcook', 'australia', 'spearo'],
    7.5, { cq: 6.8, en: 9.0, as: 6.5, rf: 9.2, bf: 7.5 },
    { instagram: 'https://www.instagram.com/example/', tiktok: 'https://tiktok.com/@example' }, true
  ),
  createExampleCandidate(
    5, 'example_creator_5', 'Creator Five',
    'Example creator — replace with real data from Apify scouting',
    31500, 3.5, 18200, 55,
    ['diving', 'underwaterphotography', 'greatbarrierreef', 'australia'],
    7.2, { cq: 8.5, en: 6.2, as: 8.5, rf: 6.0, bf: 7.8 },
    { instagram: 'https://www.instagram.com/example/' }, true
  ),
  createExampleCandidate(
    6, 'example_creator_6', 'Creator Six',
    'Example creator — replace with real data from Apify scouting',
    9800, 4.8, 6300, 70,
    ['spearfishing', 'saltlife', 'australia', 'oceanlife'],
    6.9, { cq: 6.5, en: 7.5, as: 7.8, rf: 7.5, bf: 6.8 },
    { instagram: 'https://www.instagram.com/example/' }, true
  ),
  createExampleCandidate(
    7, 'example_creator_7', 'Creator Seven',
    'Example creator — replace with real data from Apify scouting',
    6200, 5.5, 3900, 75,
    ['freediving', 'apnea', 'australia', 'oceanlife', 'coastalliving'],
    6.7, { cq: 6.2, en: 7.8, as: 7.0, rf: 7.8, bf: 6.0 },
    { instagram: 'https://www.instagram.com/example/', facebook: 'https://facebook.com/example' }, true
  ),
  createExampleCandidate(
    8, 'example_creator_8', 'Creator Eight',
    'Example creator — replace with real data from Apify scouting',
    18300, 3.8, 11200, 60,
    ['spearfishing', 'fishinglife', 'australia', 'catchandcook'],
    6.5, { cq: 7.0, en: 6.5, as: 8.5, rf: 6.5, bf: 6.2 },
    { instagram: 'https://www.instagram.com/example/' }, true
  ),
  createExampleCandidate(
    9, 'example_creator_9', 'Creator Nine',
    'Example creator — replace with real data from Apify scouting',
    3800, 8.2, 3200, 90,
    ['spearo', 'spearfishing', 'freediving', 'australia'],
    6.3, { cq: 5.8, en: 9.2, as: 5.5, rf: 9.5, bf: 6.0 },
    { instagram: 'https://www.instagram.com/example/', tiktok: 'https://tiktok.com/@example' }, true
  ),
  createExampleCandidate(
    10, 'example_creator_10', 'Creator Ten',
    'Example creator — replace with real data from Apify scouting',
    11500, 4.0, 5800, 50,
    ['diving', 'oceanlife', 'australia', 'beachlife'],
    5.8, { cq: 6.0, en: 6.8, as: 8.0, rf: 5.5, bf: 5.2 },
    { instagram: 'https://www.instagram.com/example/' }, false
  ),
];

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState(EXAMPLE_CANDIDATES);
  const [isLoading, setIsLoading] = useState(false);

  const pendingCandidates = candidates.filter(c => c.outreach.status === 'presented');
  const processedCount = candidates.length - pendingCandidates.length;

  function handleApprove(creatorId: string) {
    setCandidates(prev =>
      prev.map(c =>
        c.creator.id === creatorId
          ? { ...c, outreach: { ...c.outreach, status: 'approved' } }
          : c
      )
    );
    // TODO: Update Supabase outreach_records status to 'approved'
    // TODO: Generate DM message and store in outreach_records.dm_message
  }

  function handleSkip(creatorId: string) {
    setCandidates(prev =>
      prev.map(c =>
        c.creator.id === creatorId
          ? { ...c, outreach: { ...c.outreach, status: 'skipped' } }
          : c
      )
    );
    // TODO: Update Supabase outreach_records status to 'skipped'
  }

  async function handleRefreshList() {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call:
      // const res = await fetch('/api/scout', { method: 'POST' });
      // const data = await res.json();
      // setCandidates(data.candidates);
      alert(
        'To fetch real creators, you need to:\n\n' +
        '1. Set up an Apify account at apify.com\n' +
        '2. Add your APIFY_API_TOKEN to Vercel environment variables\n' +
        '3. Click Refresh again\n\n' +
        'The system will then scout Instagram for real creators, verify they exist, ' +
        'score them, and show the top 10 here.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Weekly Candidates</h1>
          <p className="text-gray-500 mt-1">
            {candidates.length} candidates found.
            {processedCount > 0 && ` ${processedCount} processed.`}
          </p>
        </div>

        {/* Refresh Button — always visible */}
        <button
          onClick={handleRefreshList}
          disabled={isLoading}
          className="px-5 py-2.5 bg-brand-600 text-white text-sm font-medium
                     rounded-lg hover:bg-brand-700 transition-colors flex items-center gap-2
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10"
                        stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Scouting...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0
                     0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh — Find New Ambassadors
            </>
          )}
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <p className="text-blue-800 text-sm">
          <strong>Note:</strong> These are example candidates showing the platform layout.
          To discover real creators, connect your Apify API token in Settings.
          The system will then scout Instagram, verify each profile exists, and show only
          confirmed creators with their social media links.
        </p>
      </div>

      {/* All processed state */}
      {pendingCandidates.length === 0 && (
        <div className="bg-ocean-50 border border-ocean-200 rounded-xl p-8 text-center mb-8">
          <p className="text-ocean-800 font-semibold text-lg">All candidates reviewed!</p>
          <p className="text-ocean-600 mt-2">
            Click &quot;Refresh&quot; above to scout for new ambassadors, or check the
            <a href="/history" className="underline ml-1">History</a> tab for past decisions.
          </p>
        </div>
      )}

      {/* Candidate Cards */}
      <div className="space-y-6">
        {pendingCandidates.map(candidate => (
          <CandidateCard
            key={candidate.creator.id}
            candidate={candidate}
            onApprove={() => handleApprove(candidate.creator.id)}
            onSkip={() => handleSkip(candidate.creator.id)}
          />
        ))}
      </div>
    </div>
  );
}
