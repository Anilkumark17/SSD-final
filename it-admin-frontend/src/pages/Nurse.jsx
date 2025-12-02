import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Hospital, Users, AlertTriangle, Search, Bell, LogOut } from 'lucide-react';
import '../styles/layout.css';
import '../styles/employees.css';

const Nurse = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        // Try to fetch patients and alerts if the API exposes them; tolerate missing endpoints
        const [pResp, aResp] = await Promise.allSettled([
          api.get('/patients'),
          api.get('/alerts')
        ]);

        if (pResp.status === 'fulfilled' && Array.isArray(pResp.value.data)) {
          setPatients(pResp.value.data);
        } else {
          setPatients([]);
        }

        if (aResp.status === 'fulfilled' && Array.isArray(aResp.value.data)) {
          setAlerts(aResp.value.data);
        } else {
          setAlerts([]);
        }
      } catch (err) {
        console.error('Nurse fetch error', err);
        setError('Unable to load nurse data.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const filteredPatients = Array.isArray(patients)
    ? patients.filter(p => {
        const name = p?.name || '';
        return name.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : [];

  return (
    <div className="employees-page">
      <header className="top-nav">
        <div className="nav-container">
          <div className="nav-left">
            <div className="brand">
              <div className="brand-icon">
                <Hospital />
              </div>
              <span className="brand-name">MedAdmin</span>
            </div>

            <nav className="nav-links">
              <a href="#" className="nav-link active">Dashboard</a>
            </nav>
          </div>

          <div className="nav-right">
            <div className="search-box">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Search patients..."
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <button className="notification-btn">
              <Bell />
              <span className="notification-badge"></span>
            </button>

            <div className="nav-divider"></div>

            <div className="user-section">
              <div className="user-info">
                <p className="user-name">{user?.name || 'Nurse'}</p>
                <p className="user-role">Nurse</p>
              </div>
              <button onClick={handleLogout} className="logout-btn">
                <LogOut />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="page-header">
          <div className="header-text">
            <h1 className="page-title">Nurse Dashboard</h1>
            <p className="page-subtitle">Overview of assigned patients and active alerts.</p>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon stat-icon-blue"><Users /></div>
              <span className="stat-badge">Assigned</span>
            </div>
            <div className="stat-value">{filteredPatients.length}</div>
            <p className="stat-label">Patients Assigned</p>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon stat-icon-red"><AlertTriangle /></div>
              <span className="stat-badge stat-badge-red">Alerts</span>
            </div>
            <div className="stat-value">{alerts.length}</div>
            <p className="stat-label">Active Alerts</p>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon stat-icon-green"><Users /></div>
              <span className="stat-badge">Today</span>
            </div>
            <div className="stat-value">{patients.filter(p=>p?.status==='inpatient').length}</div>
            <p className="stat-label">Inpatients</p>
          </div>
        </div>

        <div className="table-card">
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p className="loading-text">Loading nurse data...</p>
            </div>
          ) : error ? (
            <div className="error-container">
              <p className="error-text">{error}</p>
            </div>
          ) : (
            <div>
              <h3>Patient List</h3>
              {filteredPatients.length === 0 ? (
                <p>No patients found.</p>
              ) : (
                <ul>
                  {filteredPatients.slice(0, 20).map((p) => (
                    <li key={p.id || p._id}>{p.name || p.fullName || 'Unnamed Patient'}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Nurse;
