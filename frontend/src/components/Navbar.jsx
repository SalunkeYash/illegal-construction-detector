import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import MonitoringStatus from './MonitoringStatus';
import { useSocket } from '../hooks/useSocket';

const Navbar = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const { connected, reconnecting } = useSocket();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const linkClass = ({ isActive }) =>
    `px-2.5 py-2 rounded-md text-xs font-medium transition-all duration-200 ${
      isActive
        ? 'bg-white/20 text-white shadow-inner'
        : 'text-gray-200 hover:bg-white/10 hover:text-white'
    }`;

  return (
    <nav className="bg-[#1e3a5f] shadow-lg sticky top-0 z-50">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Left: Logo */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            <span className="text-xl">🏗️</span>
            <span className="text-white font-bold text-sm tracking-tight">Construction Board</span>
          </div>

          {/* Center: Nav Links */}
          <div className="hidden lg:flex items-center space-x-0.5">
            <NavLink to="/dashboard" className={linkClass}>🏠 Dashboard</NavLink>
            <NavLink to="/select-area" className={linkClass}>🗺️ Select Area</NavLink>
            <NavLink to="/detection" className={linkClass}>🔍 Detection</NavLink>
            <NavLink to="/violations" className={linkClass}>⚠️ Violations</NavLink>
            <NavLink to="/analytics" className={linkClass}>📊 Analytics</NavLink>
            <NavLink to="/areas" className={linkClass}>🗂️ Areas</NavLink>
            <NavLink to="/sessions" className={linkClass}>📋 Sessions</NavLink>
            <NavLink to="/live" className={linkClass}>
              <span className="flex items-center">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1 animate-pulse"></span>
                Live
              </span>
            </NavLink>
          </div>

          {/* Right: Status + User + Logout */}
          <div className="flex items-center space-x-3">
            <MonitoringStatus connected={connected} reconnecting={reconnecting} />
            <span className="text-gray-200 text-xs hidden sm:inline">{user.username || 'User'}</span>
            <span className="text-[10px] px-2 py-0.5 bg-blue-500/30 text-blue-200 rounded-full capitalize">{user.role || 'citizen'}</span>
            <button onClick={handleLogout} className="px-2.5 py-1 text-xs text-gray-200 hover:text-white hover:bg-red-500/20 rounded-md transition-colors">
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
