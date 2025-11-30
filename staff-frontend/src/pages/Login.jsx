import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Activity, ArrowRight } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const success = await login(email, password);
    if (success) {
      navigate('/dashboard');
    }
    setLoading(false);
  };

  return (
    <div className="login-container" style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      {/* Hero Section */}
      <div className="login-hero" style={{ 
        width: '50%', 
        background: '#0f172a', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        color: 'white',
        padding: '3rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 10, maxWidth: '32rem' }}>
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            padding: '0.5rem 0.75rem', 
            background: 'rgba(59, 130, 246, 0.1)', 
            border: '1px solid rgba(59, 130, 246, 0.2)', 
            borderRadius: '9999px', 
            color: '#93c5fd', 
            marginBottom: '2rem' 
          }}>
            <Activity size={16} />
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>BedManager System</span>
          </div>
          
          <h1 style={{ fontSize: '3.5rem', fontWeight: 700, lineHeight: 1.1, marginBottom: '1.5rem', fontFamily: 'Outfit, sans-serif' }}>
            Real-Time <span style={{ color: '#60a5fa' }}>ICU & Bed</span> Management
          </h1>
          
          <p style={{ fontSize: '1.125rem', color: '#cbd5e1', lineHeight: 1.75, marginBottom: '2rem' }}>
            Streamline patient admissions, track bed occupancy in real-time, and manage emergency requests with our advanced hospital management dashboard.
          </p>
        </div>
      </div>

      {/* Form Section */}
      <div className="login-form-section" style={{ 
        width: '50%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '2rem', 
        background: 'white' 
      }}>
        <div style={{ width: '100%', maxWidth: '28rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              width: '3rem', 
              height: '3rem', 
              borderRadius: '0.75rem', 
              background: '#0d6efd', 
              color: 'white', 
              marginBottom: '1rem',
              boxShadow: '0 10px 25px rgba(13, 110, 253, 0.2)'
            }}>
              <Activity size={24} />
            </div>
            <h2 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>Welcome Back</h2>
            <p style={{ color: '#64748b' }}>Sign in to access the staff dashboard</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.5rem' }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  style={{ 
                    width: '100%', 
                    padding: '0.75rem 1rem 0.75rem 2.75rem', 
                    borderRadius: '0.5rem', 
                    border: '1px solid #e2e8f0', 
                    outline: 'none',
                    fontSize: '0.95rem',
                    transition: 'all 0.2s'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.5rem' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  style={{ 
                    width: '100%', 
                    padding: '0.75rem 1rem 0.75rem 2.75rem', 
                    borderRadius: '0.5rem', 
                    border: '1px solid #e2e8f0', 
                    outline: 'none',
                    fontSize: '0.95rem',
                    transition: 'all 0.2s'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                width: '100%',
                padding: '0.875rem',
                background: '#0d6efd',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'background 0.2s',
                boxShadow: '0 4px 12px rgba(13, 110, 253, 0.25)'
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
              {!loading && <ArrowRight size={20} />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
