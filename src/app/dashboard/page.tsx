// ============================================================
// DASHBOARD — Overview stats and quick actions
// ============================================================

import DashboardStats from '@/components/DashboardStats';
import Pipeline from '@/components/Pipeline';

export default function DashboardPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Overview of your ambassador scouting and outreach pipeline.
        </p>
      </div>

      {/* Stats Grid */}
      <DashboardStats />

      {/* Pipeline Summary */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Outreach Pipeline</h2>
        <Pipeline />
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-800">This Week&apos;s Candidates</h3>
          <p className="text-sm text-gray-500 mt-1">
            Review and approve new ambassador candidates.
          </p>
          <a
            href="/candidates"
            className="mt-4 inline-block px-4 py-2 bg-brand-600 text-white text-sm
                       font-medium rounded-lg hover:bg-brand-700 transition-colors"
          >
            Review Candidates
          </a>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-800">Pending Outreach</h3>
          <p className="text-sm text-gray-500 mt-1">
            View approved creators awaiting DM outreach.
          </p>
          <a
            href="/outreach"
            className="mt-4 inline-block px-4 py-2 bg-ocean-600 text-white text-sm
                       font-medium rounded-lg hover:bg-ocean-700 transition-colors"
          >
            View Outreach
          </a>
        </div>
      </div>
    </div>
  );
}
