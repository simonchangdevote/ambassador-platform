// ============================================================
// WEEKLY CANDIDATES — Review and approve/skip creators
// Fetches REAL candidates from Supabase via /api/candidates
// ============================================================
'use client';

import { useState, useEffect, useCallback } from 'react';
import CandidateCard from '@/components/CandidateCard';
import type { CandidateCard as CandidateCardType } from '@/types';

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<CandidateCardType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isScouting, setIsScouting] = useState(false);
  const [message, setMessage] = useState('');
  const [dmModal, setDmModal] = useState<{ show: boolean; message: string; username: string }>({
    show: false,
    message: '',
    username: '',
  });

  // Fetch candidates from Supabase on page load
  const fetchCandidates = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/candidates', { cache: 'no-store' });
      const data = await res.json();
      if (data.candidates && data.candidates.length > 0) {
        setCandidates(data.candidates);
        setMessage('');
      } else {
        setCandidates([]);
        setMessage(
          data.message || 'No candidates yet. Click "Refresh — Find New Ambassadors" to scout Instagram.'
        );
      }
    } catch {
      setMessage('Failed to load candidates. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const pendingCandidates = candidates.filter(c => c.outreach.status === 'presented');
  const processedCount = candidates.filter(
    c => c.outreach.status === 'approved' || c.outreach.status === 'skipped' || c.outreach.status === 'dm_drafted'
  ).length;

  async function handleApprove(candidate: CandidateCardType) {
    try {
      const res = await fetch('/api/candidates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outreach_id: candidate.outreach.id,
          creator_id: candidate.creator.id,
          action: 'approve',
        }),
      });
      const data = await res.json();

      if (data.success) {
        // Update local state
        setCandidates(prev =>
          prev.map(c =>
            c.creator.id === candidate.creator.id
              ? { ...c, outreach: { ...c.outreach, status: 'approved' } }
              : c
          )
        );

        // Show DM modal if message was generated
        if (data.dm_message) {
          setDmModal({
            show: true,
            message: data.dm_message,
            username: candidate.creator.instagram_username,
          });
        }
      }
    } catch {
      alert('Failed to approve candidate. Please try again.');
    }
  }

  async function handleSkip(candidate: CandidateCardType) {
    try {
      const res = await fetch('/api/candidates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outreach_id: candidate.outreach.id,
          creator_id: candidate.creator.id,
          action: 'skip',
        }),
      });
      const data = await res.json();

      if (data.success) {
        setCandidates(prev =>
          prev.map(c =>
            c.creator.id === candidate.creator.id
              ? { ...c, outreach: { ...c.outreach, status: 'skipped' } }
              : c
          )
        );
      }
    } catch {
      alert('Failed to skip candidate. Please try again.');
    }
  }

  async function handleRefreshList() {
    setIsScouting(true);
    setMessage('Scouting Instagram for real creators... This can take 2–5 minutes.');
    try {
      const res = await fetch('/api/scout', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        setMessage(`Found ${data.candidates_found} verified creators! Loading...`);
        // Fetch the new candidates
        await fetchCandidates();
      } else {
        setMessage(data.error || 'Scouting failed. Check your Apify API token in Vercel settings.');
      }
    } catch {
      setMessage('Scouting failed. Please check your connection and try again.');
    } finally {
      setIsScouting(false);
    }
  }

  function copyDmToClipboard() {
    navigator.clipboard.writeText(dmModal.message).then(() => {
      alert('DM copied to clipboard! Open Instagram and paste it in the chat.');
    });
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Weekly Candidates</h1>
          <p className="text-gray-500 mt-1">
            {candidates.length > 0
              ? `${candidates.length} candidates found. ${processedCount} processed.`
              : 'No candidates loaded yet.'}
          </p>
        </div>

        {/* Refresh Button — always visible */}
        <button
          onClick={handleRefreshList}
          disabled={isScouting}
          className="px-5 py-2.5 bg-brand-600 text-white text-sm font-medium
                     rounded-lg hover:bg-brand-700 transition-colors flex items-center gap-2
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isScouting ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10"
                        stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Scouting Instagram...
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

      {/* Status / Loading message */}
      {message && (
        <div className={`rounded-xl p-4 mb-6 ${
          isScouting
            ? 'bg-amber-50 border border-amber-200'
            : message.includes('Failed') || message.includes('failed')
            ? 'bg-red-50 border border-red-200'
            : 'bg-blue-50 border border-blue-200'
        }`}>
          <p className={`text-sm ${
            isScouting
              ? 'text-amber-800'
              : message.includes('Failed') || message.includes('failed')
              ? 'text-red-800'
              : 'text-blue-800'
          }`}>
            {isScouting && (
              <span className="inline-block mr-2 animate-pulse">●</span>
            )}
            {message}
          </p>
        </div>
      )}

      {/* Loading spinner */}
      {isLoading && candidates.length === 0 && (
        <div className="flex justify-center py-12">
          <svg className="w-8 h-8 animate-spin text-brand-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10"
                    stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}

      {/* All processed state */}
      {!isLoading && candidates.length > 0 && pendingCandidates.length === 0 && (
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
            onApprove={() => handleApprove(candidate)}
            onSkip={() => handleSkip(candidate)}
          />
        ))}
      </div>

      {/* DM Message Modal */}
      {dmModal.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              DM for @{dmModal.username}
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Copy this message and paste it into your Instagram DM with this creator.
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4
                          text-sm text-gray-700 whitespace-pre-wrap max-h-60 overflow-y-auto">
              {dmModal.message}
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDmModal({ show: false, message: '', username: '' })}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Close
              </button>
              <a
                href={`https://www.instagram.com/${dmModal.username}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white
                          text-sm font-medium rounded-lg hover:opacity-90"
              >
                Open Instagram Profile
              </a>
              <button
                onClick={copyDmToClipboard}
                className="px-4 py-2 bg-brand-600 text-white text-sm font-medium
                          rounded-lg hover:bg-brand-700"
              >
                Copy Message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
