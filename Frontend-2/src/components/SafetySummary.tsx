import { Shield, AlertTriangle, AlertCircle } from 'lucide-react';
import { SafetyAPIResponse } from '../types';

interface SafetySummaryProps {
  data: SafetyAPIResponse | null;
}

export function SafetySummary({ data }: SafetySummaryProps) {
  if (!data) {
    return null;
  }

  const { summary, meta } = data;
  let bgColor, borderColor, Icon, statusText;

  if (summary.level === 1) {
    bgColor = 'bg-emerald-50';
    borderColor = 'border-emerald-200';
    Icon = Shield;
    statusText = '此區域安全';
  } else if (summary.level === 2) {
    bgColor = 'bg-amber-50';
    borderColor = 'border-amber-200';
    Icon = AlertTriangle;
    statusText = '此區需留意，建議結伴或留意周遭';
  } else {
    bgColor = 'bg-rose-50';
    borderColor = 'border-rose-200';
    Icon = AlertCircle;
    statusText = '此區夜間風險高，建議避開';
  }

  return (
    <div className={`${bgColor} border ${borderColor} rounded-2xl p-4 sm:p-5`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`${summary.level === 1 ? 'bg-emerald-500' : summary.level === 2 ? 'bg-amber-500' : 'bg-rose-500'} rounded-full p-2.5`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-800">{summary.label}</h2>
          <p className="text-xs sm:text-sm text-gray-600">安全分數: {summary.safety_score.toFixed(1)}</p>
        </div>
      </div>

      <p className="text-gray-700 mb-4 text-sm">{statusText}</p>

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <div className="bg-white rounded-xl p-3 border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">安全地點</p>
          <p className="text-xl sm:text-2xl font-bold text-emerald-600">{summary.analysis.safe_places}</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">警示區域</p>
          <p className="text-xl sm:text-2xl font-bold text-rose-600">{summary.analysis.warning_zones}</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">照明分數</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-800">{summary.analysis.lighting_score.toFixed(1)}</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">警局距離</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-800">{summary.analysis.police_distance_m}m</p>
        </div>
      </div>

      <div className="mt-3 bg-white rounded-xl p-3 border border-gray-100">
        <p className="text-xs text-gray-500 mb-1">最近事件</p>
        <p className="text-base sm:text-lg font-semibold text-gray-800">{summary.analysis.last_incident_days} 天前</p>
      </div>

      <p className="text-xs text-gray-400 mt-3 text-center">
        中心點: {meta.center.lat.toFixed(6)}, {meta.center.lng.toFixed(6)}
      </p>
    </div>
  );
}
