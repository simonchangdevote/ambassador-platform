// ============================================================
// SCORE BREAKDOWN — Visual breakdown of 3 scoring dimensions
// ============================================================

import type { CreatorScore } from '@/types';

interface Props {
  score: CreatorScore;
}

const DIMENSIONS = [
  { key: 'engagement_score', label: 'Engagement Rate', weight: '40%', description: 'How engaged their audience is (likes, comments, shares)' },
  { key: 'audience_size_score', label: 'Audience Size', weight: '30%', description: 'Follower count in the ideal micro-to-mid range (5K–50K sweet spot)' },
  { key: 'reels_focus_score', label: 'Reels Activity', weight: '30%', description: 'How much video/reel content they produce' },
] as const;

export default function ScoreBreakdown({ score }: Props) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-700">Score Breakdown</h4>
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
