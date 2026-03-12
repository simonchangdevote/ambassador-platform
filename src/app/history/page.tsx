// ============================================================
// HISTORY & ARCHIVE — View all past outreach decisions
// Includes: approved, skipped, and completed outreach
// ============================================================
'use client';

import { useState } from 'react';
import type { OutreachStatus } from '@/types';

interface HistoryItem {
  id: string;
  username: string;
  fullName?: string;
  followers: number;
  score: number;
  status: OutreachStatus;
  batchWeek: string;
  processedAt: string;
  responseNote?: string;
}

// Placeholder data — replace with Supabase query
const MOCK_HISTORY: HistoryItem[] = [
  {
    id: '1', username: 'reef_hunter_au', fullName: 'Sam Torres', followers: 8200,
    score: 7.8, status: 'interested', batchWeek: 'Week 10', processedAt: '2026-03-05',
    responseNote: 'Super keen! Wants to chat about wetsuit collabs.',
  },
  {
    id: '2', username: 'deep_blue_diver', fullName: 'Mia Chen', followers: 15300,
    score: 6.5, status: 'no_response', batchWeek: 'Week 10', processedAt: '2026-03-04',
  },
  {
    id: '3', username: 'coastalvibes_', followers: 4100,
    score: 5.2, status: 'skipped', batchWeek: 'Week 9', processedAt: '2026-02-27',
  },
  {
    id: '4', username: 'spearoqueen', fullName: 'Jess Nguyen', followers: 22500,
    score: 8.9, status: 'onboarded', batchWeek: 'Week 8', processedAt: '2026-02-20',
    responseNote: 'Ambassador agreement signed. Sent starter gear pack.',
  },
];

const STATUS_COLORS: Record<string, string> = {
  approved: 'bg-blue-100 text-blue-700',
  skipped: 'bg-gray-100 text-gray-600',
  dm_sent: 'bg-purple-100 text-purple-700',
  replied: 'bg-amber-100 text-amber-700',
  interested: 'bg-emerald-100 text-emerald-700',
  declined: 'bg-red-100 text-red-700',
  no_response: 'bg-gray-100 text-gray-500',
  onboarded: 'bg-ocean-100 text-ocean-700',
};

export default function HistoryPage() {
  const [filter, setFilter] = useState<'all' | 'reached_out' | 'skipped'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = MOCK_HISTORY.filter(item => {
    if (filter === 'reached_out' && item.status === 'skipped') return false;
    if (filter === 'skipped' && item.status !== 'skipped') return false;
    if (searchQuery && !item.username.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">History &amp; Archive</h1>
        <p className="text-gray-500 mt-1">
          All creators you&apos;ve reviewed, reached out to, or skipped.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex gap-2">
          {(['all', 'reached_out', 'skipped'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm rounded-lg transition-colors
                ${filter === f
                  ? 'bg-gray-900 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              {f === 'all' ? 'All' : f === 'reached_out' ? 'Reached Out' : 'Skipped'}
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
              <th className="text-left px-6 py-3 font-medium text-gray-500">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(item => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">@{item.username}</div>
                  {item.fullName && (
                    <div className="text-gray-500 text-xs">{item.fullName}</div>
                  )}
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {item.followers >= 1000
                    ? `${(item.followers / 1000).toFixed(1)}K`
                    : item.followers}
                </td>
                <td className="px-6 py-4">
                  <span className="font-semibold">{item.score.toFixed(1)}</span>
                  <span className="text-gray-400">/10</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[item.status] ?? 'bg-gray-100'}`}>
                    {item.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-500">{item.batchWeek}</td>
                <td className="px-6 py-4 text-gray-500 max-w-xs truncate">
                  {item.responseNote ?? '—'}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                  No records match your filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
