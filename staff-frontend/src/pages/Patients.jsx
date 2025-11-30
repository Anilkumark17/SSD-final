import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import './Patients.css';

const Patients = () => {
  const [patients, setPatients] = useState([]);
  const [beds, setBeds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const { socket } = useSocket();
  const { user } = useAuth();

  const [patientForm, setPatientForm] = useState({
    name: '',
    age: '',
    gender: 'Male',
    reasonForAdmission: '',
    department: '',
    priority: 'medium',
    expectedDischargeDate: '',
    wardType: '',
    assignedBed: ''
  });

  const [transferForm, setTransferForm] = useState({
    newBedId: ''
  });

  useEffect(() => {
    fetchPatients();
    fetchBeds();

    if (socket) {
      socket.on('patient:admitted', fetchPatients);
      socket.on('patient:discharged', fetchPatients);
      socket.on('patient:transferred', fetchPatients);
      socket.on('bed:updated', fetchBeds);

      return () => {
        socket.off('patient:admitted');
        socket.off('patient:discharged');
        socket.off('patient:transferred');
        socket.off('bed:updated');
      };
    }
  }, [socket]);

  const fetchPatients = async () => {
    try {
      const { data } = await api.get('/patients');
      setPatients(data);
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast.error('Failed to fetch patients');
    }
  };

  const fetchBeds = async () => {
    try {
      const { data } = await api.get('/beds');
      setBeds(data);
    } catch (error) {
      console.error('Error fetching beds:', error);
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
      // Validate required fields
      if (!patientForm.assignedBed) {
        toast.error('Please select a bed');
        setLoading(false);
        return;
      }

      // Prepare patient data with correct field mapping
      const patientData = {
        name: patientForm.name,
        age: parseInt(patientForm.age),
        gender: patientForm.gender,
        reasonForAdmission: patientForm.reasonForAdmission,
        department: patientForm.department || 'General',
        priority: patientForm.priority,
        bedId: patientForm.assignedBed
      };

      // Add expected discharge date if provided
      if (patientForm.expectedDischargeDate) {
        patientData.expectedDischargeDate = new Date(patientForm.expectedDischargeDate).toISOString();
      }

      console.log('Submitting patient:', patientData);

      const response = await api.post('/patients', patientData);
      
      if (response.data.success) {
        toast.success(`Patient ${response.data.patient.patientId} admitted successfully!`);
        setShowPatientForm(false);
        setPatientForm({
          name: '',
          age: '',
          gender: 'Male',
          reasonForAdmission: '',
          department: '',
          priority: 'medium',
          expectedDischargeDate: '',
          wardType: '',
          assignedBed: ''
        });
      }
    } catch (error) {
      console.error('Patient admission error:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to admit patient');
    }
    
    setLoading(false);
  };

  const handleDischarge = async (patientId) => {
    if (!window.confirm('Are you sure you want to discharge this patient?')) return;

    try {
      const response = await api.post(`/patients/${patientId}/discharge`);
      if (response.data.success) {
        toast.success('Patient discharged successfully!');
      }
    } catch (error) {
      console.error('Discharge error:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to discharge patient');
    }
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!transferForm.newBedId) {
        toast.error('Please select a bed');
        setLoading(false);
        return;
      }

      const response = await api.post(`/patients/${selectedPatient._id}/transfer`, {
        newBedId: transferForm.newBedId
      });

      if (response.data.success) {
        toast.success('Patient transferred successfully!');
        setShowTransferModal(false);
        setSelectedPatient(null);
        setTransferForm({ newBedId: '' });
      }
    } catch (error) {
      console.error('Transfer error:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to transfer patient');
    }

    setLoading(false);
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: '#3b82f6',
      medium: '#f59e0b',
      high: '#ef4444',
      critical: '#991b1b'
    };
    return colors[priority] || '#6b7280';
  };

  const getStatusColor = (status) => {
    const colors = {
      admitted: '#10b981',
      discharged: '#6b7280',
      transferred: '#3b82f6'
    };
    return colors[status] || '#6b7280';
  };

  return (
    <div className="patients-page">
      <div className="page-header">
        <h1>Patient Management</h1>
        <button className="primary-btn" onClick={() => setShowPatientForm(true)}>
          + Add New Patient
        </button>
      </div>

      {/* Patient List */}
      <div className="patients-grid">
        {patients.map((patient) => (
          <div key={patient._id} className="patient-card">
            <div className="patient-card-header">
              <div>
                <h3>{patient.name}</h3>
                <p className="patient-id">ID: {patient.patientId}</p>
              </div>
              <div className="patient-badges">
                <span 
                  className="priority-badge" 
                  style={{ backgroundColor: getPriorityColor(patient.priority) }}
                >
                  {patient.priority}
                </span>
                <span 
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(patient.status) }}
                >
                  {patient.status}
                </span>
              </div>
            </div>

            <div className="patient-card-body">
              <div className="patient-info-row">
                <span className="label">Age:</span>
                <span>{patient.age}</span>
              </div>
              <div className="patient-info-row">
                <span className="label">Gender:</span>
                <span>{patient.gender}</span>
              </div>
              <div className="patient-info-row">
                <span className="label">Department:</span>
                <span>{patient.department}</span>
              </div>
              <div className="patient-info-row">
                <span className="label">Reason:</span>
                <span>{patient.reasonForAdmission}</span>
              </div>
              {patient.assignedBed && (
                <div className="patient-info-row">
                  <span className="label">Bed:</span>
                  <span>
                    {patient.assignedBed.bedNumber} - {patient.assignedBed.ward?.name}
                  </span>
                </div>
              )}
              <div className="patient-info-row">
                <span className="label">Admitted:</span>
                <span>{new Date(patient.admittedAt).toLocaleDateString()}</span>
              </div>
              {patient.expectedDischargeDate && (
                <div className="patient-info-row">
                  <span className="label">Expected Discharge:</span>
                  <span>
                    {new Date(patient.expectedDischargeDate).toLocaleString('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                  </span>
                </div>
              )}
            </div>

            {patient.status === 'admitted' && (
              <div className="patient-card-actions">
                <button 
                  className="transfer-btn"
                  onClick={() => {
                    setSelectedPatient(patient);
                    setShowTransferModal(true);
                  }}
                >
                  Transfer
                </button>
                <button 
                  className="discharge-btn"
                  onClick={() => handleDischarge(patient._id)}
                >
                  Discharge
                </button>
              </div>
            )}
          </div>
        ))}

        {patients.length === 0 && (
          <div className="no-data">
            <p>No patients found</p>
          </div>
        )}
      </div>

      {/* Add Patient Modal */}
      {showPatientForm && (
        <div className="modal-overlay" onClick={() => setShowPatientForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Admit New Patient</h3>
            <form onSubmit={handlePatientSubmit}>
              <label>Patient Name *</label>
              <input
                type="text"
                placeholder="Full Name"
                value={patientForm.name}
                onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })}
                required
              />

              <label>Age *</label>
              <input
                type="number"
                placeholder="Age"
                value={patientForm.age}
                onChange={(e) => setPatientForm({ ...patientForm, age: e.target.value })}
                required
                min="0"
                max="150"
              />

              <label>Gender *</label>
              <select
                value={patientForm.gender}
                onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value })}
                required
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>

              <label>Reason for Admission *</label>
              <textarea
                placeholder="Reason for admission"
                value={patientForm.reasonForAdmission}
                onChange={(e) => setPatientForm({ ...patientForm, reasonForAdmission: e.target.value })}
                required
                rows="3"
              />

              <label>Department</label>
              <input
                type="text"
                placeholder="Department (optional)"
                value={patientForm.department}
                onChange={(e) => setPatientForm({ ...patientForm, department: e.target.value })}
              />

              <label>Priority *</label>
              <select
                value={patientForm.priority}
                onChange={(e) => setPatientForm({ ...patientForm, priority: e.target.value })}
                required
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>

              <label>Expected Discharge Date & Time</label>
              <input
                type="datetime-local"
                value={patientForm.expectedDischargeDate}
                onChange={(e) => setPatientForm({ ...patientForm, expectedDischargeDate: e.target.value })}
              />

              <label>Ward Type *</label>
              <select
                value={patientForm.wardType}
                onChange={(e) => {
                  setPatientForm({ ...patientForm, wardType: e.target.value, assignedBed: '' });
                }}
                required
              >
                <option value="">-- Select Ward --</option>
                <option value="ICU">ICU</option>
                <option value="ER">Emergency Room</option>
                <option value="General Ward">General Ward</option>
              </select>

              <label>Assign Bed *</label>
              <select
                value={patientForm.assignedBed}
                onChange={(e) => setPatientForm({ ...patientForm, assignedBed: e.target.value })}
                disabled={!patientForm.wardType}
                required
              >
                <option value="">
                  {patientForm.wardType ? '-- Select Bed --' : '-- Select Ward First --'}
                </option>
                {getAvailableBedsByWard(patientForm.wardType).map(bed => (
                  <option key={bed._id} value={bed._id}>
                    {bed.bedNumber} - {bed.equipmentType?.join(', ') || 'Standard'}
                  </option>
                ))}
              </select>

              {patientForm.wardType && getAvailableBedsByWard(patientForm.wardType).length === 0 && (
                <p style={{ color: '#ef4444', fontSize: '0.875rem' }}>
                  ⚠️ No available beds in {patientForm.wardType}
                </p>
              )}

              <div className="modal-actions">
                <button type="submit" disabled={loading}>
                  {loading ? 'Admitting...' : 'Admit Patient'}
                </button>
                <button type="button" onClick={() => setShowPatientForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Patient Modal */}
      {showTransferModal && selectedPatient && (
        <div className="modal-overlay" onClick={() => setShowTransferModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Transfer Patient: {selectedPatient.name}</h3>
            <p>Current Bed: {selectedPatient.assignedBed?.bedNumber}</p>
            
            <form onSubmit={handleTransferSubmit}>
              <label>New Bed *</label>
              <select
                value={transferForm.newBedId}
                onChange={(e) => setTransferForm({ newBedId: e.target.value })}
                required
              >
                <option value="">-- Select New Bed --</option>
                {beds.filter(bed => bed.status === 'available').map(bed => (
                  <option key={bed._id} value={bed._id}>
                    {bed.bedNumber} - {bed.ward?.name} ({bed.equipmentType?.join(', ') || 'Standard'})
                  </option>
                ))}
              </select>

              <div className="modal-actions">
                <button type="submit" disabled={loading}>
                  {loading ? 'Transferring...' : 'Transfer Patient'}
                </button>
                <button type="button" onClick={() => setShowTransferModal(false)}>
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

export default Patients;
