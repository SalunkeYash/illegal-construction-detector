import React from 'react';

const LiveLogPanel = ({ logs = [], maxHeight = '300px' }) => {
  const logEndRef = React.useRef(null);

  React.useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (logs.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg p-4 text-center text-gray-500 text-sm" style={{ minHeight: '100px' }}>
        Waiting for detection logs...
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700" style={{ maxHeight }}>
      <div className="px-3 py-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Live Logs</span>
        <span className="flex items-center text-xs text-green-400">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1 animate-pulse"></span>
          Streaming
        </span>
      </div>
      <div className="p-3 overflow-y-auto font-mono text-xs space-y-1" style={{ maxHeight: `calc(${maxHeight} - 36px)` }}>
        {logs.map((log, index) => (
          <div key={index} className="flex items-start space-x-2 animate-fade-in">
            <span className="text-gray-600 flex-shrink-0 w-16">
              {log.timestamp ? new Date(log.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
            </span>
            <span className={`flex-shrink-0 w-4 text-center ${log.progress >= 100 ? 'text-green-400' : log.step === 'error' ? 'text-red-400' : 'text-blue-400'}`}>
              {log.progress >= 100 ? '✓' : log.step === 'error' ? '✕' : '›'}
            </span>
            <span className={`${log.progress >= 100 ? 'text-green-300' : log.step === 'error' ? 'text-red-300' : 'text-gray-300'}`}>
              {log.message}
            </span>
          </div>
        ))}
        <div ref={logEndRef} />
      </div>
    </div>
  );
};

export default LiveLogPanel;
