import React from 'react';

const MonitoringStatus = ({ connected, reconnecting }) => {
  if (reconnecting) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
        <svg className="animate-spin w-3 h-3 mr-1.5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Reconnecting...
      </span>
    );
  }

  if (connected) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300 pulse-glow border border-green-500/30">
        <span className="w-2 h-2 bg-green-400 rounded-full mr-1.5 animate-pulse"></span>
        Live
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30">
      <span className="w-2 h-2 bg-red-400 rounded-full mr-1.5"></span>
      Offline
    </span>
  );
};

export default MonitoringStatus;
