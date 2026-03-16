// ============================================================
// OUTREACH — Manage DM sending and response tracking
// Fetches REAL data from Supabase via /api/outreach
// ============================================================
'use client';

import { useState, useEffect, useCallback } from 'react';
import OutreachMessage from '@/components/OutreachMessage';
import type { OutreachStatus } from '@/types';

interface OutreachItem {
  id: string;
  username: string;
  fullName: string;
  profilePic?: string;
  followers?: number;
  engagementRate?: number;
  instagramUrl?: string;
  score: number;
  status: OutreachStatus;
  dmMessage: string;
  dmSentAt?: string;
  responseNote?: string;
  batchWeek?: string;
  updatedAt?: string;
}

const STATUS_OPTIONS: { value: OutreachStatus; label: string; color: string }[] = [
  { value: 'approved', label: 'Ready to Send', color: 'bg-blue-100 text-blue-700' },
  { value: 'dm_drafted', label: 'DM Drafted', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'dm_sent', label: 'DM Sent', color: 'bg-purple-100 text-purple-700' },
  { value: 'replied', label: 'Replied', color: 'bg-amber-100 text-amber-700' },
  { value: 'interested', label: 'Interested', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'declined', label: 'Declined', color: 'bg-red-100 text-red-700' },
  { value: 'no_response', label: 'No Response', color: 'bg-gray-100 text-gray-700' },
  { value: 'onboarded', label: 'Onboarded', color: 'bg-ocean-100 text-ocean-700' },
];

export default function OutreachPage() {
  const [items, setItems] = useState<OutreachItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<OutreachStatus | 'all'>('all');

  const fetchOutreach = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/outreach');
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setItems(data.items ?? []);
    } catch {
      setError('Failed to load outreach pipeline. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOutreach();
  }, [fetchOutreach]);

  const filtered = filter === 'all' ? items : items.filter(i => i.status === filter);

  async function updateStatus(id: string, newStatus: OutreachStatus) {
    // Optimistic UI update
    setItems(prev =>
      prev.map(item =>
        item.id === id
          ? {
              ...item,
              status: newStatus,
              dmSentAt: newStatus === 'dm_sent' ? new Date().toISOString() : item.dmSentAt,
            }
          : item
      )
    );

    // Save to Supabase
    try {
      const res = await fetch('/api/outreach', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outreach_id: id,
          status: newStatus,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        // Revert on failure
        fetchOutreach();
      }
    } catch {
      // Revert on error
      fetchOutreach();
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Outreach Pipeline</h1>
        <p className="text-gray-500 mt-1">
          {items.length > 0
            ? `${items.length} creator${items.length !== 1 ? 's' : ''} in your pipeline.`
            : 'Manage your DM outreach and track creator responses.'}
        </p>
      </div>

      {/* Status Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 text-sm rounded-full transition-colors
            ${filter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          All ({items.length})
        </button>
        {STATUS_OPTIONS.map(opt => {
          const count = items.filter(i => i.status === opt.value).length;
          if (count === 0 && filter !== opt.value) return null; // Hide empty statuses
          return (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-3 py-1.5 text-sm rounded-full transition-colors
                ${filter === opt.value ? 'bg-gray-900 text-white' : `${opt.color} hover:opacity-80`}`}
            >
              {opt.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <svg className="w-8 h-8 animate-spin text-brand-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10"
                    stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && items.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500 mb-2">No creators in your outreach pipeline yet.</p>
          <p className="text-sm text-gray-400">
            Approve creators from the{' '}
            <a href="/candidates" className="text-brand-600 hover:underline">Candidates</a>{' '}
            page to add them here.
          </p>
        </div>
      )}

      {/* Outreach Cards */}
      {!isLoading && (
        <div className="space-y-4">
          {filtered.map(item => (
            <OutreachMessage
              key={item.id}
              item={item}
              statusOptions={STATUS_OPTIONS}
              onStatusChange={(newStatus) => updateStatus(item.id, newStatus)}
            />
          ))}
          {filtered.length === 0 && items.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <p className="text-gray-500">No creators in this status.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
