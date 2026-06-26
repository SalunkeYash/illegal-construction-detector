import React, { useState, useEffect } from 'react';
import { getViolation, updateViolationStatus, updateViolationNotes, downloadReport } from '../services/api';

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try { return new Date(dateStr).toLocaleDateString('en-GB') + ', ' + new Date(dateStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); }
  catch { return dateStr; }
};

const getSevClass = (sev) => {
  switch (sev) {
    case 'HIGH': return 'bg-red-600';
    case 'MEDIUM': return 'bg-orange-500';
    case 'LOW': return 'bg-green-500';
    default: return 'bg-gray-500';
  }
};

const ViolationDetailModal = ({ violationId, onClose, onStatusChanged }) => {
  const [violation, setViolation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    if (!violationId) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await getViolation(violationId);
        setViolation(res.data);
        setNotes(res.data.notes || '');
        setNewStatus(res.data.status || 'Pending');
      } catch (err) {
        console.error('ViolationDetail error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [violationId]);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose && onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleSaveNotes = async () => {
    try {
      setSavingNotes(true);
      await updateViolationNotes(violationId, notes);
    } catch (err) {
      console.error('Save notes error:', err);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleStatusChange = async (status) => {
    try {
      await updateViolationStatus(violationId, status);
      setNewStatus(status);
      setViolation(prev => ({ ...prev, status }));
      if (onStatusChanged) onStatusChanged(violationId, status);
    } catch (err) {
      console.error('Status change error:', err);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      const response = await downloadReport(violationId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `violation_report_${violationId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download report error:', err);
      alert('Failed to download report');
    }
  };

  if (!violationId) return null;

  const statusOptions = ['Pending', 'Verified', 'False Positive', 'Resolved', 'Action Taken'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto animate-fade-in">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading violation details...</div>
        ) : violation ? (
          <>
            {/* Header */}
            <div className={`px-6 py-4 flex items-center justify-between rounded-t-xl ${getSevClass(violation.severity)}`}>
              <div>
                <h2 className="text-lg font-bold text-white">{violation.violation_type}</h2>
                <p className="text-white/80 text-sm">{violation.severity} Severity</p>
              </div>
              <button onClick={onClose} className="text-white/80 hover:text-white text-xl transition-colors">✕</button>
            </div>

            <div className="p-6 space-y-5">
              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500 text-xs">Location</p>
                  <p className="font-medium text-gray-800">{violation.latitude?.toFixed(6)}, {violation.longitude?.toFixed(6)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500 text-xs">Zone</p>
                  <p className="font-medium text-gray-800">{violation.zone_name || 'Unknown'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500 text-xs">Confidence</p>
                  <p className="font-medium text-gray-800">{violation.confidence_score ? `${(violation.confidence_score * 100).toFixed(1)}%` : 'N/A'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500 text-xs">Area</p>
                  <p className="font-medium text-gray-800">{violation.area_sqm?.toFixed(1)} sq m</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500 text-xs">Permit Status</p>
                  <p className="font-medium text-gray-800">{violation.permit_status || 'Unknown'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500 text-xs">Detected</p>
                  <p className="font-medium text-gray-800">{formatDate(violation.detected_at)}</p>
                </div>
              </div>

              {/* Status Update */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                >
                  {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Timeline */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Timeline</h4>
                <div className="flex items-center space-x-2 text-xs">
                  {['Detected', 'Alerted', 'Verified', 'Resolved'].map((step, i) => {
                    const statusIndex = ['Pending', 'Pending', 'Verified', 'Resolved'].indexOf(newStatus);
                    const isActive = i <= Math.max(statusIndex, 1);
                    return (
                      <React.Fragment key={step}>
                        <div className={`flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                          {i + 1}
                        </div>
                        <span className={`${isActive ? 'text-gray-800' : 'text-gray-400'}`}>{step}</span>
                        {i < 3 && <span className={`flex-1 h-0.5 ${isActive ? 'bg-blue-400' : 'bg-gray-200'}`}></span>}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows="3"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="Add inspection notes..."
                />
                <button
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  className="mt-2 px-4 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
                >
                  {savingNotes ? 'Saving...' : 'Save Notes'}
                </button>
              </div>

              {/* Actions */}
              <div className="flex space-x-3 pt-2 border-t border-gray-200">
                <button
                  onClick={handleDownloadPdf}
                  className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                >
                  📄 Download PDF Report
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-gray-500">Violation not found</div>
        )}
      </div>
    </div>
  );
};

export default ViolationDetailModal;
