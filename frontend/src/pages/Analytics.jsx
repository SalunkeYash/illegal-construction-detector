import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import Navbar from '../components/Navbar';
import StatCard from '../components/StatCard';
import { getSummary, getByType, getBySeverity, getDetectionSummary, getStatusBreakdown } from '../services/api';

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [summary, setSummary] = useState(null);
  const [byType, setByType] = useState([]);
  const [bySeverity, setBySeverity] = useState([]);
  const [detectionSummary, setDetectionSummary] = useState(null);
  const [statusBreakdown, setStatusBreakdown] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const [sumRes, typeRes, sevRes, detSumRes, statRes] = await Promise.all([
          getSummary(),
          getByType(),
          getBySeverity(),
          getDetectionSummary(),
          getStatusBreakdown()
        ]);

        setSummary(sumRes.data);
        
        // Format for Recharts
        setByType(typeRes.data.map(item => ({
          name: item.violation_type,
          count: item.count
        })));
        
        setBySeverity(sevRes.data.map(item => ({
          name: item.severity,
          value: item.count,
          percentage: item.percentage
        })));

        setDetectionSummary(detSumRes.data);
        
        const statData = statRes.data;
        setStatusBreakdown([
          { name: 'Pending', value: statData.pending },
          { name: 'Verified', value: statData.verified }
        ]);

      } catch (err) {
        console.error("Analytics fetch error:", err);
        setError('Failed to load analytics data.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const SEVERITY_COLORS = {
    'HIGH': '#ef4444',   // Red
    'MEDIUM': '#f97316', // Orange
    'LOW': '#22c55e'     // Green
  };

  const STATUS_COLORS = {
    'Pending': '#f97316', // Orange
    'Verified': '#3b82f6' // Blue
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
          <div className="h-8 w-48 bg-gray-200 rounded skeleton mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-24 bg-white rounded-xl shadow-sm border border-gray-100 skeleton"></div>)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="h-[400px] bg-white rounded-xl shadow-sm border border-gray-100 skeleton"></div>
            <div className="h-[400px] bg-white rounded-xl shadow-sm border border-gray-100 skeleton"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Analytics Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Comprehensive insights and reporting on illegal construction</p>
        </div>

        {error && <div className="mb-6 bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm border border-red-200">{error}</div>}

        {/* Section 1: KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <StatCard title="Areas Scanned" value={summary?.areas_scanned || 0} icon="🗺️" color="blue" />
          <StatCard title="Buildings Detected" value={summary?.buildings_detected || 0} icon="🏢" color="indigo" />
          <StatCard title="Violations" value={summary?.violations || 0} icon="⚠️" color="red" />
          <StatCard title="Registrations" value={summary?.registrations || 0} icon="📝" color="green" />
          <StatCard title="Sat Images" value={summary?.construction_records || 0} icon="🛰️" color="cyan" />
          <StatCard title="Pending Review" value={summary?.pending_review || 0} icon="⏳" color="orange" />
        </div>

        {/* Section 2: Main Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Bar Chart: Violations by Type */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-slide-in">
            <h3 className="text-lg font-semibold text-gray-800 mb-6">Violations by Type</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byType} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11, fill: '#6b7280' }} 
                    angle={-45} 
                    textAnchor="end" 
                    interval={0} 
                  />
                  <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <RechartsTooltip 
                    cursor={{ fill: '#f3f4f6' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Donut Chart: Violations by Severity */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-fade-in">
            <h3 className="text-lg font-semibold text-gray-800 mb-6">Violations by Severity</h3>
            <div className="h-[300px] flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={bySeverity}
                    cx="50%"
                    cy="45%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {bySeverity.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[entry.name] || '#9ca3af'} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value, name, props) => [`${value} (${props.payload.percentage}%)`, name]}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none mb-[36px]">
                <div className="text-center">
                  <span className="block text-3xl font-bold text-gray-800">{summary?.violations || 0}</span>
                  <span className="block text-xs font-medium text-gray-500">Total</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Status Breakdown & Detection Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Status Breakdown Donut */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-slide-in">
            <h3 className="text-lg font-semibold text-gray-800 mb-6">Violation Status Breakdown</h3>
            <div className="h-[250px] flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusBreakdown?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || '#9ca3af'} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '8px' }} />
                  <Legend verticalAlign="bottom" height={20} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none mb-[20px]">
                <div className="text-center">
                  <span className="block text-2xl font-bold text-gray-800">
                    {statusBreakdown?.reduce((acc, curr) => acc + curr.value, 0) || 0}
                  </span>
                  <span className="block text-xs text-gray-500">Actionable</span>
                </div>
              </div>
            </div>
          </div>

          {/* Detection Summary Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-fade-in flex flex-col">
            <h3 className="text-lg font-semibold text-gray-800 mb-6">Detection Summary</h3>
            
            <div className="flex-1 flex items-center justify-center">
              <div className="w-full">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">Violation Rate</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-red-600">
                        {detectionSummary?.violation_rate || 0}%
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">Registration/Verification Rate</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-blue-600">
                        {detectionSummary?.registration_rate || 0}%
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">Total Areas Completed</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                        {detectionSummary?.areas_completed || 0}
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">Average Detections / Area</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                        {detectionSummary?.avg_detections || 0}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default Analytics;
