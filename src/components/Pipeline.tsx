// ============================================================
// PIPELINE — Visual funnel of the outreach pipeline
// ============================================================

const STAGES = [
  { label: 'Discovered', count: 47, color: 'bg-gray-400', width: '100%' },
  { label: 'Scored & Presented', count: 40, color: 'bg-brand-400', width: '85%' },
  { label: 'Approved', count: 18, color: 'bg-blue-500', width: '38%' },
  { label: 'DM Sent', count: 14, color: 'bg-purple-500', width: '30%' },
  { label: 'Replied', count: 8, color: 'bg-amber-500', width: '17%' },
  { label: 'Interested', count: 6, color: 'bg-emerald-500', width: '13%' },
  { label: 'Onboarded', count: 3, color: 'bg-ocean-500', width: '6%' },
];

export default function Pipeline() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="space-y-3">
        {STAGES.map(stage => (
          <div key={stage.label} className="flex items-center gap-4">
            <div className="w-40 text-sm text-gray-600 text-right flex-shrink-0">
              {stage.label}
            </div>
            <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden relative">
              <div
                className={`h-full ${stage.color} rounded-lg transition-all duration-700
                           flex items-center justify-end pr-3`}
                style={{ width: stage.width }}
              >
                <span className="text-white text-xs font-bold">{stage.count}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
