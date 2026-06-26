import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SelectArea from './pages/SelectArea';
import Detection from './pages/Detection';
import Violations from './pages/Violations';
import Analytics from './pages/Analytics';
import LiveMonitoring from './pages/LiveMonitoring';
import AreasList from './pages/AreasList';
import ScanHistory from './pages/ScanHistory';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (token) return <Navigate to="/dashboard" replace />;
  return children;
};

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/select-area" element={<ProtectedRoute><SelectArea /></ProtectedRoute>} />
          <Route path="/detection" element={<ProtectedRoute><Detection /></ProtectedRoute>} />
          <Route path="/violations" element={<ProtectedRoute><Violations /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          <Route path="/live" element={<ProtectedRoute><LiveMonitoring /></ProtectedRoute>} />
          <Route path="/areas" element={<ProtectedRoute><AreasList /></ProtectedRoute>} />
          <Route path="/sessions" element={<ProtectedRoute><ScanHistory /></ProtectedRoute>} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ToastContainer
          position="bottom-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </Router>
    </ErrorBoundary>
  );
}

export default App;
