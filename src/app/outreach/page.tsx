// ============================================================
// OUTREACH — Manage DM sending and response tracking
// ============================================================
'use client';

import { useState } from 'react';
import OutreachMessage from '@/components/OutreachMessage';
import type { OutreachStatus } from '@/types';

interface OutreachItem {
  id: string;
  username: string;
  fullName: string;
  score: number;
  status: OutreachStatus;
  dmMessage: string;
  dmSentAt?: string;
  responseNote?: string;
}

// Placeholder data
const MOCK_OUTREACH: OutreachItem[] = [
  {
    id: '1',
    username: 'ocean_spearo',
    fullName: 'Jake Mitchell',
    score: 8.1,
    status: 'approved',
    dmMessage: `Hey Jake! We've been checking out your content and love what you're doing.\n\nWe're always on the lookout for passionate creators in the ocean/spearfishing/diving space and we'd love to explore working together.\n\nWe're particularly looking for creators who enjoy making reels and video content, and we'd be keen to chat about sending you some gear and building a partnership.\n\nLet us know if you'd be interested!`,
  },
];

const STATUS_OPTIONS: { value: OutreachStatus; label: string; color: string }[] = [
  { value: 'approved', label: 'Ready to Send', color: 'bg-blue-100 text-blue-700' },
  { value: 'dm_sent', label: 'DM Sent', color: 'bg-purple-100 text-purple-700' },
  { value: 'replied', label: 'Replied', color: 'bg-amber-100 text-amber-700' },
  { value: 'interested', label: 'Interested', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'declined', label: 'Declined', color: 'bg-red-100 text-red-700' },
  { value: 'no_response', label: 'No Response', color: 'bg-gray-100 text-gray-700' },
  { value: 'onboarded', label: 'Onboarded', color: 'bg-ocean-100 text-ocean-700' },
];

export default function OutreachPage() {
  const [items, setItems] = useState(MOCK_OUTREACH);
  const [filter, setFilter] = useState<OutreachStatus | 'all'>('all');

  const filtered = filter === 'all' ? items : items.filter(i => i.status === filter);

  function updateStatus(id: string, newStatus: OutreachStatus) {
    setItems(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, status: newStatus, dmSentAt: newStatus === 'dm_sent' ? new Date().toISOString() : item.dmSentAt }
          : item
      )
    );
    // TODO: Update Supabase outreach_records
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Outreach Pipeline</h1>
        <p className="text-gray-500 mt-1">
          Manage your DM outreach and track creator responses.
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

      {/* Outreach Cards */}
      <div className="space-y-4">
        {filtered.map(item => (
          <OutreachMessage
            key={item.id}
            item={item}
            statusOptions={STATUS_OPTIONS}
            onStatusChange={(newStatus) => updateStatus(item.id, newStatus)}
          />
        ))}
        {filtered.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-500">No creators in this status.</p>
          </div>
        )}
      </div>
    </div>
  );
}
