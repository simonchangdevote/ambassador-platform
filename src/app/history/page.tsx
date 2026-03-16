// ============================================================
// HISTORY & ARCHIVE — View all reviewed creators from Supabase
// Filters by current status: All, Reached Out, Skipped, Declined
// Counts are exclusive — based on each creator's current status
// ============================================================
'use client';

import { useState, useEffect } from 'react';

interface HistoryItem {
  outreach_id: string;
  status: string;
  dm_message?: string;
  response_notes?: string;
  updated_at: string;
  batch_week: string;
  creator: {
    id: string;
    username: string;
    full_name?: string;
    followers: number;
    engagement_rate?: number;
    instagram_url?: string;
    is_verified: boolean;
  };
  score: number;
}

const STATUS_COLORS: Record<string, string> = {
  approved: 'bg-blue-100 text-blue-700',
  skipped: 'bg-gray-100 text-gray-600',
  dm_drafted: 'bg-indigo-100 text-indigo-700',
  dm_sent: 'bg-purple-100 text-purple-700',
  replied: 'bg-amber-100 text-amber-700',
  interested: 'bg-emerald-100 text-emerald-700',
  declined: 'bg-red-100 text-red-700',
  no_response: 'bg-gray-100 text-gray-500',
  onboarded: 'bg-emerald-100 text-emerald-700',
};

const STATUS_LABELS: Record<string, string> = {
  approved: 'Approved',
  skipped: 'Skipped',
  dm_drafted: 'DM Drafted',
  dm_sent: 'DM Sent',
  replied: 'Replied',
  interested: 'Interested',
  declined: 'Declined',
  no_response: 'No Response',
  onboarded: 'Onboarded',
};

// "Reached Out" = all pipeline statuses (approved through onboarded, excluding declined)
const REACHED_OUT_STATUSES = ['approved', 'dm_drafted', 'dm_sent', 'replied', 'interested', 'no_response', 'onboarded'];

type FilterType = 'all' | 'reached_out' | 'skipped' | 'declined';

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch(`/api/history?_t=${Date.now()}`, { cache: 'no-store' });
        const data = await res.json();
        if (data.history) {
          setHistory(data.history);
        }
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadHistory();
  }, []);

  // Filter by current status (exclusive)
  const filtered = history.filter(item => {
    // Search filter
    if (searchQuery && !item.creator.username.toLowerCase().includes(searchQuery.toLowerCase())) return false;

    // Status filter — based on CURRENT status
    if (filter === 'reached_out') return REACHED_OUT_STATUSES.includes(item.status);
    if (filter === 'skipped') return item.status === 'skipped';
    if (filter === 'declined') return item.status === 'declined';
    return true; // 'all'
  });

  // Counts based on current status (exclusive)
  const reachedOutCount = history.filter(h => REACHED_OUT_STATUSES.includes(h.status)).length;
  const skippedCount = history.filter(h => h.status === 'skipped').length;
  const declinedCount = history.filter(h => h.status === 'declined').length;

  const filterButtons: { key: FilterType; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: history.length },
    { key: 'reached_out', label: 'Reached Out', count: reachedOutCount },
    { key: 'skipped', label: 'Skipped', count: skippedCount },
    { key: 'declined', label: 'Declined', count: declinedCount },
  ];

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex justify-center py-12">
          <svg className="w-8 h-8 animate-spin text-brand-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10"
                    stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">History &amp; Archive</h1>
        <p className="text-gray-500 mt-1">
          {history.length > 0
            ? `${history.length} creators reviewed — ${reachedOutCount} reached out, ${skippedCount} skipped${declinedCount > 0 ? `, ${declinedCount} declined` : ''}.`
            : 'No reviewed creators yet. Approve or skip candidates to see them here.'}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex gap-2">
          {filterButtons.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 text-sm rounded-lg transition-colors
                ${filter === f.key
                  ? f.key === 'declined'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-900 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search by username..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-4 py-2 text-sm border border-gray-200 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      </div>

      {/* History Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Creator</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Followers</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Score</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Status</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Week</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(item => (
              <tr key={item.outreach_id} className={`hover:bg-gray-50 ${item.status === 'declined' ? 'opacity-60' : ''}`}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-gray-900">
                      @{item.creator.username}
                      {item.creator.is_verified && (
                        <span className="ml-1 text-blue-500">✓</span>
                      )}
                    </div>
                  </div>
                  {item.creator.full_name && (
                    <div className="text-gray-500 text-xs">{item.creator.full_name}</div>
                  )}
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {formatNumber(item.creator.followers)}
                </td>
                <td className="px-6 py-4">
                  <span className="font-semibold">{item.score.toFixed(1)}</span>
                  <span className="text-gray-400">/10</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[item.status] ?? 'bg-gray-100'}`}>
                    {STATUS_LABELS[item.status] ?? item.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-500">{item.batch_week}</td>
                <td className="px-6 py-4">
                  {item.creator.instagram_url && (
                    <a
                      href={item.creator.instagram_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white
                                text-xs font-medium rounded-full hover:opacity-90"
                    >
                      View Profile
                    </a>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                  {history.length === 0
                    ? 'No reviewed creators yet. Approve or skip candidates from the Candidates page.'
                    : 'No records match your filter.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}
