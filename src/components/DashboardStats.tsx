// ============================================================
// DASHBOARD STATS — Key metrics overview
// ============================================================

const STATS = [
  { label: 'Discovered', value: '47', change: '+10 this week', color: 'text-gray-900' },
  { label: 'Approved', value: '18', change: '38% approval rate', color: 'text-blue-600' },
  { label: 'DMs Sent', value: '14', change: '78% of approved', color: 'text-purple-600' },
  { label: 'Replies', value: '8', change: '57% response rate', color: 'text-amber-600' },
  { label: 'Interested', value: '6', change: '75% of replies', color: 'text-emerald-600' },
  { label: 'Onboarded', value: '3', change: '50% conversion', color: 'text-ocean-600' },
];

export default function DashboardStats() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {STATS.map(stat => (
        <div
          key={stat.label}
          className="bg-white rounded-xl border border-gray-200 p-4"
        >
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            {stat.label}
          </p>
          <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          <p className="text-xs text-gray-400 mt-1">{stat.change}</p>
        </div>
      ))}
    </div>
  );
}
