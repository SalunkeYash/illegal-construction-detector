import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup, Polygon, Rectangle, useMap } from 'react-leaflet';
import Navbar from '../components/Navbar';
import StatCard from '../components/StatCard';
import LiveLogPanel from '../components/LiveLogPanel';
import { getAreas, runDetection, getAnnotatedImage } from '../services/api';
import { useRealtime } from '../hooks/useRealtime';

function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [50, 50] });
  }, [bounds, map]);
  return null;
}

const getSevColor = (sev) => {
  switch (sev) { case 'HIGH': return '#ef4444'; case 'MEDIUM': return '#f97316'; case 'LOW': return '#22c55e'; default: return '#6b7280'; }
};

const Detection = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const preSelectedAreaId = location.state?.area_id || '';

  const [areas, setAreas] = useState([]);
  const [selectedAreaId, setSelectedAreaId] = useState(preSelectedAreaId);
  const [imageSource, setImageSource] = useState('demo');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const { detectionLogs, clearLogs } = useRealtime();
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchAreas = async () => {
      try {
        const res = await getAreas();
        setAreas(res.data.areas || []);
      } catch (err) { console.error('Fetch areas error:', err); }
    };
    fetchAreas();
  }, []);

  // Track progress from logs
  useEffect(() => {
    if (detectionLogs.length > 0) {
      const lastLog = detectionLogs[detectionLogs.length - 1];
      if (lastLog.progress) setProgress(lastLog.progress);
    }
  }, [detectionLogs]);

  const handleDetect = async () => {
    if (!selectedAreaId) { setError('Please select an area'); return; }
    setLoading(true);
    setError('');
    setResult(null);
    setProgress(0);
    clearLogs();

    const formData = new FormData();
    formData.append('area_id', selectedAreaId);
    formData.append('image_source', imageSource);
    if (imageSource === 'demo') formData.append('use_sample', 'true');
    if (file && imageSource === 'upload') formData.append('file', file);

    try {
      const res = await runDetection(formData);
      setResult(res.data);
      setProgress(100);
    } catch (err) {
      const msg = err.response?.data?.error || 'Detection pipeline failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const selectedArea = areas.find(a => String(a.id) === String(selectedAreaId));
  const mapBounds = selectedArea ? [[selectedArea.min_lat, selectedArea.min_lon], [selectedArea.max_lat, selectedArea.max_lon]] : null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">🔍 Run Detection</h1>
          <p className="mt-1 text-sm text-gray-500">Select area, choose image source, and run the AI detection pipeline</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT: Controls */}
          <div className="lg:col-span-1 space-y-5">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-1">Detection Settings</h3>
              {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm border border-red-200">{error}</div>}

              {/* Area Select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monitored Area</label>
                <select value={selectedAreaId} onChange={(e) => setSelectedAreaId(e.target.value)} className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm bg-white">
                  <option value="">Select an area...</option>
                  {areas.map(a => (
                    <option key={a.id} value={a.id}>{a.name} {a.selection_method === 'polygon' ? '📐' : '⬜'}</option>
                  ))}
                </select>
                {!areas.length && (
                  <button onClick={() => navigate('/select-area')} className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline">
                    → Create an area first
                  </button>
                )}
              </div>

              {/* Image Source */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Image Source</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 'demo', label: '🎨 Demo', desc: 'Generated' },
                    { val: 'upload', label: '📤 Upload', desc: 'Your image' },
                    { val: 'gee', label: '🛰️ GEE', desc: 'Sentinel-2' },
                  ].map(opt => (
                    <button key={opt.val} onClick={() => setImageSource(opt.val)} className={`p-3 rounded-lg border text-center transition-all ${imageSource === opt.val ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'}`}>
                      <span className="text-lg block">{opt.label.split(' ')[0]}</span>
                      <span className="text-xs text-gray-500 block mt-1">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* File Upload */}
              {imageSource === 'upload' && (
                <div>
                  <input type="file" ref={fileInputRef} accept=".png,.jpg,.jpeg,.tiff,.webp" onChange={(e) => setFile(e.target.files[0])} className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                  {file && <p className="mt-1 text-xs text-green-600">✓ {file.name}</p>}
                </div>
              )}

              {/* Area Info */}
              {selectedArea && (
                <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-800 border border-blue-200">
                  <p className="font-semibold">{selectedArea.name}</p>
                  <p>Method: {selectedArea.selection_method === 'polygon' ? 'Polygon' : 'BBox'}</p>
                  <p>Center: {selectedArea.center_lat?.toFixed(4)}, {selectedArea.center_lon?.toFixed(4)}</p>
                </div>
              )}

              {/* Run Button + Progress */}
              <button onClick={handleDetect} disabled={loading || !selectedAreaId} className={`w-full py-3.5 text-sm font-medium text-white rounded-lg transition-all ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {loading ? '⏳ Running Pipeline...' : '🚀 Run Detection'}
              </button>

              {loading && (
                <div className="space-y-2">
                  <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                  </div>
                  <p className="text-xs text-gray-500 text-center">{progress}% complete</p>
                </div>
              )}
            </div>

            {/* Live Logs */}
            <LiveLogPanel logs={detectionLogs} maxHeight="350px" />
          </div>

          {/* RIGHT: Results */}
          <div className="lg:col-span-2 space-y-5">
            {/* Stats */}
            {result && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
                <StatCard title="Detections" value={result.total_detections} icon="🏢" color="blue" />
                <StatCard title="Violations" value={result.violations_found} icon="⚠️" color="red" />
                <StatCard title="Source" value={result.image_source || 'N/A'} icon="📡" color="indigo" />
                <StatCard title="Method" value={result.area_method || 'N/A'} icon="📐" color="purple" />
              </div>
            )}

            {/* Map */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-700">Detection Map</h3>
              </div>
              <div className="h-[400px]">
                <MapContainer center={[18.5204, 73.8567]} zoom={12} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                  {mapBounds && <FitBounds bounds={mapBounds} />}

                  {/* Show area boundary */}
                  {selectedArea && selectedArea.polygon_coordinates ? (
                    <Polygon positions={selectedArea.polygon_coordinates} pathOptions={{ color: '#1e40af', fillOpacity: 0.15, weight: 2 }} />
                  ) : selectedArea ? (
                    <Rectangle bounds={mapBounds} pathOptions={{ color: '#1e40af', fillOpacity: 0.1, weight: 2 }} />
                  ) : null}

                  {/* Violation markers */}
                  {result?.violations?.map((v, i) => (
                    v.latitude && v.longitude && (
                      <CircleMarker key={i} center={[v.latitude, v.longitude]} radius={10} pathOptions={{ color: getSevColor(v.severity), fillColor: getSevColor(v.severity), fillOpacity: 0.8, weight: 2 }}>
                        <Popup>
                          <p className="font-bold text-sm">{v.violation_type}</p>
                          <p className="text-xs text-gray-500">{v.severity} | {(v.confidence_score * 100).toFixed(1)}%</p>
                          <p className="text-xs text-gray-500">{v.zone_name}</p>
                        </Popup>
                      </CircleMarker>
                    )
                  ))}
                </MapContainer>
              </div>
            </div>

            {/* Annotated Image */}
            {result?.annotated_image_url && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-fade-in">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                  <h3 className="text-sm font-semibold text-gray-700">Annotated Satellite Image</h3>
                </div>
                <div className="p-4 flex justify-center">
                  <img src={result.annotated_image_url} alt="Annotated" className="max-w-full rounded-lg shadow-sm border border-gray-200" />
                </div>
              </div>
            )}

            {/* Violations Table */}
            {result?.violations?.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-fade-in">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                  <h3 className="text-sm font-semibold text-gray-700">Violations Found ({result.violations.length})</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Type', 'Severity', 'Location', 'Confidence', 'Area (sqm)', 'Zone', 'Permit'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {result.violations.map((v, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{v.violation_type}</td>
                          <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-bold text-white ${getSevColor(v.severity) === '#ef4444' ? 'bg-red-500' : getSevColor(v.severity) === '#f97316' ? 'bg-orange-500' : 'bg-green-500'}`}>{v.severity}</span></td>
                          <td className="px-4 py-3 text-xs text-gray-500">{v.latitude?.toFixed(4)}, {v.longitude?.toFixed(4)}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{(v.confidence_score * 100).toFixed(1)}%</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{v.area_sqm?.toFixed(1)}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">{v.zone_name}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">{v.permit_status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* No results yet */}
            {!result && !loading && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <span className="text-5xl block mb-4">🛰️</span>
                <h3 className="text-lg font-semibold text-gray-800">Ready for Detection</h3>
                <p className="text-sm text-gray-500 mt-2">Select an area and choose an image source to begin</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Detection;
