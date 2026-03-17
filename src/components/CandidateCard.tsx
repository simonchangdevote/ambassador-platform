// ============================================================
// CANDIDATE CARD — Displays a single creator candidate
// with score breakdown, reach label, social links, and approve/skip actions
// ============================================================
'use client';

import { useState } from 'react';
import ScoreBreakdown from './ScoreBreakdown';
import type { CandidateCard as CandidateCardType } from '@/types';
import { getScoreColor, getScoreLabel, getReachLabel, getReachLabelColor } from '@/lib/scoring';

interface Props {
  candidate: CandidateCardType;
  onApprove: () => void;
  onSkip: () => void;
  followerRange?: { min: number; max: number };
}

export default function CandidateCard({ candidate, onApprove, onSkip, followerRange }: Props) {
  const { creator, score, top_hashtags, rank } = candidate;
  const [showDetails, setShowDetails] = useState(false);
  const scoreColor = getScoreColor(score.overall_score);
  const scoreLabel = getScoreLabel(score.overall_score);

  // Calculate reach label from filter range
  const reachLabel = followerRange
    ? getReachLabel(creator.followers_count, followerRange.min, followerRange.max)
    : null;
  const reachColor = reachLabel ? getReachLabelColor(reachLabel) : '';

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden
                    hover:border-brand-300 transition-colors">
      <div className="p-6">
        {/* Top Row: Rank + Profile + Score + Actions */}
        <div className="flex items-start gap-6">
          {/* Rank Badge */}
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-100 text-brand-700
                         flex items-center justify-center font-bold text-lg">
            {rank}
          </div>

          {/* Profile Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              {/* Profile Pic Placeholder */}
              <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0 flex items-center
                             justify-center text-gray-400 text-lg font-bold">
                {creator.instagram_username.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">
                    @{creator.instagram_username}
                    {creator.is_verified && (
                      <span className="ml-1 text-blue-500" title="Instagram Verified">✓</span>
                    )}
                  </h3>
                  {/* Profile Verification Badge */}
                  {creator.is_profile_verified ? (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs
                                     rounded-full font-medium" title="Profile confirmed to exist">
                      Verified Profile
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs
                                     rounded-full font-medium" title="Profile not yet verified">
                      Unverified
                    </span>
                  )}
                  {/* Reach Label */}
                  {reachLabel && (
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium border ${reachColor}`}>
                      {reachLabel}
                    </span>
                  )}
                </div>
                {creator.full_name && (
                  <p className="text-sm text-gray-500">{creator.full_name}</p>
                )}
              </div>
            </div>

            {/* Bio */}
            {creator.bio && (
              <p className="mt-2 text-sm text-gray-600 line-clamp-2">{creator.bio}</p>
            )}

            {/* Quick Stats */}
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <Stat label="Followers" value={formatNumber(creator.followers_count)} />
              <Stat label="Engagement" value={`${creator.engagement_rate?.toFixed(1)}%`} />
              <Stat label="Avg Reel Views" value={formatNumber(creator.avg_reel_views ?? 0)} />
              <Stat label="Reels" value={`${creator.reels_percentage?.toFixed(0)}%`} />
            </div>

            {/* Social Media Links */}
            <div className="mt-3 flex flex-wrap gap-2">
              {creator.instagram_url && (
                <SocialLink
                  platform="Instagram"
                  url={creator.instagram_url}
                  color="bg-gradient-to-r from-purple-500 to-pink-500"
                />
              )}
              {creator.facebook_url && (
                <SocialLink
                  platform="Facebook"
                  url={creator.facebook_url}
                  color="bg-blue-600"
                />
              )}
              {creator.tiktok_url && (
                <SocialLink
                  platform="TikTok"
                  url={creator.tiktok_url}
                  color="bg-gray-900"
                />
              )}
              {creator.youtube_url && (
                <SocialLink
                  platform="YouTube"
                  url={creator.youtube_url}
                  color="bg-red-600"
                />
              )}
            </div>

            {/* Hashtags */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {top_hashtags.slice(0, 6).map(tag => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* Score + Actions */}
          <div className="flex-shrink-0 flex flex-col items-end gap-3">
            {/* Overall Score */}
            <div className={`px-4 py-2 rounded-xl text-center ${scoreColor}`}>
              <div className="text-2xl font-bold">{score.overall_score.toFixed(1)}</div>
              <div className="text-xs font-medium">{scoreLabel}</div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={onApprove}
                className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium
                          rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Approve &amp; Send DM
              </button>
              <button
                onClick={onSkip}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700
                          text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Skip
              </button>
            </div>

            {/* Toggle Details */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs text-brand-600 hover:text-brand-700"
            >
              {showDetails ? 'Hide' : 'Show'} score breakdown
            </button>
          </div>
        </div>
      </div>

      {/* Expandable Score Breakdown */}
      {showDetails && (
        <div className="border-t border-gray-100 px-6 py-4 bg-gray-50">
          <ScoreBreakdown
            score={score}
            followers={creator.followers_count}
            minFilter={followerRange?.min}
            maxFilter={followerRange?.max}
          />
        </div>
      )}
    </div>
  );
}

/** Social media link button */
function SocialLink({ platform, url, color }: { platform: string; url: string; color: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`px-3 py-1 ${color} text-white text-xs font-medium rounded-full
                 hover:opacity-90 transition-opacity`}
    >
      {platform} ↗
    </a>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-gray-400">{label}: </span>
      <span className="font-medium text-gray-700">{value}</span>
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}
