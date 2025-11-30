import { useState, useEffect } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { UserCog, Shield, Power, X } from 'lucide-react';

const ROLES = ['IT_ADMIN', 'ER_STAFF', 'ICU_MANAGER', 'WARD_STAFF', 'HOSPITAL_ADMIN'];

const EditEmployeeModal = ({ open, onClose, employee, onUserUpdated }) => {
  const [roles, setRoles] = useState([]);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (employee) {
      // Ensure roles is always an array
      setRoles(Array.isArray(employee.roles) ? employee.roles : []);
      setIsActive(employee.isActive ?? true);
    } else {
      // Reset when employee is null
      setRoles([]);
      setIsActive(true);
    }
  }, [employee]);

  const handleRoleToggle = (role) => {
    setRoles(prev => {
      // Ensure prev is always an array
      const currentRoles = Array.isArray(prev) ? prev : [];
      return currentRoles.includes(role)
        ? currentRoles.filter(r => r !== role)
        : [...currentRoles, role];
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!Array.isArray(roles) || roles.length === 0) {
      toast.error('Please select at least one role');
      return;
    }

    setLoading(true);
    try {
      await api.patch(`/users/${employee._id}`, { roles, isActive });
      toast.success('Employee updated successfully');
      onUserUpdated();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update employee');
    } finally {
      setLoading(false);
    }
  };

  if (!employee || !open) return null;

  // Ensure roles is always an array for rendering
  const safeRoles = Array.isArray(roles) ? roles : [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header modal-header-purple">
          <div className="modal-icon modal-icon-purple">
            <UserCog />
          </div>
          <div className="modal-header-text">
            <h2 className="modal-title">Edit Employee</h2>
            <p className="modal-description">
              Update permissions and status for <span className="employee-name-highlight">{employee?.name || 'employee'}</span>
            </p>
          </div>
          <button onClick={onClose} className="modal-close-btn">
            <X />
          </button>
        </div>
        
        <div className="modal-body">
          <div className="modal-form">
            <div className="roles-section">
              <label className="roles-label">
                <Shield />
                Role Assignment
              </label>
              <div className="roles-grid">
                {ROLES.map((role) => (
                  <div 
                    key={role} 
                    className={`role-checkbox-item ${
                      safeRoles.includes(role) ? 'role-checkbox-checked-purple' : ''
                    }`}
                    onClick={() => handleRoleToggle(role)}
                  >
                    <input
                      type="checkbox"
                      id={`edit-${role}`}
                      checked={safeRoles.includes(role)}
                      onChange={() => handleRoleToggle(role)}
                      className="checkbox-input"
                    />
                    <label htmlFor={`edit-${role}`} className="checkbox-label">
                      {role.replace('_', ' ')}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="status-section">
              <div className="status-content">
                <div className="status-info">
                  <div className={`status-icon ${isActive ? 'status-icon-active' : 'status-icon-inactive'}`}>
                    <Power />
                  </div>
                  <div className="status-text">
                    <label htmlFor="active-status" className="status-title">
                      Account Status
                    </label>
                    <p className="status-description">
                      {isActive 
                        ? 'User can log in and access the system' 
                        : 'User access is currently revoked'}
                    </p>
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    id="active-status"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="toggle-input"
                  />
                  <span className="toggle-slider"></span>
                </label>
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
                type="button" 
                onClick={handleSubmit}
                disabled={loading}
                className="btn-primary btn-primary-purple"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditEmployeeModal;