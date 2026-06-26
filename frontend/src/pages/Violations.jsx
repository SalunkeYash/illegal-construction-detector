import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import Navbar from '../components/Navbar';
import LocationSearch from '../components/LocationSearch';
import ViolationDetailModal from '../components/ViolationDetailModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { getViolations, deleteViolation } from '../services/api';

function MapFly({ flyTo }) {
  const map = useMap();
  useEffect(() => {
    if (flyTo) map.flyTo([flyTo.lat, flyTo.lon], 14, { animate: true, duration: 1.5 });
  }, [flyTo, map]);
  return null;
}

const getSevColor = (sev) => {
  switch (sev) { case 'HIGH': return '#ef4444'; case 'MEDIUM': return '#f97316'; case 'LOW': return '#22c55e'; default: return '#6b7280'; }
};

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try { return new Date(dateStr).toLocaleDateString('en-GB'); }
  catch { return dateStr; }
};

const Violations = () => {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [flyTo, setFlyTo] = useState(null);
  const [selectedViolationId, setSelectedViolationId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    const fetchViolations = async () => {
      try {
        setLoading(true);
        const params = { page, per_page: 15 };
        if (filterStatus) params.status = filterStatus;
        if (filterSeverity) params.severity = filterSeverity;
        const res = await getViolations(params);
        setViolations(res.data.violations || []);
        setTotalPages(res.data.total_pages || 1);
        setTotal(res.data.total || 0);
      } catch (err) {
        console.error('Fetch violations error:', err);
      } finally { setLoading(false); }
    };
    fetchViolations();
  }, [page, filterStatus, filterSeverity]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteViolation(deleteTarget);
      setViolations(violations.filter(v => v.id !== deleteTarget));
      setDeleteTarget(null);
    } catch (err) {
      alert('Failed to delete violation');
      setDeleteTarget(null);
    }
  };

  const handleStatusChanged = (vid, newStatus) => {
    setViolations(violations.map(v => v.id === vid ? { ...v, status: newStatus } : v));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">⚠️ Violations ({total})</h1>
          <p className="mt-1 text-sm text-gray-500">View and manage all detected illegal construction violations</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Map */}
          <div className="lg:col-span-2 space-y-3">
            <LocationSearch onLocationSelect={(loc) => setFlyTo({ lat: loc.lat, lon: loc.lon })} placeholder="Search location..." />
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="h-[350px]">
                <MapContainer center={[18.5204, 73.8567]} zoom={12} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                  <MapFly flyTo={flyTo} />
                  {violations.map((v, i) => (
                    v.latitude && v.longitude && (
                      <CircleMarker key={i} center={[v.latitude, v.longitude]} radius={9} pathOptions={{ color: getSevColor(v.severity), fillColor: getSevColor(v.severity), fillOpacity: 0.7, weight: 2 }} eventHandlers={{ click: () => setSelectedViolationId(v.id) }}>
                        <Popup><p className="font-bold text-sm">{v.violation_type}</p><p className="text-xs">{v.severity}</p></Popup>
                      </CircleMarker>
                    )
                  ))}
                </MapContainer>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-800">Filters</h3>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }} className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50">
                  <option value="">All</option>
                  {['Pending', 'Verified', 'False Positive', 'Resolved', 'Action Taken'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Severity</label>
                <select value={filterSeverity} onChange={(e) => { setFilterSeverity(e.target.value); setPage(1); }} className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50">
                  <option value="">All</option>
                  {['HIGH', 'MEDIUM', 'LOW'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {/* Quick Stats */}
              <div className="pt-3 border-t border-gray-200 space-y-2 text-sm">
                <p className="flex justify-between"><span className="text-gray-500">Total:</span><span className="font-medium text-gray-900">{total}</span></p>
                <p className="flex justify-between"><span className="text-red-500">High:</span><span className="font-medium">{violations.filter(v => v.severity === 'HIGH').length}</span></p>
                <p className="flex justify-between"><span className="text-orange-500">Medium:</span><span className="font-medium">{violations.filter(v => v.severity === 'MEDIUM').length}</span></p>
                <p className="flex justify-between"><span className="text-green-500">Low:</span><span className="font-medium">{violations.filter(v => v.severity === 'LOW').length}</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['ID', 'Type', 'Severity', 'Status', 'Location', 'Confidence', 'Zone', 'Date', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i}>{Array(9).fill(0).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 skeleton rounded w-full"></div></td>)}</tr>
                ))
              ) : violations.length === 0 ? (
                <tr><td colSpan="9" className="px-4 py-12 text-center text-gray-500 text-sm">No violations found</td></tr>
              ) : (
                violations.map(v => (
                  <tr key={v.id} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => setSelectedViolationId(v.id)}>
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono">#{v.id}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{v.violation_type}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-bold text-white ${v.severity === 'HIGH' ? 'bg-red-500' : v.severity === 'MEDIUM' ? 'bg-orange-500' : 'bg-green-500'}`}>{v.severity}</span></td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${v.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : v.status === 'Verified' ? 'bg-blue-100 text-blue-800' : v.status === 'Resolved' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{v.status}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-500">{v.latitude?.toFixed(4)}, {v.longitude?.toFixed(4)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{v.confidence_score ? `${(v.confidence_score * 100).toFixed(1)}%` : '-'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{v.zone_name}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(v.detected_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex space-x-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setSelectedViolationId(v.id)} className="px-2 py-1 text-xs text-blue-600 bg-blue-50 rounded hover:bg-blue-100">Details</button>
                        {user.role === 'admin' && (
                          <button onClick={() => setDeleteTarget(v.id)} className="px-2 py-1 text-xs text-red-600 bg-red-50 rounded hover:bg-red-100">🗑️</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between bg-white px-4 py-3 border border-gray-200 rounded-lg shadow-sm">
            <p className="text-sm text-gray-700">Page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span></p>
            <div className="flex space-x-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 disabled:text-gray-400 hover:bg-gray-50">Previous</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 disabled:text-gray-400 hover:bg-gray-50">Next</button>
            </div>
          </div>
        )}
      </main>

      {/* Violation Detail Modal */}
      {selectedViolationId && <ViolationDetailModal violationId={selectedViolationId} onClose={() => setSelectedViolationId(null)} onStatusChanged={handleStatusChanged} />}

      {/* Delete Confirm */}
      <ConfirmDialog isOpen={!!deleteTarget} title="Delete Violation" message="This will permanently delete this violation and its related alerts." confirmLabel="Delete" confirmColor="red" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
};

export default Violations;
