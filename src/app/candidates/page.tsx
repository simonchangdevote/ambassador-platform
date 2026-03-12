// ============================================================
// WEEKLY CANDIDATES — Review and approve/skip creators
// ============================================================
'use client';

import { useState } from 'react';
import CandidateCard from '@/components/CandidateCard';
import type { CandidateCard as CandidateCardType } from '@/types';

// Placeholder data — replace with Supabase query
const MOCK_CANDIDATES: CandidateCardType[] = [
  {
    rank: 1,
    creator: {
      id: '1',
      instagram_username: 'ocean_spearo',
      full_name: 'Jake Mitchell',
      bio: 'Spearfishing | Freediving | Cairns, QLD | Living the salt life',
      profile_pic_url: '',
      followers_count: 12400,
      following_count: 890,
      posts_count: 342,
      is_verified: false,
      is_business_account: false,
      engagement_rate: 5.2,
      avg_reel_views: 8900,
      reels_percentage: 72,
      recent_hashtags: ['spearfishing', 'freediving', 'cairns', 'reeflife', 'australia'],
      discovered_at: new Date().toISOString(),
      last_checked_at: new Date().toISOString(),
      source_hashtags: ['spearfishing', 'australia'],
    },
    score: {
      id: '1',
      creator_id: '1',
      batch_id: '1',
      content_quality_score: 7.2,
      engagement_score: 8.1,
      audience_size_score: 8.5,
      reels_focus_score: 7.8,
      brand_fit_score: 9.0,
      overall_score: 8.1,
      scored_at: new Date().toISOString(),
    },
    outreach: {
      id: '1',
      creator_id: '1',
      batch_id: '1',
      status: 'presented',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    example_reels: [],
    top_hashtags: ['spearfishing', 'freediving', 'cairns', 'reeflife'],
  },
  // Add more mock candidates as needed
];

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState(MOCK_CANDIDATES);
  const [allProcessed, setAllProcessed] = useState(false);

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

  function handleRefreshList() {
    // TODO: Trigger a new scouting run via API
    // POST /api/scout — starts a new weekly batch
    alert('Triggering new scouting run... This will fetch fresh candidates.');
    setAllProcessed(false);
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Weekly Candidates</h1>
          <p className="text-gray-500 mt-1">
            Week 11, 2026 — {candidates.length} candidates found.
            {processedCount > 0 && ` ${processedCount} processed.`}
          </p>
        </div>

        {/* Refresh Button — visible when all candidates are processed */}
        {pendingCandidates.length === 0 && (
          <button
            onClick={handleRefreshList}
            className="px-5 py-2.5 bg-brand-600 text-white text-sm font-medium
                       rounded-lg hover:bg-brand-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0
                   0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh — Find New Ambassadors
          </button>
        )}
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
