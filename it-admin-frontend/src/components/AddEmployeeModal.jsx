import { useState } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { UserPlus, Mail, Lock, User, Shield, X } from 'lucide-react';

const ROLES = ['IT_ADMIN', 'ER_STAFF', 'ICU_MANAGER', 'WARD_STAFF', 'HOSPITAL_ADMIN'];

const AddEmployeeModal = ({ open, onClose, onUserAdded }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    roles: [],
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRoleToggle = (role) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.password || formData.roles.length === 0) {
      toast.error('Please fill all fields and select at least one role');
      return;
    }

    setLoading(true);
    try {
      await api.post('/users', formData);
      toast.success('Employee added successfully');
      onUserAdded();
      onClose();
      setFormData({ name: '', email: '', password: '', roles: [] });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add employee');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-icon">
            <UserPlus />
          </div>
          <div className="modal-header-text">
            <h2 className="modal-title">Add New Employee</h2>
            <p className="modal-description">
              Create a new account with specific roles and permissions.
            </p>
          </div>
          <button onClick={onClose} className="modal-close-btn">
            <X />
          </button>
        </div>
        
        <div className="modal-body">
          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-fields">
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <div className="input-wrapper">
                  <User className="input-icon" />
                  <input
                    id="name"
                    name="name"
                    placeholder="e.g. Sarah Connor"
                    value={formData.name}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <div className="input-wrapper">
                  <Mail className="input-icon" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="sarah@hospital.com"
                    value={formData.email}
                    onChange={handleChange}
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
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                </div>
              </div>
            </div>
            
            <div className="roles-section">
              <label className="roles-label">
                <Shield />
                Assign Roles
              </label>
              <div className="roles-grid">
                {ROLES.map((role) => (
                  <div 
                    key={role} 
                    className={`role-checkbox-item ${
                      formData.roles.includes(role) ? 'role-checkbox-checked' : ''
                    }`}
                    onClick={() => handleRoleToggle(role)}
                  >
                    <input
                      type="checkbox"
                      id={role}
                      checked={formData.roles.includes(role)}
                      onChange={() => handleRoleToggle(role)}
                      className="checkbox-input"
                    />
                    <label htmlFor={role} className="checkbox-label">
                      {role.replace('_', ' ')}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                type="button" 
                onClick={onClose} 
                disabled={loading}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={loading}
                className="btn-primary"
              >
                {loading ? 'Adding...' : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddEmployeeModal;
