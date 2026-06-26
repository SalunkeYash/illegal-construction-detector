import React from 'react';

const StatCard = ({ title, value, icon, color = 'blue', change }) => {
  const colorMap = {
    blue: 'from-blue-500 to-blue-600',
    red: 'from-red-500 to-red-600',
    green: 'from-green-500 to-green-600',
    orange: 'from-orange-500 to-orange-600',
    purple: 'from-purple-500 to-purple-600',
    indigo: 'from-indigo-500 to-indigo-600',
    cyan: 'from-cyan-500 to-cyan-600',
    yellow: 'from-yellow-500 to-yellow-600',
  };

  const bgColorMap = {
    blue: 'bg-blue-50',
    red: 'bg-red-50',
    green: 'bg-green-50',
    orange: 'bg-orange-50',
    purple: 'bg-purple-50',
    indigo: 'bg-indigo-50',
    cyan: 'bg-cyan-50',
    yellow: 'bg-yellow-50',
  };

  const gradient = colorMap[color] || colorMap.blue;
  const bgColor = bgColorMap[color] || bgColorMap.blue;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all duration-300 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
          {change !== undefined && change !== null && (
            <p className={`text-xs mt-1 font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% from last scan
            </p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl ${bgColor} flex items-center justify-center`}>
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  );
};

export default StatCard;
