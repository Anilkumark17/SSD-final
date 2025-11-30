import React from 'react';

const BedDetailsModal = ({ 
  bed, 
  onClose, 
  onUpdateStatus, 
  onDischarge, 
  onAssign, 
  user 
}) => {
  if (!bed) return null;

  const getStatusColor = (status) => {
    const colors = {
      available: '#10b981',
      occupied: '#ef4444',
      cleaning: '#f59e0b',
      reserved: '#3b82f6',
      maintenance: '#6b7280'
    };
    return colors[status] || '#6b7280';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content bed-details-modal" onClick={(e) => e.stopPropagation()}>
        <div className="bed-modal-header">
          <div>
            <h3>🛏️ Bed {bed.bedNumber}</h3>
            <p className="bed-modal-ward">{bed.ward?.name || 'Unknown Ward'}</p>
          </div>
          <span className="bed-modal-status" style={{ backgroundColor: getStatusColor(bed.status) }}>
            {bed.status}
          </span>
        </div>

        <div className="bed-modal-info">
          <div className="info-row">
            <span className="info-label">Equipment Type:</span>
            <span className="info-value">{bed.equipmentType.length > 0 ? bed.equipmentType.join(', ') : 'Standard'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Last Updated:</span>
            <span className="info-value">{new Date(bed.lastUpdated).toLocaleString()}</span>
          </div>
          {bed.status === 'cleaning' && bed.estimatedAvailableTime && (
            <div className="info-row">
              <span className="info-label">Est. Available Time:</span>
              <span className="info-value">{new Date(bed.estimatedAvailableTime).toLocaleString()}</span>
            </div>
          )}
        </div>

        {bed.status === 'occupied' && bed.currentPatient ? (
          <div className="patient-details-section">
            <h4>👤 Patient Information</h4>
            <div className="patient-info-grid">
              <div className="info-card">
                <span className="info-card-label">Patient Name</span>
                <span className="info-card-value">{bed.currentPatient.name}</span>
              </div>
              <div className="info-card">
                <span className="info-card-label">Patient ID</span>
                <span className="info-card-value">{bed.currentPatient.patientId}</span>
              </div>
              <div className="info-card">
                <span className="info-card-label">Age</span>
                <span className="info-card-value">{bed.currentPatient.age}</span>
              </div>
              <div className="info-card">
                <span className="info-card-label">Gender</span>
                <span className="info-card-value">{bed.currentPatient.gender}</span>
              </div>
              <div className="info-card full-width">
                <span className="info-card-label">Reason for Admission</span>
                <span className="info-card-value">{bed.currentPatient.reasonForAdmission}</span>
              </div>
              <div className="info-card">
                <span className="info-card-label">Department</span>
                <span className="info-card-value">{bed.currentPatient.department}</span>
              </div>
              <div className="info-card">
                <span className="info-card-label">Priority</span>
                <span className={`priority-badge ${bed.currentPatient.priority}`}>
                  {bed.currentPatient.priority}
                </span>
              </div>
              <div className="info-card">
                <span className="info-card-label">Admission Date</span>
                <span className="info-card-value">
                  {new Date(bed.currentPatient.admittedAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {(user?.role === 'ICU_MANAGER' || user?.role === 'Medical Staff') && (
              <div className="modal-actions">
                <button className="discharge-btn"
                  onClick={() => onDischarge(bed.currentPatient._id)}>
                  Discharge Patient
                </button>
                <button type="button" onClick={onClose}>Close</button>
              </div>
            )}
          </div>
        ) : (
          <div className="empty-bed-section">
            <div className="empty-bed-icon">🛏️</div>
            <h4>This bed is {bed.status}</h4>
            <p>
              {bed.status === 'available' && 'Ready to assign to a new patient'}
              {bed.status === 'cleaning' && 'Currently being cleaned and prepared'}
              {bed.status === 'reserved' && 'Reserved for an incoming patient'}
              {bed.status === 'maintenance' && 'Under maintenance'}
            </p>

            {bed.status === 'available' && (user?.role === 'ICU_MANAGER' || user?.role === 'Medical Staff' || user?.role === 'WARD_STAFF') && (
              <button className="primary-btn"
                onClick={() => onAssign(bed)}>
                Assign Patient to This Bed
              </button>
            )}

            {(user?.role === 'ICU_MANAGER' || user?.role === 'Medical Staff' || user?.role === 'WARD_STAFF') && (
              <div className="bed-status-actions">
                <label>Update Bed Status:</label>
                <select value={bed.status}
                  onChange={(e) => onUpdateStatus(bed._id, e.target.value)}
                  className="status-select">
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                  <option value="cleaning">Cleaning</option>
                  <option value="reserved">Reserved</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
            )}
          </div>
        )}

        {!(bed.status === 'occupied' && bed.currentPatient) && (
          <div className="modal-actions">
            <button type="button" onClick={onClose}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BedDetailsModal;
