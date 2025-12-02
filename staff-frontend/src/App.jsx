import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Beds from './pages/Beds';
import Patients from './pages/Patients';
import Emergency from './pages/Emergency';
import Forecasting from './pages/Forecasting';
import Alerts from './pages/Alerts';
import Reports from './pages/Reports';
import AdminPanel from './pages/AdminPanel';
import BedRequests from './pages/BedRequests';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="beds" element={<Beds />} />
        <Route path="patients" element={<Patients />} />
        <Route path="emergency" element={<Emergency />} />
        <Route path="forecasting" element={<Forecasting />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="reports" element={<Reports />} />
        <Route path="admin" element={<AdminPanel />} />
        <Route path="bed-requests" element={<BedRequests />} />
      </Route>
    </Routes>
  );
}

export default App;
