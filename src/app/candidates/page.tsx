'use client';

import { useState, useEffect, useCallback } from 'react';
import CandidateCard from '@/components/CandidateCard';
import type { CandidateCard as CandidateCardType } from '@/types';

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<CandidateCardType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isScouting, setIsScouting] = useState(false);
  const [message, setMessage] = useState('');
  const [dmMessage, setDmMessage] = useState('');
  const [dmUsername, setDmUsername] = useState('');
  const [showDmModal, setShowDmModal] = useState(false);

  const fetchCandidates = useCallback(async function loadCandidates() {
    setIsLoading(true);
    try {
      const res = await fetch('/api/candidates');
      const data = await res.json();
      if (data.candidates && data.candidates.length > 0) {
        setCandidates(data.candidates);
        setMessage('');
      } else {
        setCandidates([]);
        setMessage(data.message || 'No candidates yet. Click Refresh to scout Instagram.');
      }
    } catch (err) {
      console.error(err);
      setMessage('Failed to load candidates. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(function onMount() {
    fetchCandidates();
  }, [fetchCandidates]);

  var pendingCandidates = candidates.filter(function (c) {
    return c.outreach.status === 'presented';
  });

  var processedCount = candidates.filter(function (c) {
    return c.outreach.status === 'approved' || c.outreach.status === 'skipped' || c.outreach.status === 'dm_drafted';
  }).length;

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
        setCandidates(function (prev) {
          return prev.map(function (c) {
            if (c.creator.id === candidate.creator.id) {
              return { ...c, outreach: { ...c.outreach, status: 'approved' as const } };
            }
            return c;
          });
        });
        if (data.dm_message) {
          setDmMessage(data.dm_message);
          setDmUsername(candidate.creator.instagram_username);
          setShowDmModal(true);
        }
      }
    } catch (err) {
      console.error(err);
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
        setCandidates(function (prev) {
          return prev.map(function (c) {
            if (c.creator.id === candidate.creator.id) {
              return { ...c, outreach: { ...c.outreach, status: 'skipped' as const } };
            }
            return c;
          });
        });
      }
    } catch (err) {
      console.error(err);
      alert('Failed to skip candidate. Please try again.');
    }
  }

  async function handleRefreshList() {
    setIsScouting(true);
    setMessage('Scouting Instagram for real creators... This can take 2-5 minutes.');
    try {
      const res = await fetch('/api/scout', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setMessage('Found ' + data.candidates_found + ' verified creators! Loading...');
        await fetchCandidates();
      } else {
        setMessage(data.error || 'Scouting failed. Check your Apify API token.');
      }
    } catch (err) {
      console.error(err);
      setMessage('Scouting failed. Please check your connection and try again.');
    } finally {
      setIsScouting(false);
    }
  }

  function handleCopyDm() {
    navigator.clipboard.writeText(dmMessage);
    alert('DM copied to clipboard! Open Instagram and paste it in the chat.');
  }

  function closeDmModal() {
    setShowDmModal(false);
    setDmMessage('');
    setDmUsername('');
  }

  if (isLoading && candidates.length === 0) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex justify-center py-12">
        <p className="text-gray-500">Loading candidates...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Weekly Candidates</h1>
          <p className="text-gray-500 mt-1">
            {candidates.length > 0
              ? candidates.length + ' candidates found. ' + processedCount + ' processed.'
              : 'No candidates loaded yet.'}
          </p>
        </div>
        <button
          onClick={handleRefreshList}
          disabled={isScouting}
          className="px-5 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isScouting ? 'Scouting Instagram...' : 'Refresh — Find New Ambassadors'}
        </button>
      </div>

      {message && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <p className="text-blue-800 text-sm">{message}</p>
        </div>
      )}

      {candidates.length > 0 && pendingCandidates.length === 0 && (
        <div className="bg-ocean-50 border border-ocean-200 rounded-xl p-8 text-center mb-8">
          <p className="text-ocean-800 font-semibold text-lg">All candidates reviewed!</p>
          <p className="text-ocean-600 mt-2">
            Click Refresh above to scout for new ambassadors, or check the History tab.
          </p>
        </div>
      )}

      <div className="space-y-6">
        {pendingCandidates.map(function (candidate) {
          return (
            <CandidateCard
              key={candidate.creator.id}
              candidate={candidate}
              onApprove={function () { handleApprove(candidate); }}
              onSkip={function () { handleSkip(candidate); }}
            />
          );
        })}
      </div>

      {showDmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              {'DM for @' + dmUsername}
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Copy this message and paste it into your Instagram DM with this creator.
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 text-sm text-gray-700 whitespace-pre-wrap max-h-60 overflow-y-auto">
              {dmMessage}
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={closeDmModal} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                Close
              </button>
              
                href={'https://www.instagram.com/' + dmUsername + '/'}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium rounded-lg hover:opacity-90"
              >
                Open Instagram Profile
              </a>
              <button onClick={handleCopyDm} className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700">
                Copy Message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
