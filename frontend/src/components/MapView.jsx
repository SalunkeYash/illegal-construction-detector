import React, { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';

const FitBounds = ({ violations }) => {
  const map = useMap();

  useEffect(() => {
    if (violations && violations.length > 0) {
      const lats = violations.map(v => v.latitude || v.properties?.latitude || 0).filter(l => l !== 0);
      const lons = violations.map(v => v.longitude || v.properties?.longitude || 0).filter(l => l !== 0);

      if (lats.length > 0 && lons.length > 0) {
        const bounds = [
          [Math.min(...lats) - 0.01, Math.min(...lons) - 0.01],
          [Math.max(...lats) + 0.01, Math.max(...lons) + 0.01],
        ];
        map.fitBounds(bounds, { padding: [30, 30] });
      }
    }
  }, [violations, map]);

  return null;
};

const getSeverityColor = (severity) => {
  switch (severity) {
    case 'HIGH': return '#ef4444';
    case 'MEDIUM': return '#f97316';
    case 'LOW': return '#22c55e';
    default: return '#6b7280';
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

const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'Pending': return 'bg-yellow-100 text-yellow-800';
    case 'Verified': return 'bg-blue-100 text-blue-800';
    case 'False Positive': return 'bg-gray-100 text-gray-800';
    case 'Resolved': return 'bg-green-100 text-green-800';
    case 'Action Taken': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-600';
  }
};

const MapView = ({
  violations = [],
  center = [18.5204, 73.8567],
  zoom = 12,
  height = '500px',
}) => {
  // Parse GeoJSON features or plain violation objects
  const parsedViolations = violations.map((v) => {
    if (v.type === 'Feature') {
      return {
        latitude: v.geometry?.coordinates?.[1] || 0,
        longitude: v.geometry?.coordinates?.[0] || 0,
        ...v.properties,
      };
    }
    return v;
  });

  const validViolations = parsedViolations.filter(
    (v) => v.latitude && v.longitude && v.latitude !== 0 && v.longitude !== 0
  );

  return (
    <div style={{ height, width: '100%' }} className="rounded-lg overflow-hidden shadow-md border border-gray-200">
      <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {validViolations.length > 0 && <FitBounds violations={validViolations} />}

        {validViolations.map((v, index) => (
          <CircleMarker
            key={v.id || index}
            center={[v.latitude, v.longitude]}
            radius={10}
            pathOptions={{
              color: getSeverityColor(v.severity),
              fillColor: getSeverityColor(v.severity),
              fillOpacity: 0.7,
              weight: 2,
            }}
          >
            <Popup>
              <div className="text-sm space-y-1 min-w-[180px]">
                <p className="font-bold text-gray-800">{v.violation_type || 'Unknown'}</p>
                <p>
                  <span className="text-gray-500">Confidence: </span>
                  <span className="font-medium">
                    {v.confidence_score ? `${(v.confidence_score * 100).toFixed(1)}%` : 'N/A'}
                  </span>
                </p>
                <p>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(v.status)}`}>
                    {v.status || 'Unknown'}
                  </span>
                </p>
                <p className="text-gray-400 text-xs">{formatDate(v.detected_at)}</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {validViolations.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-[1000] pointer-events-none">
            <span className="bg-white/80 px-4 py-2 rounded-lg text-gray-500 text-sm">
              No violations to display
            </span>
          </div>
        )}
      </MapContainer>
    </div>
  );
};

export default MapView;
