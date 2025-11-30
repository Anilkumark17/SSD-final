import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Lock, Mail, Hospital, ArrowRight, CheckCircle2 } from "lucide-react";
import "../styles/login.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const success = await login(email, password);
    setLoading(false);

    if (success) {
      navigate("/employees");
    }
  };

  return (
    <div className="login-container">
      
      <div className="login-hero">
        <div className="hero-background"></div>
        <div className="hero-overlay"></div>

        <div className="hero-content">
          <div className="hero-badge">
            <span className="status-indicator">
              <span className="status-ping"></span>
              <span className="status-dot"></span>
            </span>
            System Operational
          </div>

          <h1 className="hero-title">
            Manage your hospital workforce with{" "}
            <span className="hero-highlight">precision</span>.
          </h1>

          <p className="hero-description">
            The advanced IT Admin portal for managing staff, roles, and access control.
          </p>

          <div className="hero-features">
            {[
              "Role-Based Access Control",
              "Real-time Updates",
              "Secure Authentication",
            ].map((item) => (
              <div key={item} className="feature-item">
                <CheckCircle2 className="feature-icon" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="login-form-section">
        <div className="login-form-wrapper">
          <div className="login-header">
            <div className="login-icon">
              <Hospital />
            </div>
            <h2 className="login-title">Welcome back</h2>
            <p className="login-subtitle">
              Please enter your details to sign in.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-wrapper">
                <Mail className="input-icon" />
                <input
                  id="email"
                  type="email"
                  placeholder="admin@hospital.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <Lock className="input-icon" />
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                "Signing in..."
              ) : (
                <span className="btn-content">
                  Sign In <ArrowRight />
                </span>
              )}
            </button>

          </form>

          <div className="login-footer">
            <p>
              Default credentials:{" "}
              <span className="credential-text">admin@hospital.com</span> /{" "}
              <span className="credential-text">admin123</span>
            </p>
          </div>

        </div>
      </div>

    </div>
  );
};

export default Login;
