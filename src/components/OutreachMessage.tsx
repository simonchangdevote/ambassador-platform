// ============================================================
// OUTREACH MESSAGE — Shows DM text with copy button + status tracker
// Includes quick action buttons: Mark as Sent, Decline
// Shows ambassador tier badge with cost
// ============================================================
'use client';

import { useState } from 'react';
import { getAmbassadorTier, type TierCosts } from '@/lib/ambassador-tiers';
import type { OutreachStatus } from '@/types';

interface OutreachItem {
  id: string;
  username: string;
  fullName?: string;
  followers?: number;
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
  tierCosts?: TierCosts;
}

export default function OutreachMessage({ item, statusOptions, onStatusChange, tierCosts }: Props) {
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState(item.responseNote ?? '');
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);

  const tier = getAmbassadorTier(item.followers ?? 0, tierCosts);

  async function handleCopy() {
    await navigator.clipboard.writeText(item.dmMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDecline() {
    onStatusChange('declined');
    setShowDeclineConfirm(false);
  }

  return (
    <div className={`bg-white rounded-xl border p-6 ${
      item.status === 'declined' ? 'border-red-200 opacity-75' : 'border-gray-200'
    }`}>
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
          {/* Ambassador Tier Badge */}
          <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${tier.color}`}>
            {tier.name} &middot; ${tier.cost}
          </span>
          {/* Follower count */}
          {item.followers != null && (
            <span className="text-xs text-gray-400">
              {item.followers >= 1000
                ? `${(item.followers / 1000).toFixed(1).replace(/\.0$/, '')}K`
                : item.followers} followers
            </span>
          )}
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

        {/* Decline button — shown for all active statuses (not already declined/onboarded) */}
        {!['declined', 'onboarded'].includes(item.status) && (
          <>
            {!showDeclineConfirm ? (
              <button
                onClick={() => setShowDeclineConfirm(true)}
                className="text-sm px-3 py-1 bg-red-50 text-red-600 rounded-md
                           hover:bg-red-100 transition-colors ml-auto"
              >
                Decline
              </button>
            ) : (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-red-600">Are you sure?</span>
                <button
                  onClick={handleDecline}
                  className="text-sm px-3 py-1 bg-red-600 text-white rounded-md
                             hover:bg-red-700 transition-colors"
                >
                  Yes, Decline
                </button>
                <button
                  onClick={() => setShowDeclineConfirm(false)}
                  className="text-sm px-3 py-1 bg-gray-100 text-gray-600 rounded-md
                             hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Declined banner */}
      {item.status === 'declined' && (
        <div className="mt-4 bg-red-50 border border-red-100 rounded-lg p-3">
          <p className="text-sm text-red-700 font-medium">This creator has been declined.</p>
          <p className="text-xs text-red-500 mt-1">They will appear in History &amp; Archive.</p>
        </div>
      )}

      {/* Response Notes */}
      {['replied', 'interested', 'declined', 'no_response', 'onboarded'].includes(item.status) && (
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
