import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Hospital, Stethoscope, FileText, Search, Bell, LogOut } from 'lucide-react';
import '../styles/layout.css';
import '../styles/employees.css';

const Doctor = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState([]);
  const [consults, setConsults] = useState([]);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [pResp, cResp] = await Promise.allSettled([
          api.get('/patients'),
          api.get('/consultations')
        ]);

        if (pResp.status === 'fulfilled' && Array.isArray(pResp.value.data)) {
          setPatients(pResp.value.data);
        } else {
          setPatients([]);
        }

        if (cResp.status === 'fulfilled' && Array.isArray(cResp.value.data)) {
          setConsults(cResp.value.data);
        } else {
          setConsults([]);
        }
      } catch (err) {
        console.error('Doctor fetch error', err);
        setError('Unable to load doctor data.');
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
    ? patients.filter(p => (p?.name || '').toLowerCase().includes(searchQuery.toLowerCase()))
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
                placeholder="Search patients or consults..."
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
                <p className="user-name">{user?.name || 'Doctor'}</p>
                <p className="user-role">Doctor</p>
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
            <h1 className="page-title">Doctor Dashboard</h1>
            <p className="page-subtitle">Manage consultations, review patient lists and results.</p>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon stat-icon-blue"><Stethoscope /></div>
              <span className="stat-badge">Active</span>
            </div>
            <div className="stat-value">{filteredPatients.length}</div>
            <p className="stat-label">Active Patients</p>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon stat-icon-green"><FileText /></div>
              <span className="stat-badge">Consults</span>
            </div>
            <div className="stat-value">{consults.length}</div>
            <p className="stat-label">Pending Consultations</p>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon stat-icon-red"><FileText /></div>
              <span className="stat-badge stat-badge-red">Results</span>
            </div>
            <div className="stat-value">{patients.filter(p=>p?.hasLabResults).length}</div>
            <p className="stat-label">Lab Results</p>
          </div>
        </div>

        <div className="table-card">
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p className="loading-text">Loading doctor data...</p>
            </div>
          ) : error ? (
            <div className="error-container">
              <p className="error-text">{error}</p>
            </div>
          ) : (
            <div>
              <h3>Patients</h3>
              {filteredPatients.length === 0 ? (
                <p>No patients match your search.</p>
              ) : (
                <ul>
                  {filteredPatients.slice(0, 30).map((p) => (
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

export default Doctor;
