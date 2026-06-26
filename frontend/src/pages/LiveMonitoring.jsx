import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import Navbar from '../components/Navbar';
import LocationSearch from '../components/LocationSearch';
import LiveLogPanel from '../components/LiveLogPanel';
import LiveAlertFeed from '../components/LiveAlertFeed';
import StatCard from '../components/StatCard';
import { useRealtime } from '../hooks/useRealtime';
import { getSummary, getSchedulerStatus } from '../services/api';

function MapFly({ flyTo }) {
  const map = useMap();
  useEffect(() => {
    if (flyTo) map.flyTo([flyTo.lat, flyTo.lon], 14, { animate: true, duration: 1.5 });
  }, [flyTo, map]);
  return null;
}

const getSevColor = (sev) => {
  switch (sev) {
    case 'HIGH': return '#ef4444';
    case 'MEDIUM': return '#f97316';
    case 'LOW': return '#22c55e';
    default: return '#6b7280';
  }
};

const LiveMonitoring = () => {
  const { connected, reconnecting, violations, detectionLogs, scanStatus } = useRealtime();
  const [summary, setSummary] = useState(null);
  const [schedulerInfo, setSchedulerInfo] = useState(null);
  const [flyTo, setFlyTo] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sumRes, schedRes] = await Promise.all([getSummary(), getSchedulerStatus()]);
        setSummary(sumRes.data);
        setSchedulerInfo(schedRes.data);
      } catch (err) { console.error('Live monitoring data error:', err); }
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center">
              <span className="w-3 h-3 bg-red-500 rounded-full mr-3 animate-pulse"></span>
              Live Monitoring
            </h1>
            <p className="mt-1 text-sm text-gray-500">Real-time detection events and system status</p>
          </div>
          <div className="flex items-center space-x-3">
            {scanStatus && (
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${scanStatus.status === 'running' ? 'bg-blue-100 text-blue-700' : scanStatus.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                {scanStatus.message || scanStatus.status}
              </span>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard title="Areas" value={summary?.areas_scanned || 0} icon="🗺️" color="blue" />
          <StatCard title="Violations" value={summary?.violations || 0} icon="⚠️" color="red" />
          <StatCard title="Pending" value={summary?.pending_review || 0} icon="⏳" color="orange" />
          <StatCard title="Scheduler" value={schedulerInfo?.running ? `${schedulerInfo.jobs?.length || 0} Jobs` : 'Off'} icon="⏱️" color="purple" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2 space-y-3">
            <LocationSearch onLocationSelect={(loc) => setFlyTo({ lat: loc.lat, lon: loc.lon })} placeholder="Search location to center map..." />
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="h-[450px]">
                <MapContainer center={[18.5204, 73.8567]} zoom={12} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                  <MapFly flyTo={flyTo} />
                  {violations.map((v, i) => (
                    v.latitude && v.longitude && (
                      <CircleMarker key={i} center={[v.latitude, v.longitude]} radius={10} pathOptions={{ color: getSevColor(v.severity), fillColor: getSevColor(v.severity), fillOpacity: 0.7, weight: 2 }}>
                        <Popup>
                          <p className="font-bold text-sm">{v.violation_type}</p>
                          <p className="text-xs text-gray-500">{v.severity} | {(v.confidence_score * 100).toFixed(1)}%</p>
                        </Popup>
                      </CircleMarker>
                    )
                  ))}
                </MapContainer>
              </div>
            </div>

            {/* Live Logs */}
            <LiveLogPanel logs={detectionLogs} maxHeight="250px" />
          </div>

          {/* Right: Alert Feed */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full flex flex-col">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                <h2 className="text-sm font-semibold text-gray-700">Real-Time Alerts ({violations.length})</h2>
              </div>
              <div className="p-4 flex-1 overflow-y-auto max-h-[700px]">
                <LiveAlertFeed violations={violations} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LiveMonitoring;
