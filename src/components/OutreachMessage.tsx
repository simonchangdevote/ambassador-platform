// ============================================================
// OUTREACH MESSAGE — Shows DM text with copy button + status tracker
// ============================================================
'use client';

import { useState } from 'react';
import type { OutreachStatus } from '@/types';

interface OutreachItem {
  id: string;
  username: string;
  fullName?: string;
  score: number;
  status: OutreachStatus;
  dmMessage: string;
  dmSentAt?: string;
  responseNote?: string;
}

interface StatusOption {
  value: OutreachStatus;
  label: string;
  color: string;
}

interface Props {
  item: OutreachItem;
  statusOptions: StatusOption[];
  onStatusChange: (newStatus: OutreachStatus) => void;
}

export default function OutreachMessage({ item, statusOptions, onStatusChange }: Props) {
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState(item.responseNote ?? '');

  async function handleCopy() {
    await navigator.clipboard.writeText(item.dmMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center
                         text-gray-400 font-bold">
            {item.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">@{item.username}</h3>
            {item.fullName && <p className="text-sm text-gray-500">{item.fullName}</p>}
          </div>
          <span className="text-sm font-medium text-gray-400">
            Score: {item.score.toFixed(1)}/10
          </span>
        </div>

        {/* Status Dropdown */}
        <select
          value={item.status}
          onChange={(e) => onStatusChange(e.target.value as OutreachStatus)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          {statusOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* DM Message */}
      <div className="bg-gray-50 rounded-lg p-4 relative">
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.dmMessage}</p>
        <button
          onClick={handleCopy}
          className="absolute top-3 right-3 px-3 py-1 text-xs font-medium
                     bg-white border border-gray-200 rounded-md hover:bg-gray-50
                     transition-colors"
        >
          {copied ? 'Copied!' : 'Copy Message'}
        </button>
      </div>

      {/* Quick Actions Row */}
      <div className="mt-4 flex items-center gap-3">
        <a
          href={`https://instagram.com/${item.username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-brand-600 hover:text-brand-700 font-medium"
        >
          Open Instagram Profile →
        </a>

        {(item.status === 'approved' || item.status === 'dm_drafted') && (
          <button
            onClick={() => onStatusChange('dm_sent')}
            className="text-sm px-3 py-1 bg-purple-100 text-purple-700 rounded-md
                       hover:bg-purple-200 transition-colors"
          >
            Mark as Sent
          </button>
        )}
      </div>

      {/* Response Notes */}
      {['replied', 'interested', 'declined', 'onboarded'].includes(item.status) && (
        <div className="mt-4">
          <label className="text-xs font-medium text-gray-500">Response Notes</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add notes about their response..."
            rows={2}
            className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />
        </div>
      )}
    </div>
  );
}
