import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import EmployeeTable from '../components/EmployeeTable';
import AddEmployeeModal from '../components/AddEmployeeModal';
import EditEmployeeModal from '../components/EditEmployeeModal';
import api from '../api/axios';
import {
  UserPlus,
  LogOut,
  Users,
  UserCheck,
  UserX,
  Hospital,
  Search,
  Bell
} from 'lucide-react';
import '../styles/employees.css';
import '../styles/table.css';

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await api.get('/users');
      // Ensure data is always an array
      setEmployees(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch employees', error);
      setError('Failed to load employee data. Please try again.');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Safe filtering with proper checks
  const filteredEmployees = Array.isArray(employees)
    ? employees.filter(emp => {
      const name = emp?.name || '';
      const email = emp?.email || '';
      const query = searchQuery.toLowerCase();
      return name.toLowerCase().includes(query) ||
        email.toLowerCase().includes(query);
    })
    : [];

  const activeCount = employees.filter(e => e?.isActive === true).length;
  const inactiveCount = employees.filter(e => e?.isActive === false).length;

  return (
    <div className="employees-page">
      {/* Top Navigation Bar */}
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
              <a href="#" className="nav-link">Departments</a>
              <a href="#" className="nav-link">Settings</a>
            </nav>
          </div>

          <div className="nav-right">
            <div className="search-box">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Search..."
                className="search-input"
              />
            </div>

            <button className="notification-btn">
              <Bell />
              <span className="notification-badge"></span>
            </button>

            <div className="nav-divider"></div>

            <div className="user-section">
              <div className="user-info">
                <p className="user-name">{user?.name || 'User'}</p>
                <p className="user-role">IT Admin</p>
              </div>
              <button
                onClick={handleLogout}
                className="logout-btn"
              >
                <LogOut />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="main-content">
        {/* Page Header */}
        <div className="page-header">
          <div className="header-text">
            <h1 className="page-title">Employee Management</h1>
            <p className="page-subtitle">Manage access, roles, and status for hospital staff.</p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn-primary"
          >
            <UserPlus />
            Add Employee
          </button>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon stat-icon-blue">
                <Users />
              </div>
              <span className="stat-badge">Total</span>
            </div>
            <div className="stat-value">{employees.length}</div>
            <p className="stat-label">Registered Employees</p>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon stat-icon-green">
                <UserCheck />
              </div>
              <span className="stat-badge stat-badge-green">Active</span>
            </div>
            <div className="stat-value">{activeCount}</div>
            <p className="stat-label">Operational Accounts</p>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon stat-icon-red">
                <UserX />
              </div>
              <span className="stat-badge stat-badge-red">Inactive</span>
            </div>
            <div className="stat-value">{inactiveCount}</div>
            <p className="stat-label">Deactivated Accounts</p>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="filter-bar">
          <div className="search-group">
            <Search className="search-icon-large" />
            <input
              type="text"
              placeholder="Search employees by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input-large"
            />
          </div>
          <div className="filter-controls">
            <select className="filter-select">
              <option>All Roles</option>
              <option>IT Admin</option>
              <option>Medical Staff</option>
            </select>
            <select className="filter-select">
              <option>All Status</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
        </div>

        {/* Main Table Card */}
        <div className="table-card">
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p className="loading-text">Loading employee data...</p>
            </div>
          ) : error ? (
            <div className="error-container">
              <p className="error-text">{error}</p>
              <button onClick={fetchEmployees} className="btn-retry">
                Retry
              </button>
            </div>
          ) : (
            <EmployeeTable
              employees={filteredEmployees}
              onEdit={(emp) => setEditEmployee(emp)}
            />
          )}
        </div>
      </main>

      <AddEmployeeModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onUserAdded={fetchEmployees}
      />

      <EditEmployeeModal
        open={!!editEmployee}
        onClose={() => setEditEmployee(null)}
        employee={editEmployee}
        onUserUpdated={fetchEmployees}
      />
    </div>
  );
};

export default Employees;