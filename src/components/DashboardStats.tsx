// ============================================================
// DASHBOARD STATS — Key metrics overview (receives data via props)
// ============================================================

interface Stat {
  label: string;
  value: number;
  change: string;
  color: string;
}

interface Props {
  stats: Stat[];
  isLoading: boolean;
}

export default function DashboardStats({ stats, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
            <div className="h-3 bg-gray-200 rounded w-16 mb-2" />
            <div className="h-7 bg-gray-200 rounded w-10 mb-1" />
            <div className="h-3 bg-gray-100 rounded w-20" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map(stat => (
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
