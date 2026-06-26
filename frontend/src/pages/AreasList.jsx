import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import AreaDetailModal from '../components/AreaDetailModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { getAreas, deleteArea } from '../services/api';

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try { return new Date(dateStr).toLocaleDateString('en-GB'); }
  catch { return dateStr; }
};

const AreasList = () => {
  const navigate = useNavigate();
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('date');
  const [selectedAreaId, setSelectedAreaId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    const fetchAreas = async () => {
      try {
        setLoading(true);
        const res = await getAreas();
        setAreas(res.data.areas || []);
      } catch (err) { console.error('Fetch areas error:', err); }
      finally { setLoading(false); }
    };
    fetchAreas();
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteArea(deleteTarget);
      setAreas(areas.filter(a => a.id !== deleteTarget));
      setDeleteTarget(null);
    } catch (err) {
      console.error('Delete area error:', err);
      alert('Failed to delete area');
      setDeleteTarget(null);
    }
  };

  let filteredAreas = [...areas];
  if (filter === 'active') filteredAreas = filteredAreas.filter(a => a.status === 'active');
  if (filter === 'inactive') filteredAreas = filteredAreas.filter(a => a.status !== 'active');

  if (sort === 'name') filteredAreas.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === 'date') filteredAreas.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">🗂️ Monitored Areas</h1>
            <p className="mt-1 text-sm text-gray-500">Manage and view all monitored geographical areas</p>
          </div>
          <button onClick={() => navigate('/select-area')} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            + New Area
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4 mb-6">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-44 skeleton rounded-xl"></div>)}
          </div>
        ) : filteredAreas.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <span className="text-4xl block mb-3">🗺️</span>
            <p className="text-lg font-medium">No areas found</p>
            <p className="text-sm mt-1">Create your first monitored area to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredAreas.map((area) => (
              <div key={area.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow animate-fade-in">
                {/* Color bar */}
                <div className={`h-2 ${area.selection_method === 'polygon' ? 'bg-purple-500' : 'bg-blue-500'}`}></div>
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{area.name}</h3>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${area.selection_method === 'polygon' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {area.selection_method === 'polygon' ? '📐 Polygon' : '⬜ BBox'}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${area.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {area.status}
                    </span>
                  </div>
                  {area.description && <p className="text-xs text-gray-500 mt-2 line-clamp-2">{area.description}</p>}
                  <p className="text-xs text-gray-400 mt-2">Created: {formatDate(area.created_at)}</p>

                  <div className="mt-4 flex space-x-2">
                    <button onClick={() => setSelectedAreaId(area.id)} className="flex-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                      Details
                    </button>
                    <button onClick={() => navigate('/detection', { state: { area_id: area.id } })} className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                      Scan
                    </button>
                    {user.role === 'admin' && (
                      <button onClick={() => setDeleteTarget(area.id)} className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Area Detail Modal */}
      {selectedAreaId && <AreaDetailModal areaId={selectedAreaId} onClose={() => setSelectedAreaId(null)} />}

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Area"
        message="Are you sure you want to delete this area? This action cannot be undone."
        confirmLabel="Delete"
        confirmColor="red"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default AreasList;
