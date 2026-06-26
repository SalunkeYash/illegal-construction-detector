import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import Navbar from '../components/Navbar';
import AlertCard from '../components/AlertCard';
import StatCard from '../components/StatCard';
import LocationSearch from '../components/LocationSearch';
import { getDashboardSummary, getRecentAlerts } from '../services/api';

function MapFly({ flyTo }) {
  const map = useMap();
  useEffect(() => {
    if (flyTo) map.flyTo([flyTo.lat, flyTo.lon], 14, { animate: true, duration: 1.5 });
  }, [flyTo, map]);
  return null;
}

function FitBounds({ violations }) {
  const map = useMap();
  useEffect(() => {
    if (violations && violations.length > 0) {
      const lats = violations.map(v => v.geometry?.coordinates?.[1] || v.latitude || 0).filter(l => l !== 0);
      const lons = violations.map(v => v.geometry?.coordinates?.[0] || v.longitude || 0).filter(l => l !== 0);
      if (lats.length > 0 && lons.length > 0) {
        map.fitBounds([[Math.min(...lats) - 0.01, Math.min(...lons) - 0.01], [Math.max(...lats) + 0.01, Math.max(...lons) + 0.01]], { padding: [30, 30] });
      }
    }
  }, [violations, map]);
  return null;
}

const getSevColor = (sev) => {
  switch (sev) { case 'HIGH': return '#ef4444'; case 'MEDIUM': return '#f97316'; case 'LOW': return '#22c55e'; default: return '#6b7280'; }
};

const Dashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [geoFeatures, setGeoFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [error, setError] = useState('');
  const [flyTo, setFlyTo] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [dashRes, alertsRes] = await Promise.all([getDashboardSummary(), getRecentAlerts()]);
        setDashboard(dashRes.data);
        setAlerts(alertsRes.data.alerts || []);
        const geo = dashRes.data.geojson;
        if (geo && geo.type === 'FeatureCollection' && Array.isArray(geo.features)) {
          setGeoFeatures(geo.features);
        }
      } catch (err) {
        console.error('Dashboard data error:', err);
        setError('Failed to load dashboard data.');
      } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const filteredAlerts = alerts.filter(a => activeTab === 'All' || a.violation?.status === activeTab);
  const stats = dashboard?.stats || {};

  // Parse features for map
  const mapViolations = geoFeatures.map(f => ({
    latitude: f.geometry?.coordinates?.[1],
    longitude: f.geometry?.coordinates?.[0],
    ...f.properties,
  })).filter(v => v.latitude && v.longitude);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">System Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">Real-time overview of illegal construction detection</p>
          </div>
          {error && <div className="bg-red-50 text-red-600 px-4 py-2 rounded-md text-sm border border-red-200">{error}</div>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatCard title="Areas Scanned" value={loading ? '...' : stats.areas || 0} icon="🗺️" color="blue" />
          <StatCard title="Buildings Detected" value={loading ? '...' : stats.buildings || 0} icon="🏢" color="indigo" />
          <StatCard title="Violations" value={loading ? '...' : stats.violations || 0} icon="⚠️" color="red" />
          <StatCard title="Pending Review" value={loading ? '...' : stats.pending || 0} icon="⏳" color="orange" />
          <StatCard title="Verified" value={loading ? '...' : stats.verified || 0} icon="✅" color="green" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <LocationSearch onLocationSelect={(loc) => setFlyTo({ lat: loc.lat, lon: loc.lon })} placeholder="Search to center map..." />
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-fade-in">
              <div className="px-6 py-3 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-sm font-semibold text-gray-800">Alert Map</h2>
                <div className="flex space-x-3 text-xs font-medium">
                  <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-red-500 mr-1"></span>High</span>
                  <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-orange-500 mr-1"></span>Medium</span>
                  <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-green-500 mr-1"></span>Low</span>
                </div>
              </div>
              <div className="h-[500px]">
                {loading ? <div className="h-full skeleton"></div> : (
                  <MapContainer center={[18.5204, 73.8567]} zoom={12} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                    <MapFly flyTo={flyTo} />
                    {mapViolations.length > 0 && <FitBounds violations={mapViolations} />}
                    {mapViolations.map((v, i) => (
                      <CircleMarker key={i} center={[v.latitude, v.longitude]} radius={10} pathOptions={{ color: getSevColor(v.severity), fillColor: getSevColor(v.severity), fillOpacity: 0.7, weight: 2 }}>
                        <Popup>
                          <p className="font-bold text-sm">{v.violation_type}</p>
                          <p className="text-xs text-gray-500">{v.confidence_score ? `${(v.confidence_score * 100).toFixed(1)}%` : ''}</p>
                        </Popup>
                      </CircleMarker>
                    ))}
                  </MapContainer>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full flex flex-col animate-slide-in">
              <div className="px-5 py-3 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-800">Recent Alerts</h2>
              </div>
              <div className="px-5 py-2 border-b border-gray-100 bg-gray-50 flex space-x-2 overflow-x-auto">
                {['All', 'Pending', 'Verified', 'Resolved'].map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-1 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${activeTab === tab ? 'bg-[#1e3a5f] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}>
                    {tab}
                  </button>
                ))}
              </div>
              <div className="p-4 flex-1 overflow-y-auto max-h-[550px] bg-gray-50/50">
                {loading ? (
                  <div className="space-y-3">{[1, 2, 3, 4].map(i => <div key={i} className="h-24 skeleton rounded-lg"></div>)}</div>
                ) : filteredAlerts.length > 0 ? (
                  <div className="space-y-3">{filteredAlerts.map(a => <AlertCard key={a.id} alert={a} />)}</div>
                ) : (
                  <div className="text-center py-12 text-gray-500"><span className="text-3xl block mb-2">✨</span><p>No alerts</p></div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
