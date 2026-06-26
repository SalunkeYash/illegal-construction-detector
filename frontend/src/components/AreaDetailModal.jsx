import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getArea, getAreaViolations, getAreaHistory } from '../services/api';

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try { return new Date(dateStr).toLocaleDateString('en-GB') + ', ' + new Date(dateStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); }
  catch { return dateStr; }
};

const AreaDetailModal = ({ areaId, onClose }) => {
  const navigate = useNavigate();
  const [area, setArea] = useState(null);
  const [violations, setViolations] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!areaId) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [areaRes, violRes, histRes] = await Promise.all([
          getArea(areaId),
          getAreaViolations(areaId),
          getAreaHistory(areaId),
        ]);
        setArea(areaRes.data);
        setViolations(violRes.data.violations || []);
        setSessions(histRes.data.sessions || []);
      } catch (err) {
        console.error('AreaDetail error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [areaId]);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose && onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!areaId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto animate-fade-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 rounded-t-xl">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{loading ? 'Loading...' : (area?.name || 'Area Details')}</h2>
            {area && (
              <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${area.selection_method === 'polygon' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                {area.selection_method === 'polygon' ? '📐 Polygon' : '⬜ BBox'}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl transition-colors">✕</button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading area details...</div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">{sessions.length}</p>
                <p className="text-xs text-gray-500">Total Scans</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{violations.length}</p>
                <p className="text-xs text-gray-500">Violations</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{sessions.length > 0 ? formatDate(sessions[0].started_at) : 'N/A'}</p>
                <p className="text-xs text-gray-500">Last Scan</p>
              </div>
            </div>

            {/* Coordinates */}
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 space-y-1">
              <p><span className="font-medium">Lat:</span> {area?.min_lat?.toFixed(4)} → {area?.max_lat?.toFixed(4)}</p>
              <p><span className="font-medium">Lon:</span> {area?.min_lon?.toFixed(4)} → {area?.max_lon?.toFixed(4)}</p>
              {area?.description && <p className="mt-2 text-gray-500">{area.description}</p>}
            </div>

            {/* Recent Sessions */}
            {sessions.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-800 text-sm mb-2">Recent Scans</h4>
                <div className="space-y-2">
                  {sessions.slice(0, 3).map(s => (
                    <div key={s.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2 text-xs">
                      <span className={`font-medium ${s.status === 'completed' ? 'text-green-600' : s.status === 'failed' ? 'text-red-600' : 'text-blue-600'}`}>
                        {s.status}
                      </span>
                      <span className="text-gray-500">{s.total_detections} det / {s.total_violations} viol</span>
                      <span className="text-gray-400">{formatDate(s.started_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => { onClose(); navigate('/detection', { state: { area_id: areaId } }); }}
                className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                🔍 Run Detection Now
              </button>
              <button
                onClick={() => { onClose(); navigate('/violations'); }}
                className="flex-1 py-2.5 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                ⚠️ View Violations
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AreaDetailModal;
