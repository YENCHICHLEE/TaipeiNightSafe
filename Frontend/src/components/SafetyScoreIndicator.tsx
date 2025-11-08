interface SafetyScoreIndicatorProps {
  score: number;
}

export function SafetyScoreIndicator({ score }: SafetyScoreIndicatorProps) {
  const getColorAndLabel = () => {
    if (score >= 70) {
      return {
        faceColor: '#4CAF50',
        barColor: '#4CAF50',
        label: '安全'
      };
    } else if (score >= 40) {
      return {
        faceColor: '#FFD700',
        barColor: '#FFD700',
        label: '需注意'
      };
    } else {
      return {
        faceColor: '#DC2626',
        barColor: '#DC2626',
        label: '危險'
      };
    }
  };

  const { faceColor, barColor, label } = getColorAndLabel();
  const progress = Math.min(score, 100);

  const getFaceExpression = () => {
    if (score >= 70) {
      return (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="20" fill={faceColor}/>
          <circle cx="14" cy="16" r="2.5" fill="white"/>
          <circle cx="26" cy="16" r="2.5" fill="white"/>
          <path d="M12 23 Q20 28 28 23" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        </svg>
      );
    } else if (score >= 40) {
      return (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="20" fill={faceColor}/>
          <circle cx="14" cy="16" r="2.5" fill="white"/>
          <circle cx="26" cy="16" r="2.5" fill="white"/>
          <line x1="13" y1="25" x2="27" y2="25" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      );
    } else {
      return (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="20" fill={faceColor}/>
          <circle cx="14" cy="16" r="2.5" fill="white"/>
          <circle cx="26" cy="16" r="2.5" fill="white"/>
          <path d="M12 27 Q20 22 28 27" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        </svg>
      );
    }
  };

  return (
    <div className="fixed top-20 right-4 z-[1000]">
      <div className="relative bg-white rounded-full shadow-lg px-6 py-4 flex items-center gap-3" style={{ minWidth: '200px' }}>
        <div className="absolute -top-5 left-1/2 transform -translate-x-1/2">
          {getFaceExpression()}
        </div>

        <div className="flex-1 mt-5">
          <div className="flex justify-between items-center mb-1 gap-2">
            <span className="text-sm font-bold text-gray-800 whitespace-nowrap">{label}</span>
            <span className="text-3xl font-bold text-gray-900">{Math.round(score)}</span>
          </div>

          <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                backgroundColor: barColor
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
