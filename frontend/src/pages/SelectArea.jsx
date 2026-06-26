import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Rectangle, Polygon, Marker, Popup, useMap, FeatureGroup } from 'react-leaflet';
import L from 'leaflet';
import Navbar from '../components/Navbar';
import LocationSearch from '../components/LocationSearch';
import { getAreas, createArea } from '../services/api';

// Fix leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Calculate area in sq km using Shoelace formula
function calculateAreaSqKm(coords) {
  if (!coords || coords.length < 3) return 0;
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  let total = 0;
  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length;
    const lat1 = toRad(coords[i][0]);
    const lat2 = toRad(coords[j][0]);
    const dLon = toRad(coords[j][1] - coords[i][1]);
    total += dLon * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  total = (Math.abs(total) * R * R) / 2;
  return total / 1e6; // to sq km
}

// Map controller for flying to location
function MapController({ flyTo, fitBounds }) {
  const map = useMap();
  useEffect(() => {
    if (flyTo) {
      map.flyTo([flyTo.lat, flyTo.lon], flyTo.zoom || 15, { animate: true, duration: 1.5 });
    }
  }, [flyTo, map]);
  useEffect(() => {
    if (fitBounds) {
      map.fitBounds(fitBounds, { padding: [50, 50] });
    }
  }, [fitBounds, map]);
  return null;
}

// Dynamic import for leaflet-draw (EditControl)
let EditControl = null;
try {
  const rld = require('react-leaflet-draw');
  EditControl = rld.EditControl;
} catch (e) {
  console.warn('[SelectArea] react-leaflet-draw not available — polygon drawing disabled');
}

const SelectArea = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('draw');
  const [drawnCoords, setDrawnCoords] = useState(null);
  const [drawnBbox, setDrawnBbox] = useState(null);
  const [drawnAreaSqKm, setDrawnAreaSqKm] = useState(null);
  const [areaName, setAreaName] = useState('');
  const [description, setDescription] = useState('');
  const [searchMarker, setSearchMarker] = useState(null);
  const [existingAreas, setExistingAreas] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showInstructions, setShowInstructions] = useState(true);

  // Bbox form state
  const [bboxForm, setBboxForm] = useState({ name: '', min_lat: '', max_lat: '', min_lon: '', max_lon: '', description: '' });

  // Map control state
  const [flyTo, setFlyTo] = useState(null);
  const [fitBounds, setFitBounds] = useState(null);
  const featureGroupRef = useRef(null);

  useEffect(() => {
    const fetchAreas = async () => {
      try {
        const res = await getAreas();
        setExistingAreas(res.data.areas || []);
      } catch (err) { console.error('Fetch areas error:', err); }
    };
    fetchAreas();
  }, []);

  const handleLocationSelect = (loc) => {
    setFlyTo({ lat: loc.lat, lon: loc.lon, zoom: 15 });
    if (loc.boundingbox) {
      const [s, n, w, e] = loc.boundingbox.map(Number);
      setFitBounds([[s, w], [n, e]]);
    }
    setSearchMarker({ lat: loc.lat, lon: loc.lon, name: loc.shortName });
    setBboxForm(prev => ({
      ...prev,
      min_lat: (loc.lat - 0.02).toFixed(6),
      max_lat: (loc.lat + 0.02).toFixed(6),
      min_lon: (loc.lon - 0.02).toFixed(6),
      max_lon: (loc.lon + 0.02).toFixed(6),
    }));
  };

  const handlePolygonCreated = (e) => {
    const { layerType, layer } = e;

    // Remove previous drawings
    if (featureGroupRef.current) {
      const layers = featureGroupRef.current.getLayers();
      layers.forEach((l) => {
        if (l !== layer) featureGroupRef.current.removeLayer(l);
      });
    }

    let coords = [];
    if (layerType === 'polygon') {
      coords = layer.getLatLngs()[0].map((ll) => [ll.lat, ll.lng]);
    } else if (layerType === 'rectangle') {
      const b = layer.getBounds();
      coords = [
        [b.getSouth(), b.getWest()],
        [b.getNorth(), b.getWest()],
        [b.getNorth(), b.getEast()],
        [b.getSouth(), b.getEast()],
      ];
    }

    // Close polygon
    if (coords.length > 0) {
      const first = coords[0];
      const last = coords[coords.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        coords.push([...first]);
      }
    }

    const lats = coords.map((c) => c[0]);
    const lons = coords.map((c) => c[1]);
    const bbox = {
      min_lat: Math.min(...lats),
      max_lat: Math.max(...lats),
      min_lon: Math.min(...lons),
      max_lon: Math.max(...lons),
    };

    setDrawnCoords(coords);
    setDrawnBbox(bbox);
    setDrawnAreaSqKm(calculateAreaSqKm(coords));
    setShowInstructions(false);
    setActiveTab('draw');
    setError(null);
  };

  const handleDeleteShape = () => {
    if (featureGroupRef.current) {
      featureGroupRef.current.clearLayers();
    }
    setDrawnCoords(null);
    setDrawnBbox(null);
    setDrawnAreaSqKm(null);
    setShowInstructions(true);
  };

  const handleSubmitPolygon = async () => {
    if (!drawnCoords) { setError('Please draw a polygon on the map first'); return; }
    setSubmitting(true);
    setError(null);

    const name = areaName.trim() || `Custom Area ${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN')}`;

    try {
      const res = await createArea({
        name, description,
        selection_method: 'polygon',
        polygon_coordinates: drawnCoords,
        ...drawnBbox,
      });
      setSuccess('Area created! Redirecting to detection...');
      setTimeout(() => navigate('/detection', { state: { area_id: res.data.id } }), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create area');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitBbox = async (e) => {
    e.preventDefault();
    const { name, min_lat, max_lat, min_lon, max_lon, description: desc } = bboxForm;
    if (!min_lat || !max_lat || !min_lon || !max_lon) { setError('Fill in all coordinate fields'); return; }
    if (parseFloat(min_lat) >= parseFloat(max_lat)) { setError('Min Lat must be less than Max Lat'); return; }
    if (parseFloat(min_lon) >= parseFloat(max_lon)) { setError('Min Lon must be less than Max Lon'); return; }

    setSubmitting(true);
    setError(null);

    try {
      const res = await createArea({
        name: name || undefined,
        selection_method: 'bbox',
        min_lat: parseFloat(min_lat), max_lat: parseFloat(max_lat),
        min_lon: parseFloat(min_lon), max_lon: parseFloat(max_lon),
        description: desc,
      });
      setSuccess('Area created! Redirecting to detection...');
      setTimeout(() => navigate('/detection', { state: { area_id: res.data.id } }), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create area');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Select Detection Area</h1>
          <p className="mt-1 text-sm text-gray-500">Draw a polygon on the map or enter coordinates manually</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* LEFT: Map (3 cols) */}
          <div className="lg:col-span-3 space-y-3">
            <LocationSearch onLocationSelect={handleLocationSelect} placeholder="🔍 Search location (city, area, landmark...)" />
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
              <div className="h-[550px]">
                <MapContainer center={[18.5204, 73.8567]} zoom={12} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
                  <MapController flyTo={flyTo} fitBounds={fitBounds} />

                  {/* Drawing tools */}
                  <FeatureGroup ref={featureGroupRef}>
                    {EditControl && (
                      <EditControl
                        position="topleft"
                        onCreated={handlePolygonCreated}
                        onDeleted={handleDeleteShape}
                        draw={{
                          polygon: { shapeOptions: { color: '#1e40af', fillColor: '#3b82f6', fillOpacity: 0.3, weight: 2 }, showArea: true, metric: true },
                          rectangle: { shapeOptions: { color: '#1e40af', fillColor: '#3b82f6', fillOpacity: 0.3, weight: 2 } },
                          circle: false, circlemarker: false, marker: false, polyline: false,
                        }}
                        edit={{ remove: true }}
                      />
                    )}
                  </FeatureGroup>

                  {/* Search marker */}
                  {searchMarker && (
                    <Marker position={[searchMarker.lat, searchMarker.lon]}>
                      <Popup>{searchMarker.name}</Popup>
                    </Marker>
                  )}

                  {/* Existing areas */}
                  {existingAreas.map((area) =>
                    area.polygon_coordinates ? (
                      <Polygon key={area.id} positions={area.polygon_coordinates} pathOptions={{ color: '#6366f1', fillOpacity: 0.15 }}>
                        <Popup><b>{area.name}</b><br />Method: Polygon<br /><span className="text-xs text-gray-500">Click to run detection</span></Popup>
                      </Polygon>
                    ) : (
                      <Rectangle key={area.id} bounds={[[area.min_lat, area.min_lon], [area.max_lat, area.max_lon]]} pathOptions={{ color: '#6366f1', fillOpacity: 0.1 }}>
                        <Popup><b>{area.name}</b><br />Method: BBox</Popup>
                      </Rectangle>
                    )
                  )}
                </MapContainer>
              </div>

              {/* Map Instructions overlay */}
              {showInstructions && activeTab === 'draw' && EditControl && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-md border border-gray-200 text-xs text-gray-600 z-[1000]">
                  ✏️ Click polygon tool → Click to add points → Double-click to finish
                </div>
              )}
              {!EditControl && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-yellow-50 px-4 py-2 rounded-lg shadow-md border border-yellow-200 text-xs text-yellow-700 z-[1000]">
                  ⚠️ Polygon drawing unavailable. Use "Enter Coordinates" tab instead.
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Control Panel (2 cols) */}
          <div className="lg:col-span-2 space-y-4 animate-fade-in">
            {/* Tab Switch */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="flex border-b border-gray-200">
                <button onClick={() => setActiveTab('draw')} className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'draw' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                  ✏️ Draw on Map
                </button>
                <button onClick={() => setActiveTab('coords')} className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'coords' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                  📋 Enter Coordinates
                </button>
              </div>

              <div className="p-5">
                {error && <div className="mb-4 bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm border border-red-200">{error}</div>}
                {success && <div className="mb-4 bg-green-50 text-green-600 px-4 py-3 rounded-lg text-sm border border-green-200">{success}</div>}

                {activeTab === 'draw' ? (
                  <div className="space-y-4">
                    {!drawnCoords ? (
                      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 space-y-2">
                        <p className="font-medium text-gray-700">Instructions:</p>
                        <p>1. 🔍 Search or navigate to your area</p>
                        <p>2. ✏️ Click the polygon tool on the map</p>
                        <p>3. Click to add points, double-click to finish</p>
                        <p>4. Give your area a name and start detection</p>
                      </div>
                    ) : (
                      <>
                        <div className="bg-blue-50 rounded-lg p-4 space-y-2 border border-blue-200">
                          <p className="text-sm font-semibold text-blue-800">📐 Polygon Drawn</p>
                          <p className="text-xs text-blue-700">Area: {drawnAreaSqKm?.toFixed(3)} sq km</p>
                          <p className="text-xs text-blue-700">📍 Center: {drawnBbox ? `${((drawnBbox.min_lat + drawnBbox.max_lat) / 2).toFixed(4)}, ${((drawnBbox.min_lon + drawnBbox.max_lon) / 2).toFixed(4)}` : ''}</p>
                          <p className="text-xs text-blue-700">🔲 Bounds: {drawnBbox ? `${drawnBbox.min_lat.toFixed(4)} → ${drawnBbox.max_lat.toFixed(4)}, ${drawnBbox.min_lon.toFixed(4)} → ${drawnBbox.max_lon.toFixed(4)}` : ''}</p>
                          <p className="text-xs text-blue-700">🔺 Vertices: {drawnCoords.length} points</p>
                        </div>
                        <button onClick={handleDeleteShape} className="text-xs text-red-500 hover:text-red-700 underline">🗑️ Clear drawing</button>
                      </>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Area Name (optional)</label>
                      <input type="text" value={areaName} onChange={(e) => setAreaName(e.target.value)} placeholder="e.g. Hadapsar Ward 5" className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                      <textarea rows="2" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Notes..." className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm" />
                    </div>
                    <button onClick={handleSubmitPolygon} disabled={!drawnCoords || submitting} className={`w-full py-3 text-sm font-medium text-white rounded-lg transition-all ${drawnCoords && !submitting ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed'}`}>
                      {submitting ? 'Creating...' : '🚀 Start Detection'}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitBbox} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Area Name</label>
                      <input type="text" value={bboxForm.name} onChange={(e) => setBboxForm({ ...bboxForm, name: e.target.value })} placeholder="e.g. Kothrud Zone B" className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Min Latitude</label>
                        <input type="number" step="any" required value={bboxForm.min_lat} onChange={(e) => setBboxForm({ ...bboxForm, min_lat: e.target.value })} placeholder="18.49" className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Max Latitude</label>
                        <input type="number" step="any" required value={bboxForm.max_lat} onChange={(e) => setBboxForm({ ...bboxForm, max_lat: e.target.value })} placeholder="18.52" className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Min Longitude</label>
                        <input type="number" step="any" required value={bboxForm.min_lon} onChange={(e) => setBboxForm({ ...bboxForm, min_lon: e.target.value })} placeholder="73.81" className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Max Longitude</label>
                        <input type="number" step="any" required value={bboxForm.max_lon} onChange={(e) => setBboxForm({ ...bboxForm, max_lon: e.target.value })} placeholder="73.85" className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea rows="2" value={bboxForm.description} onChange={(e) => setBboxForm({ ...bboxForm, description: e.target.value })} className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                    <button type="submit" disabled={submitting} className="w-full py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all disabled:bg-gray-300">
                      {submitting ? 'Creating...' : '→ Select Area'}
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Existing Areas */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-700">Existing Areas ({existingAreas.length})</h3>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {existingAreas.length === 0 ? (
                  <p className="p-4 text-sm text-gray-500 text-center">No areas yet</p>
                ) : (
                  existingAreas.map((area) => (
                    <div key={area.id} className="px-4 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors flex items-center justify-between" onClick={() => navigate('/detection', { state: { area_id: area.id } })}>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{area.name}</p>
                        <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${area.selection_method === 'polygon' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {area.selection_method === 'polygon' ? '📐 Polygon' : '⬜ BBox'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">→</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SelectArea;
