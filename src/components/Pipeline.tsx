// ============================================================
// PIPELINE — Visual funnel of the outreach pipeline (receives data via props)
// ============================================================

interface PipelineStage {
  label: string;
  count: number;
  color: string;
  percent: number;
}

interface Props {
  stages: PipelineStage[];
  isLoading: boolean;
}

export default function Pipeline({ stages, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="space-y-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 animate-pulse">
              <div className="w-40 h-4 bg-gray-200 rounded flex-shrink-0 ml-auto" />
              <div className="flex-1 h-8 bg-gray-100 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="space-y-3">
        {stages.map(stage => (
          <div key={stage.label} className="flex items-center gap-4">
            <div className="w-40 text-sm text-gray-600 text-right flex-shrink-0">
              {stage.label}
            </div>
            <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden relative">
              <div
                className={`h-full ${stage.color} rounded-lg transition-all duration-700
                           flex items-center justify-end pr-3`}
                style={{ width: `${Math.max(stage.percent, stage.count > 0 ? 8 : 0)}%` }}
              >
                {stage.count > 0 && (
                  <span className="text-white text-xs font-bold">{stage.count}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
