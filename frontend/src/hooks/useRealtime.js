import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';

export function useRealtime() {
  const { socket, connected, reconnecting } = useSocket();
  const [violations, setViolations] = useState([]);
  const [detectionLogs, setDetectionLogs] = useState([]);
  const [scanStatus, setScanStatus] = useState(null);
  const [systemStatus, setSystemStatus] = useState(null);

  useEffect(() => {
    if (!socket) return;

    const onNewViolation = (data) => {
      setViolations((prev) => [data.violation, ...prev].slice(0, 50));
    };

    const onDetectionLog = (data) => {
      setDetectionLogs((prev) => [...prev, data].slice(-100));
    };

    const onDetectionComplete = (data) => {
      setDetectionLogs((prev) => [...prev, {
        step: 'complete',
        message: 'Detection pipeline completed!',
        progress: 100,
        timestamp: data.timestamp,
      }]);
    };

    const onScanStatus = (data) => {
      setScanStatus(data);
    };

    const onSystemStatus = (data) => {
      setSystemStatus(data.stats);
    };

    socket.on('new_violation', onNewViolation);
    socket.on('detection_log', onDetectionLog);
    socket.on('detection_complete', onDetectionComplete);
    socket.on('scan_status', onScanStatus);
    socket.on('system_status', onSystemStatus);

    return () => {
      socket.off('new_violation', onNewViolation);
      socket.off('detection_log', onDetectionLog);
      socket.off('detection_complete', onDetectionComplete);
      socket.off('scan_status', onScanStatus);
      socket.off('system_status', onSystemStatus);
    };
  }, [socket]);

  const clearLogs = useCallback(() => {
    setDetectionLogs([]);
  }, []);

  return {
    connected,
    reconnecting,
    violations,
    detectionLogs,
    scanStatus,
    systemStatus,
    clearLogs,
  };
}

export default useRealtime;
