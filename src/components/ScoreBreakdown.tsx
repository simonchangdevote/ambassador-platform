// ============================================================
// SCORE BREAKDOWN — Visual breakdown of scoring dimensions
// Shows Engagement + Reels scores, plus a Reach Label
// ============================================================

import type { CreatorScore } from '@/types';
import { getReachLabel, getReachLabelColor, type ReachLabel } from '@/lib/scoring';

interface Props {
  score: CreatorScore;
  followers?: number;
  minFilter?: number;
  maxFilter?: number;
}

const DIMENSIONS = [
  { key: 'engagement_score', label: 'Engagement Rate', weight: '55%', description: 'How engaged their audience is (likes, comments, shares)' },
  { key: 'reels_focus_score', label: 'Reels Activity', weight: '45%', description: 'How much video/reel content they produce and view performance' },
] as const;

export default function ScoreBreakdown({ score, followers, minFilter, maxFilter }: Props) {
  // Calculate reach label if follower data is available
  let reachLabel: ReachLabel | null = null;
  let reachColor = '';
  if (followers !== undefined && minFilter !== undefined && maxFilter !== undefined) {
    reachLabel = getReachLabel(followers, minFilter, maxFilter);
    reachColor = getReachLabelColor(reachLabel);
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-700">Score Breakdown</h4>

      {/* Reach Label */}
      {reachLabel && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Audience Reach:</span>
          <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${reachColor}`}>
            {reachLabel}
          </span>
          {followers !== undefined && (
            <span className="text-xs text-gray-400">
              ({formatFollowers(followers)} followers)
            </span>
          )}
        </div>
      )}

      {/* Score Dimensions */}
      {DIMENSIONS.map(dim => {
        const value = score[dim.key] as number;
        const percentage = (value / 10) * 100;
        return (
          <div key={dim.key}>
            <div className="flex items-center justify-between text-sm">
              <div>
                <span className="font-medium text-gray-700">{dim.label}</span>
                <span className="text-gray-400 ml-2">({dim.weight})</span>
              </div>
              <span className="font-semibold text-gray-800">{value.toFixed(1)}</span>
            </div>
            <div className="mt-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: percentage >= 70 ? '#10b981' : percentage >= 50 ? '#3b82f6' : percentage >= 30 ? '#f59e0b' : '#ef4444',
                }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{dim.description}</p>
          </div>
        );
      })}
    </div>
  );
}

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}
