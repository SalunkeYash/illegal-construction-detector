import React from 'react';

const LiveAlertFeed = ({ violations = [] }) => {
  const getSeverityColor = (sev) => {
    switch (sev) {
      case 'HIGH': return 'border-red-500 bg-red-50';
      case 'MEDIUM': return 'border-orange-500 bg-orange-50';
      case 'LOW': return 'border-green-500 bg-green-50';
      default: return 'border-gray-500 bg-gray-50';
    }
  };

  if (violations.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <span className="text-3xl block mb-2">🔔</span>
        <p className="text-sm">No real-time violations yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {violations.map((v, i) => (
        <div key={i} className={`p-3 rounded-lg border-l-4 animate-slide-in ${getSeverityColor(v.severity)}`}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-gray-800">{v.violation_type || 'Unknown'}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                📍 {v.latitude?.toFixed(4)}, {v.longitude?.toFixed(4)}
              </p>
            </div>
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
              v.severity === 'HIGH' ? 'bg-red-100 text-red-800' :
              v.severity === 'MEDIUM' ? 'bg-orange-100 text-orange-800' :
              'bg-green-100 text-green-800'
            }`}>
              {v.severity}
            </span>
          </div>
          {v.confidence_score && (
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${(v.confidence_score * 100)}%` }}></div>
              </div>
              <p className="text-[10px] text-gray-500 mt-0.5">{(v.confidence_score * 100).toFixed(1)}% confidence</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default LiveAlertFeed;
