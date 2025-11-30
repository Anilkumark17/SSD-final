import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  BedDouble, 
  Users, 
  Siren, 
  LogOut, 
  Activity,
  Menu,
  X,
  TrendingUp,
  Bell,
  FileText
} from 'lucide-react';
import { useState } from 'react';

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ICU_MANAGER', 'WARD_STAFF', 'ER_STAFF', 'HOSPITAL_ADMIN', 'Medical Staff', 'Nurse', 'Doctor'] },

    { path: '/patients', label: 'Patients', icon: Users, roles: ['ICU_MANAGER', 'WARD_STAFF', 'HOSPITAL_ADMIN', 'Medical Staff', 'Nurse', 'Doctor'] },
    { path: '/emergency', label: 'Emergency Requests', icon: Siren, roles: ['ICU_MANAGER', 'ER_STAFF', 'HOSPITAL_ADMIN', 'Medical Staff'] },
    { path: '/bed-requests', label: 'Bed Requests', icon: FileText, roles: ['ICU_MANAGER', 'WARD_STAFF', 'ER_STAFF', 'HOSPITAL_ADMIN', 'Medical Staff'] },
    { path: '/alerts', label: 'Alerts', icon: Bell, roles: ['ICU_MANAGER', 'WARD_STAFF', 'ER_STAFF', 'HOSPITAL_ADMIN', 'Medical Staff', 'Nurse', 'Doctor'] },
    { path: '/forecasting', label: 'Forecasting', icon: TrendingUp, roles: ['ICU_MANAGER', 'HOSPITAL_ADMIN', 'Medical Staff'] },
  ];

  // Filter nav items based on user roles
  const filteredNavItems = navItems.filter(item => {
    if (!user) return false;
    const userRoles = user.roles || (user.role ? [user.role] : []);
    return item.roles.some(role => userRoles.includes(role));
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      {/* Sidebar - Desktop */}
      <aside style={{ 
        width: '16rem', 
        background: 'white', 
        borderRight: '1px solid #e2e8f0', 
        display: 'flex', 
        flexDirection: 'column',
        position: 'fixed',
        height: '100vh',
        zIndex: 50,
        transition: 'transform 0.3s',
        transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(0)',
        '@media (max-width: 768px)': {
           transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)'
        }
      }} className="sidebar-desktop">
        
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ 
            width: '2rem', 
            height: '2rem', 
            background: '#0d6efd', 
            borderRadius: '0.5rem', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: 'white' 
          }}>
            <Activity size={18} />
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', fontFamily: 'Outfit, sans-serif' }}>BedManager</span>
        </div>

        <nav style={{ flex: 1, padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  textDecoration: 'none',
                  color: isActive ? '#0d6efd' : '#64748b',
                  background: isActive ? '#eff6ff' : 'transparent',
                  fontWeight: isActive ? 600 : 500,
                  transition: 'all 0.2s'
                }}
                onClick={() => setMobileMenuOpen(false)}
              >
                <item.icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>{user?.name}</p>
            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{user?.email}</p>
            {(user?.roles || user?.role) && (
              <div style={{ marginTop: '0.25rem' }}>
                <span style={{ fontSize: '0.65rem', padding: '0.125rem 0.375rem', background: '#e2e8f0', borderRadius: '9999px', color: '#475569' }}>
                  {(user.roles ? user.roles.join(', ') : user.role).replace(/_/g, ' ')}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={logout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              width: '100%',
              padding: '0.75rem',
              background: 'transparent',
              border: '1px solid #e2e8f0',
              borderRadius: '0.5rem',
              color: '#64748b',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#fee2e2';
              e.currentTarget.style.color = '#dc2626';
              e.currentTarget.style.borderColor = '#fee2e2';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#64748b';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div style={{ 
        display: 'none',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '4rem',
        background: 'white',
        borderBottom: '1px solid #e2e8f0',
        zIndex: 40,
        alignItems: 'center',
        padding: '0 1rem',
        justifyContent: 'space-between'
      }} className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <span style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>BedManager</span>
        </div>
      </div>

      {/* Main Content */}
      <main style={{ 
        flex: 1, 
        marginLeft: '16rem',
        padding: '2rem',
        marginTop: '0',
        minHeight: '100vh'
      }} className="main-content">
        <Outlet />
      </main>

      {/* CSS for responsiveness */}
      <style>{`
        @media (max-width: 768px) {
          .sidebar-desktop {
            transform: ${mobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)'} !important;
            box-shadow: ${mobileMenuOpen ? '0 0 20px rgba(0,0,0,0.1)' : 'none'};
          }
          .mobile-header {
            display: flex !important;
          }
          .main-content {
            margin-left: 0 !important;
            margin-top: 4rem !important;
            padding: 1rem !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Layout;
