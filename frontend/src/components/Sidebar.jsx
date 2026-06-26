import React from 'react';
import { NavLink } from 'react-router-dom';

const Sidebar = () => {
  const links = [
    { path: '/dashboard', icon: '📊', label: 'Dashboard' },
    { path: '/select-area', icon: '🗺️', label: 'Select Area' },
    { path: '/detection', icon: '🔍', label: 'Detection' },
    { path: '/violations', icon: '⚠️', label: 'Violations' },
    { path: '/analytics', icon: '📈', label: 'Analytics' },
  ];

  const linkClass = ({ isActive }) =>
    `flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
      isActive
        ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`;

  return (
    <aside className="w-60 bg-white shadow-md border-r border-gray-200 min-h-screen p-4">
      <div className="space-y-1">
        {links.map((link) => (
          <NavLink key={link.path} to={link.path} className={linkClass}>
            <span className="text-lg">{link.icon}</span>
            <span>{link.label}</span>
          </NavLink>
        ))}
      </div>
    </aside>
  );
};

export default Sidebar;
