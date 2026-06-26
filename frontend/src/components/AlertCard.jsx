import React from 'react';

const getSeverityColor = (severity) => {
  switch (severity) {
    case 'HIGH': return 'border-red-500 bg-red-50';
    case 'MEDIUM': return 'border-orange-500 bg-orange-50';
    case 'LOW': return 'border-green-500 bg-green-50';
    default: return 'border-gray-500 bg-gray-50';
  }
};

const getSeverityDot = (severity) => {
  switch (severity) {
    case 'HIGH': return 'bg-red-500';
    case 'MEDIUM': return 'bg-orange-500';
    case 'LOW': return 'bg-green-500';
    default: return 'bg-gray-500';
  }
};

const getStatusBadge = (status) => {
  switch (status) {
    case 'Pending': return 'bg-yellow-100 text-yellow-800';
    case 'Verified': return 'bg-blue-100 text-blue-800';
    case 'False Positive': return 'bg-gray-100 text-gray-700';
    case 'Resolved': return 'bg-green-100 text-green-800';
    case 'Action Taken': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-600';
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB') + ', ' + date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
};

const AlertCard = ({ alert }) => {
  const violation = alert.violation || {};
  const severity = violation.severity || 'LOW';
  const status = violation.status || 'Pending';

  return (
    <div className={`bg-white rounded-lg shadow-sm border-l-4 p-4 mb-3 animate-fade-in hover:shadow-md transition-shadow duration-200 ${getSeverityColor(severity)}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <span className={`w-3 h-3 rounded-full ${getSeverityDot(severity)} flex-shrink-0`}></span>
          <div>
            <p className="font-semibold text-gray-800 text-sm">
              {violation.violation_type || alert.notification_type || 'Alert'}
            </p>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(status)}`}>
              {status}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-1.5 text-xs text-gray-600">
        {violation.latitude && violation.longitude && (
          <p>📍 {violation.latitude?.toFixed(6)}, {violation.longitude?.toFixed(6)}</p>
        )}
        <p>📅 {formatDate(alert.sent_at)}</p>
        {violation.area_sqm && (
          <p>📐 {violation.area_sqm?.toFixed(1)} sq m</p>
        )}
        {violation.confidence_score && (
          <p>🎯 {(violation.confidence_score * 100).toFixed(1)}%</p>
        )}
      </div>
    </div>
  );
};

export default AlertCard;
