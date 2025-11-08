import { Shield, AlertTriangle, AlertCircle } from 'lucide-react';
import { SafetyAPIResponse } from '../types';

interface SafetyIndicatorProps {
  data: SafetyAPIResponse | null;
}

export function SafetyIndicator({ data }: SafetyIndicatorProps) {
  if (!data) {
    return null;
  }

  const { summary } = data;
  let bgColor, Icon, statusEmoji;

  if (summary.level === 1) {
    bgColor = 'bg-emerald-500';
    Icon = Shield;
    statusEmoji = '✓';
  } else if (summary.level === 2) {
    bgColor = 'bg-amber-500';
    Icon = AlertTriangle;
    statusEmoji = '⚠';
  } else {
    bgColor = 'bg-rose-500';
    Icon = AlertCircle;
    statusEmoji = '✗';
  }

  return (
    <div className="fixed top-16 sm:top-[72px] right-2 sm:right-3 z-[1000] bg-white rounded-xl shadow-lg p-2 sm:p-2.5 max-w-[150px] sm:max-w-[180px] border border-gray-100">
      <div className="flex items-center gap-2">
        <div className={`${bgColor} rounded-full p-1.5 sm:p-2`}>
          <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-base sm:text-lg">{statusEmoji}</span>
            <p className="font-bold text-gray-800 text-xs sm:text-sm truncate">{summary.label}</p>
          </div>
          <p className="text-[10px] sm:text-xs text-gray-500">分數: {summary.safety_score.toFixed(1)}</p>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-gray-100">
        <div className="grid grid-cols-2 gap-1 text-xs">
          <div className="text-center">
            <p className="text-gray-400 text-[9px] sm:text-[10px] mb-0.5">安全</p>
            <p className="font-bold text-emerald-600 text-xs sm:text-sm">{summary.analysis.safe_places}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-400 text-[9px] sm:text-[10px] mb-0.5">警示</p>
            <p className="font-bold text-rose-600 text-xs sm:text-sm">{summary.analysis.warning_zones}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
