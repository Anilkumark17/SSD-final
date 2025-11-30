import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import './Beds.css';

const Beds = () => {
  const [beds, setBeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBed, setSelectedBed] = useState(null);
  const [showBedDetailsModal, setShowBedDetailsModal] = useState(false);
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [recommendedBeds, setRecommendedBeds] = useState([]);
  const { socket } = useSocket();
  const { user } = useAuth();

  const [patientForm, setPatientForm] = useState({
    name: '',
    age: '',
    gender: 'Male',
    reasonForAdmission: '',
    department: '',
    priority: 'low',
    wardType: '',
    assignedBed: ''
  });

  useEffect(() => {
    fetchBeds();

    if (socket) {
      socket.on('bed:updated', fetchBeds);
      socket.on('patient:admitted', fetchBeds);
      socket.on('patient:discharged', fetchBeds);

      return () => {
        socket.off('bed:updated');
        socket.off('patient:admitted');
        socket.off('patient:discharged');
      };
    }
  }, [socket]);

  const fetchBeds = async () => {
    try {
      const { data } = await api.get('/beds');
      setBeds(data);
    } catch (error) {
      console.error('Error fetching beds:', error);
      toast.error('Failed to fetch beds');
    } finally {
      setLoading(false);
    }
  };

  const handleBedClick = (bed) => {
    setSelectedBed(bed);
    setShowBedDetailsModal(true);
  };

  const handleBedStatusUpdate = async (bedId, status) => {
    try {
      const payload = { status };
      if (status === 'cleaning') {
        const estimatedTime = new Date(Date.now() + 30 * 60 * 1000);
        payload.estimatedAvailableTime = estimatedTime;
      }
      console.log('Updating bed status:', bedId, status);
      await api.patch(`/beds/${bedId}`, payload);
      toast.success('Bed status updated successfully!');
      setShowBedDetailsModal(false);
      // Don't manually fetch - Socket.IO will trigger update
    } catch (error) {
      console.error('Bed status update error:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to update bed status');
    }
  };

  const handlePatientDischarge = async (patientId) => {
    if (!window.confirm('Are you sure you want to discharge this patient?')) return;

    try {
      await api.post(`/patients/${patientId}/discharge`);
      toast.success('Patient discharged successfully');
      setShowBedDetailsModal(false);
      fetchBeds();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to discharge patient');
    }
  };

  const getBedRecommendations = async (wardType) => {
    try {
      const { data } = await api.post('/beds/recommend', {
        wardType,
        equipmentType: 'standard',
        priority: patientForm.priority
      });
      setRecommendedBeds(data);
    } catch (error) {
      console.error('Error getting recommendations:', error);
      setRecommendedBeds([]);
    }
  };

  const getAvailableBedsByWard = (wardType) => {
    if (!wardType) return [];
    return beds.filter(bed => bed.status === 'available' && bed.ward?.name === wardType);
  };

  const handlePatientSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Validate bedId before sending
      if (!patientForm.assignedBed) {
        toast.error('Please select a bed');
        setLoading(false);
        return;
      }

      // Send bedId to match backend expectation
      const patientData = {
        name: patientForm.name,
        age: patientForm.age,
        gender: patientForm.gender,
        reasonForAdmission: patientForm.reasonForAdmission,
        department: patientForm.department,
        priority: patientForm.priority,
        bedId: patientForm.assignedBed  // Map assignedBed to bedId for backend
      };
      
      console.log('=== Patient Submission Debug ===');
      console.log('Patient Data:', patientData);
      console.log('Bed ID being sent:', patientData.bedId);
      console.log('Ward Type:', patientForm.wardType);
      console.log('Available beds for this ward:', getAvailableBedsByWard(patientForm.wardType).map(b => ({ id: b._id, number: b.bedNumber })));
      
      const response = await api.post('/patients', patientData);
      console.log('Patient admission response:', response.data);
      
      toast.success('Patient admitted successfully!');
      setShowPatientForm(false);
      setPatientForm({
        name: '',
        age: '',
        gender: 'Male',
        reasonForAdmission: '',
        department: '',
        priority: 'low',
        wardType: '',
        assignedBed: ''
      });
      setRecommendedBeds([]);
      // Don't manually fetch - Socket.IO will trigger update
    } catch (error) {
      console.error('=== Patient Admission Error ===');
      console.error('Error response:', error.response?.data);
      console.error('Full error:', error);
      toast.error(error.response?.data?.message || 'Failed to admit patient');
    }
    setLoading(false);
  };

  const getStatusColor = (status) => {
    const colors = {
      available: '#22c55e',
      occupied: '#fca5a5',
      cleaning: '#f59e0b',
      reserved: '#3b82f6',
      maintenance: '#6b7280'
    };
    return colors[status] || '#6b7280';
  };

  const getBedIcon = (status) => {
    const icons = {
      available: '🛏️',
      occupied: '🚪',
      cleaning: '🧹',
      reserved: '🔒',
      maintenance: '⚙️'
    };
    return icons[status] || '🛏️';
  };

  const renderBedGrid = (wardBeds, wardName) => {
    const bedsPerRow = 10;
    const rows = Math.ceil(wardBeds.length / bedsPerRow);
    
    if (wardBeds.length === 0) return null;
    
    return (
      <div className="bed-visual-grid" style={{ marginBottom: '2rem' }}>
        <h4 className="ward-grid-title">🏥 {wardName} ({wardBeds.length} Beds)</h4>
        <div className="bed-grid-container">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="bed-grid-row">
              {wardBeds
                .slice(rowIndex * bedsPerRow, (rowIndex + 1) * bedsPerRow)
                .map((bed) => (
                  <div
                    key={bed._id}
                    className="bed-grid-item"
                    style={{ backgroundColor: getStatusColor(bed.status), cursor: 'pointer' }}
                    onClick={() => handleBedClick(bed)}
                    title={`Bed ${bed.bedNumber} - ${bed.status}${bed.currentPatient ? ` - ${bed.currentPatient.name}` : ''}`}
                  >
                    <span className="bed-grid-icon">{getBedIcon(bed.status)}</span>
                    <span className="bed-grid-number">{bed.bedNumber.split('-')[1] || bed.bedNumber}</span>
                  </div>
                ))}
            </div>
          ))}
        </div>
        <div className="bed-grid-legend">
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#22c55e' }}></span>
            <span>Available</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#fca5a5' }}></span>
            <span>Occupied</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#f59e0b' }}></span>
            <span>Cleaning</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#3b82f6' }}></span>
            <span>Reserved</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#6b7280' }}></span>
            <span>Maintenance</span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <div className="loading-container">Loading beds...</div>;

  const icuBeds = beds.filter(b => b.ward?.name === 'ICU' || b.ward?.type === 'ICU');
  const erBeds = beds.filter(b => b.ward?.name === 'ER' || b.ward?.type === 'ER');
  const generalBeds = beds.filter(b => b.ward?.name === 'General Ward' || b.ward?.type === 'General Ward');

  return (
    <div className="beds-page">
      <div className="page-header">
        <h1>🛏️ Bed Management</h1>
        <p>Click on any bed to view details or assign patients</p>
      </div>

      {/* ICU Beds */}
      {renderBedGrid(icuBeds, 'ICU')}

      {/* ER Beds */}
      {renderBedGrid(erBeds, 'Emergency Room')}

      {/* General Ward Beds */}
      {renderBedGrid(generalBeds, 'General Ward')}

      {beds.length === 0 && (
        <div className="no-data">
          <p>No beds found in the system. Please contact administrator.</p>
        </div>
      )}

      {/* Bed Details Modal */}
      {showBedDetailsModal && selectedBed && (
        <div className="modal-overlay" onClick={() => setShowBedDetailsModal(false)}>
          <div className="modal-content bed-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bed-modal-header">
              <div>
                <h3>🛏️ Bed {selectedBed.bedNumber}</h3>
                <p className="bed-modal-ward">{selectedBed.ward?.name || 'Unknown Ward'}</p>
              </div>
              <span className="bed-modal-status" style={{ backgroundColor: getStatusColor(selectedBed.status) }}>
                {selectedBed.status}
              </span>
            </div>

            <div className="bed-modal-body">
              <div className="bed-modal-info">
                <h4>Bed Information</h4>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Equipment</span>
                    <span className="info-value">
                      {selectedBed.equipmentType?.length > 0 ? selectedBed.equipmentType.join(', ') : 'Standard'}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Floor</span>
                    <span className="info-value">{selectedBed.floor || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Last Updated</span>
                    <span className="info-value">{new Date(selectedBed.lastUpdated).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {selectedBed.status === 'occupied' && selectedBed.currentPatient ? (
                <div className="patient-details-section">
                  <h4>👤 Patient Information</h4>
                  <div className="patient-info-grid">
                    <div className="info-card">
                      <span className="info-card-label">Patient Name</span>
                      <span className="info-card-value">{selectedBed.currentPatient.name}</span>
                    </div>
                    <div className="info-card">
                      <span className="info-card-label">Patient ID</span>
                      <span className="info-card-value">{selectedBed.currentPatient.patientId}</span>
                    </div>
                    <div className="info-card">
                      <span className="info-card-label">Age</span>
                      <span className="info-card-value">{selectedBed.currentPatient.age}</span>
                    </div>
                    <div className="info-card">
                      <span className="info-card-label">Gender</span>
                      <span className="info-card-value">{selectedBed.currentPatient.gender}</span>
                    </div>
                    <div className="info-card full-width">
                      <span className="info-card-label">Reason for Admission</span>
                      <span className="info-card-value">{selectedBed.currentPatient.reasonForAdmission}</span>
                    </div>
                  </div>

                  <button
                    className="discharge-btn"
                    onClick={() => handlePatientDischarge(selectedBed.currentPatient._id)}
                  >
                    Discharge Patient
                  </button>
                </div>
              ) : (
                <div className="empty-bed-section">
                  <div className="empty-bed-icon">🛏️</div>
                  <h4>This bed is {selectedBed.status}</h4>
                  <p className="empty-bed-description">
                    {selectedBed.status === 'available' && 'Ready to assign to a new patient'}
                    {selectedBed.status === 'cleaning' && 'Currently being cleaned and prepared'}
                    {selectedBed.status === 'reserved' && 'Reserved for an incoming patient'}
                    {selectedBed.status === 'maintenance' && 'Under maintenance'}
                  </p>

                  {selectedBed.status === 'available' && (
                    <button
                      className="primary-btn"
                      onClick={() => {
                        setShowBedDetailsModal(false);
                        setShowPatientForm(true);
                        setPatientForm({ ...patientForm, assignedBed: selectedBed._id, wardType: selectedBed.ward?.name });
                      }}
                      style={{
                        marginTop: '1rem',
                        padding: '0.75rem 1.5rem',
                        background: '#0d6efd',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Assign Patient to This Bed
                    </button>
                  )}

                  <div className="bed-status-actions">
                    <label>Update Bed Status:</label>
                    <select
                      value={selectedBed.status}
                      onChange={(e) => handleBedStatusUpdate(selectedBed._id, e.target.value)}
                      className="status-select"
                    >
                      <option value="available">Available</option>
                      <option value="occupied">Occupied</option>
                      <option value="cleaning">Cleaning</option>
                      <option value="reserved">Reserved</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Patient Form Modal */}
      {showPatientForm && (
        <div className="modal-overlay" onClick={() => setShowPatientForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Add New Patient</h3>
            <form onSubmit={handlePatientSubmit}>
              <input
                type="text"
                placeholder="Patient Name"
                value={patientForm.name}
                onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })}
                required
                style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
              />
              <input
                type="number"
                placeholder="Age"
                value={patientForm.age}
                onChange={(e) => setPatientForm({ ...patientForm, age: e.target.value })}
                required
                style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
              />
              <select
                value={patientForm.gender}
                onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value })}
                style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              <input
                type="text"
                placeholder="Reason for Admission"
                value={patientForm.reasonForAdmission}
                onChange={(e) => setPatientForm({ ...patientForm, reasonForAdmission: e.target.value })}
                required
                style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
              />
              <input
                type="text"
                placeholder="Department"
                value={patientForm.department}
                onChange={(e) => setPatientForm({ ...patientForm, department: e.target.value })}
                style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
              />
              <select
                value={patientForm.priority}
                onChange={(e) => setPatientForm({ ...patientForm, priority: e.target.value })}
                style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>

              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                🏥 Select Ward Type *
              </label>
              <select
                value={patientForm.wardType}
                onChange={(e) => {
                  setPatientForm({ ...patientForm, wardType: e.target.value, assignedBed: '' });
                  getBedRecommendations(e.target.value);
                }}
                required
                style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
              >
                <option value="">-- Select Ward Type --</option>
                <option value="ICU">ICU</option>
                <option value="ER">ER</option>
                <option value="General Ward">General Ward</option>
              </select>

              {recommendedBeds.length > 0 && (
                <div style={{ background: '#eff6ff', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 600, margin: '0 0 0.5rem 0' }}>💡 Recommended Beds:</h4>
                  {recommendedBeds.map(bed => (
                    <div key={bed._id} style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                      {bed.bedNumber} - {bed.ward?.name} ({bed.equipmentType?.join(', ') || 'Standard'})
                    </div>
                  ))}
                </div>
              )}

              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                🛏️ Assign Bed Number *
              </label>
              <select
                value={patientForm.assignedBed}
                onChange={(e) => setPatientForm({ ...patientForm, assignedBed: e.target.value })}
                disabled={!patientForm.wardType}
                required
                style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
              >
                <option value="">-- {patientForm.wardType ? 'Select Bed Number' : 'Select Ward Type First'} --</option>
                {getAvailableBedsByWard(patientForm.wardType).map(bed => (
                  <option key={bed._id} value={bed._id}>
                    Bed {bed.bedNumber} - {bed.equipmentType?.join(', ') || 'Standard'}
                  </option>
                ))}
              </select>

              {patientForm.wardType && getAvailableBedsByWard(patientForm.wardType).length === 0 && (
                <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  ⚠️ No available beds in {patientForm.wardType} ward
                </p>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: '#0d6efd',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {loading ? 'Adding...' : 'Add Patient'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPatientForm(false)}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Beds;
