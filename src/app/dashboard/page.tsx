// ============================================================
// DASHBOARD — Overview stats and quick actions
// Fetches REAL data from Supabase via /api/dashboard
// ============================================================
'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardStats from '@/components/DashboardStats';
import Pipeline from '@/components/Pipeline';

interface Stat {
  label: string;
  value: number;
  change: string;
  color: string;
}

interface PipelineStage {
  label: string;
  count: number;
  color: string;
  percent: number;
}

interface RecentActivity {
  status: string;
  username: string;
  updatedAt: string;
}

interface Summary {
  totalCreators: number;
  pendingReview: number;
  approved: number;
  skipped: number;
  dmDrafted: number;
  dmSent: number;
  replied: number;
  interested: number;
  declined: number;
  noResponse: number;
  onboarded: number;
}

const STATUS_LABELS: Record<string, string> = {
  presented: 'Presented',
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

const STATUS_COLORS: Record<string, string> = {
  presented: 'text-gray-600',
  approved: 'text-blue-600',
  skipped: 'text-gray-400',
  dm_drafted: 'text-indigo-600',
  dm_sent: 'text-purple-600',
  replied: 'text-amber-600',
  interested: 'text-emerald-600',
  declined: 'text-red-600',
  no_response: 'text-gray-500',
  onboarded: 'text-ocean-600',
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stat[]>([]);
  const [pipeline, setPipeline] = useState<PipelineStage[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const res = await fetch(`/api/dashboard?_t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setStats(data.stats ?? []);
      setPipeline(data.pipeline ?? []);
      setRecentActivity(data.recentActivity ?? []);
      setSummary(data.summary ?? null);
    } catch {
      setError('Failed to load dashboard. Please refresh.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard(true);

    // Re-fetch whenever the user navigates back to this tab/page
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchDashboard();
      }
    };
    const handleFocus = () => fetchDashboard();

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchDashboard]);

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Overview of your ambassador scouting and outreach pipeline.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Stats Grid */}
      <DashboardStats stats={stats} isLoading={isLoading} />

      {/* Pipeline Summary */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Outreach Pipeline</h2>
        <Pipeline stages={pipeline} isLoading={isLoading} />
      </div>

      {/* Bottom Row: Recent Activity + Quick Actions */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Activity */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Recent Activity</h3>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-3">
                  <div className="h-4 bg-gray-200 rounded w-20" />
                  <div className="h-4 bg-gray-100 rounded w-24" />
                </div>
              ))}
            </div>
          ) : recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((activity, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${STATUS_COLORS[activity.status] || 'text-gray-600'}`}>
                      {STATUS_LABELS[activity.status] || activity.status}
                    </span>
                    <span className="text-gray-500">@{activity.username}</span>
                  </div>
                  <span className="text-xs text-gray-400">{timeAgo(activity.updatedAt)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No activity yet. Start scouting to see updates here.</p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-800">This Week&apos;s Candidates</h3>
            <p className="text-sm text-gray-500 mt-1">
              {summary && summary.pendingReview > 0
                ? `${summary.pendingReview} candidates waiting for review.`
                : 'Review and approve new ambassador candidates.'}
            </p>
            
              href="/candidates"
              className="mt-4 inline-block px-4 py-2 bg-brand-600 text-white text-sm
                         font-medium rounded-lg hover:bg-brand-700 transition-colors"
            >
              Review Candidates
            </a>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-800">Outreach Pipeline</h3>
            <p className="text-sm text-gray-500 mt-1">
              {summary && summary.approved > 0
                ? `${summary.approved} approved creators ready for outreach.`
                : 'View approved creators awaiting DM outreach.'}
            </p>
            
              href="/outreach"
              className="mt-4 inline-block px-4 py-2 bg-ocean-600 text-white text-sm
                         font-medium rounded-lg hover:bg-ocean-700 transition-colors"
            >
              View Outreach
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
