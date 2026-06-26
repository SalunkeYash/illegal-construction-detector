import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { getSessions, getAreas } from '../services/api';

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try { return new Date(dateStr).toLocaleDateString('en-GB') + ', ' + new Date(dateStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); }
  catch { return dateStr; }
};

const ScanHistory = () => {
  const [sessions, setSessions] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterArea, setFilterArea] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const fetchAreas = async () => {
      try {
        const res = await getAreas();
        setAreas(res.data.areas || []);
      } catch (err) { console.error('Fetch areas error:', err); }
    };
    fetchAreas();
  }, []);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        const params = { page, per_page: 15 };
        if (filterArea) params.area_id = filterArea;
        if (filterStatus) params.status = filterStatus;
        const res = await getSessions(params);
        setSessions(res.data.sessions || []);
        setTotalPages(res.data.total_pages || 1);
      } catch (err) { console.error('Fetch sessions error:', err); }
      finally { setLoading(false); }
    };
    fetchSessions();
  }, [page, filterArea, filterStatus]);

  const getAreaName = (areaId) => {
    const area = areas.find(a => a.id === areaId);
    return area?.name || `Area #${areaId}`;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">📋 Scan History</h1>
          <p className="mt-1 text-sm text-gray-500">Complete log of all detection sessions</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 flex items-center space-x-4">
          <select value={filterArea} onChange={(e) => { setFilterArea(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50">
            <option value="">All Areas</option>
            {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50">
            <option value="">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="running">Running</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['ID', 'Area', 'Triggered By', 'Source', 'Status', 'Duration', 'Detections', 'Violations', 'Date'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i}>
                    {Array(9).fill(0).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 skeleton rounded w-full"></div></td>
                    ))}
                  </tr>
                ))
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-12 text-center text-gray-500 text-sm">No scan sessions found</td>
                </tr>
              ) : (
                sessions.map((s) => (
                  <React.Fragment key={s.id}>
                    <tr className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}>
                      <td className="px-4 py-3 text-sm text-gray-500 font-mono">#{s.id}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{getAreaName(s.area_id)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 capitalize">{s.triggered_by}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 capitalize">{s.image_source}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(s.status)}`}>{s.status}</span></td>
                      <td className="px-4 py-3 text-sm text-gray-500">{s.duration_seconds ? `${s.duration_seconds.toFixed(1)}s` : '-'}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.total_detections}</td>
                      <td className="px-4 py-3 text-sm font-medium text-red-600">{s.total_violations}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(s.started_at)}</td>
                    </tr>
                    {/* Expanded logs */}
                    {expandedId === s.id && s.logs && s.logs.length > 0 && (
                      <tr>
                        <td colSpan="9" className="px-4 py-3 bg-gray-900">
                          <div className="font-mono text-xs text-gray-300 space-y-0.5 max-h-48 overflow-y-auto">
                            {s.logs.map((log, li) => (
                              <div key={li} className="flex space-x-3">
                                <span className="text-gray-600">[Step {log.step}]</span>
                                <span>{log.message}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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
    </div>
  );
};

export default ScanHistory;
