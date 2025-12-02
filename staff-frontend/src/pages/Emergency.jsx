import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { Siren, CheckCircle, XCircle, AlertTriangle, Search, Plus, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'react-toastify';

const Emergency = () => {
  const { user } = useAuth();
  const { socket } = useSocket();

  // State
  const [activeTab, setActiveTab] = useState('patients'); // 'patients' or 'requests'
  const [patients, setPatients] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Form State
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [formData, setFormData] = useState({
    patientName: '',
    age: '',
    gender: 'Male',
    condition: '',
    priority: 'critical',
    reasonForAdmission: '',
    preferredWard: 'ICU',
    requiredEquipment: [],
    notes: ''
  });
  const [availabilityCheck, setAvailabilityCheck] = useState(null);
  const [checking, setChecking] = useState(false);
  const [availableBeds, setAvailableBeds] = useState([]);
  const [selectedBedId, setSelectedBedId] = useState('');

  useEffect(() => {
    fetchData();
    if (socket) {
      socket.on('emergency:new', fetchData);
      socket.on('emergency:assigned', fetchData);
      socket.on('patient:admitted', fetchData);
      return () => {
        socket.off('emergency:new');
        socket.off('emergency:assigned');
        socket.off('patient:admitted');
      };
    }
  }, [socket, activeTab]);

  // Auto-check availability when Emergency Mode is toggled ON
  useEffect(() => {
    if (isEmergencyMode && showRequestForm) {
      checkAvailability();
    } else {
      setAvailabilityCheck(null);
    }
  }, [isEmergencyMode, showRequestForm, formData.preferredWard, formData.requiredEquipment]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'patients') {
        const { data } = await api.get('/patients');
        setPatients(data);
      } else {
        const { data } = await api.get('/emergency-requests');
        setRequests(data);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const checkAvailability = async () => {
    try {
      setChecking(true);
      const { data } = await api.post('/emergency-requests/check-availability', {
        preferredWard: formData.preferredWard,
        requiredEquipment: formData.requiredEquipment,
        isEmergencyMode
      });
      setAvailabilityCheck(data);
      if (data.availableBeds) {
        setAvailableBeds(data.availableBeds);
        // Auto-select recommended bed
        if (data.recommendedBed) {
          setSelectedBedId(data.recommendedBed.id);
        }
      }
    } catch (error) {
      // toast.error('Failed to check availability'); // Suppress toast for auto-check
    } finally {
      setChecking(false);
    }
  };

  const handleCreateRequest = (patient = null) => {
    if (patient) {
      setSelectedPatient(patient);
      setFormData(prev => ({
        ...prev,
        patientName: patient.name,
        age: patient.age,
        gender: patient.gender,
        condition: patient.condition || '',
        priority: patient.priority || 'critical'
      }));
    } else {
      setSelectedPatient(null);
      setFormData({
        patientName: '',
        age: '',
        gender: 'Male',
        condition: '',
        priority: 'critical',
        reasonForAdmission: '',
        preferredWard: 'ICU',
        requiredEquipment: [],
        notes: ''
      });
    }
    setShowRequestForm(true);
    setIsEmergencyMode(false);
  };



  const handleEquipmentChange = (e) => {
    const { value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      requiredEquipment: checked
        ? [...prev.requiredEquipment, value]
        : prev.requiredEquipment.filter(eq => eq !== value)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        isEmergencyMode,
        selectedBedId
      };

      if (isEmergencyMode) {
        // Fast Path
        await api.post('/emergency-requests', payload);
        toast.success('Emergency admission processed! Patient admitted.');
      } else {
        // Normal Path
        await api.post('/emergency-requests', payload);
        toast.success('Request submitted for Admin approval');
      }

      setShowRequestForm(false);
      fetchData();
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Failed to submit request');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#ca8a04';
      default: return '#3b82f6';
    }
  };

  // Pagination Logic
  const filteredPatients = patients.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
  const paginatedPatients = filteredPatients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
            ER Patient Panel
          </h1>
          <p style={{ color: '#64748b' }}>Manage ER patients and bed requests</p>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ display: 'flex', background: 'white', border: '1px solid #e2e8f0', borderRadius: '0.5rem', overflow: 'hidden' }}>
            <button
              onClick={() => setActiveTab('patients')}
              style={{
                padding: '0.75rem 1.5rem',
                background: activeTab === 'patients' ? '#eff6ff' : 'transparent',
                color: activeTab === 'patients' ? '#0d6efd' : '#64748b',
                border: 'none',
                borderRight: '1px solid #e2e8f0',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Patients
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              style={{
                padding: '0.75rem 1.5rem',
                background: activeTab === 'requests' ? '#eff6ff' : 'transparent',
                color: activeTab === 'requests' ? '#0d6efd' : '#64748b',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Requests
            </button>
          </div>

          <button
            onClick={() => handleCreateRequest()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.2)'
            }}
          >
            <Plus size={20} />
            Create Bed Request
          </button>
        </div>
      </header>

      {/* Search Filter */}
      <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
        <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
        <input
          type="text"
          placeholder="Search by Name, ID, or Priority..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          style={{
            width: '100%',
            padding: '1rem 1rem 1rem 3rem',
            borderRadius: '0.75rem',
            border: '1px solid #e2e8f0',
            fontSize: '1rem',
            outline: 'none'
          }}
        />
      </div>

      {/* Main Content */}
      {activeTab === 'patients' ? (
        <div style={{ background: 'white', borderRadius: '1rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', color: '#64748b' }}>Patient ID</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', color: '#64748b' }}>Name</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', color: '#64748b' }}>Age/Gender</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', color: '#64748b' }}>Condition</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', color: '#64748b' }}>Priority</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', color: '#64748b' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.875rem', color: '#64748b' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPatients.map(patient => (
                <tr key={patient._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem', fontWeight: 500 }}>{patient.patientId}</td>
                  <td style={{ padding: '1rem', fontWeight: 600, color: '#0f172a' }}>{patient.name}</td>
                  <td style={{ padding: '1rem' }}>{patient.age} / {patient.gender}</td>
                  <td style={{ padding: '1rem' }}>{patient.reasonForAdmission}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      background: `${getPriorityColor(patient.priority)}15`,
                      color: getPriorityColor(patient.priority),
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      textTransform: 'uppercase'
                    }}>
                      {patient.priority}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      background: patient.status === 'admitted' ? '#dcfce7' : '#f1f5f9',
                      color: patient.status === 'admitted' ? '#16a34a' : '#64748b',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}>
                      {patient.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <button
                      onClick={() => handleCreateRequest(patient)}
                      disabled={patient.status === 'admitted'}
                      style={{
                        padding: '0.5rem 1rem',
                        background: patient.status === 'admitted' ? '#e2e8f0' : '#eff6ff',
                        color: patient.status === 'admitted' ? '#94a3b8' : '#0d6efd',
                        border: 'none',
                        borderRadius: '0.5rem',
                        fontWeight: 600,
                        cursor: patient.status === 'admitted' ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Request Bed
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination Controls */}
          <div style={{ padding: '1rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Rows per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                style={{ padding: '0.25rem', borderRadius: '0.25rem', border: '1px solid #e2e8f0' }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                Page {currentPage} of {totalPages}
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{ padding: '0.25rem', border: '1px solid #e2e8f0', borderRadius: '0.25rem', background: currentPage === 1 ? '#f1f5f9' : 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{ padding: '0.25rem', border: '1px solid #e2e8f0', borderRadius: '0.25rem', background: currentPage === totalPages ? '#f1f5f9' : 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {requests.map(request => (
            <div key={request._id} style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>{request.patientName}</h3>
                <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Status: <strong style={{ textTransform: 'uppercase', color: request.status === 'approved' ? '#16a34a' : '#ea580c' }}>{request.status}</strong></p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bed Request Form Modal */}
      {showRequestForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '800px', borderRadius: '1rem', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>New Bed Request</h2>
              <button onClick={() => setShowRequestForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><XCircle size={24} /></button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem' }}>
              {/* Emergency Mode Toggle */}
              <div style={{ background: isEmergencyMode ? '#fef2f2' : '#f8fafc', padding: '1.5rem', borderRadius: '0.75rem', border: `1px solid ${isEmergencyMode ? '#fecaca' : '#e2e8f0'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: isEmergencyMode ? '#dc2626' : '#0f172a' }}>
                    {isEmergencyMode ? '🔥 Emergency Mode ACTIVE' : 'Standard Request Mode'}
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
                    {isEmergencyMode ? 'Fast Path: Auto-assigns next available bed immediately.' : 'Normal Path: Requires Admin approval before assignment.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEmergencyMode(!isEmergencyMode)}
                  style={{
                    width: '3.5rem',
                    height: '2rem',
                    background: isEmergencyMode ? '#dc2626' : '#cbd5e1',
                    borderRadius: '9999px',
                    position: 'relative',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.3s'
                  }}
                >
                  <div style={{
                    width: '1.75rem',
                    height: '1.75rem',
                    background: 'white',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: '0.125rem',
                    left: isEmergencyMode ? '1.625rem' : '0.125rem',
                    transition: 'left 0.3s'
                  }} />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Patient Name</label>
                  <input required type="text" value={formData.patientName} onChange={e => setFormData({ ...formData, patientName: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Priority</label>
                  <select value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Reason for ICU Admission</label>
                <textarea required rows="3" value={formData.reasonForAdmission} onChange={e => setFormData({ ...formData, reasonForAdmission: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }} placeholder="Clinical reason..." />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {!isEmergencyMode && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Preferred Ward</label>
                    <select value={formData.preferredWard} onChange={e => setFormData({ ...formData, preferredWard: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                      <option value="ICU">ICU</option>
                      <option value="Cardiology">Cardiology</option>
                      <option value="Emergency">Emergency</option>
                    </select>
                  </div>
                )}
                <div style={{ gridColumn: isEmergencyMode ? '1 / -1' : 'auto' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Equipment</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                    {['Ventilator', 'Monitor', 'Oxygen'].map(eq => (
                      <label key={eq} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                        <input type="checkbox" value={eq} checked={formData.requiredEquipment.includes(eq)} onChange={handleEquipmentChange} />
                        {eq}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Auto-Assignment / Selection for Emergency Mode */}
              {isEmergencyMode && (
                <div style={{ background: '#f0f9ff', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #bae6fd' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 600, color: '#0369a1' }}>Select Available Bed (ER/ICU)</span>
                    {checking && <span style={{ fontSize: '0.875rem', color: '#0284c7' }}>Checking availability...</span>}
                  </div>

                  {availabilityCheck ? (
                    availabilityCheck.available ? (
                      <div>
                        <select
                          value={selectedBedId}
                          onChange={(e) => setSelectedBedId(e.target.value)}
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #bbf7d0', fontWeight: 600, color: '#166534' }}
                        >
                          {availableBeds.map(bed => (
                            <option key={bed.id || bed._id} value={bed.id || bed._id}>
                              {bed.bedNumber} ({bed.ward?.name || 'Unknown'}) - {bed.ward?.type || 'Unknown'}
                            </option>
                          ))}
                        </select>
                        <p style={{ fontSize: '0.75rem', color: '#15803d', marginTop: '0.5rem' }}>
                          System recommended: {availabilityCheck.recommendedBed?.bedNumber}
                        </p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'white', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #fed7aa' }}>
                        <AlertTriangle size={24} color="#ea580c" />
                        <div>
                          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Status:</p>
                          <p style={{ fontSize: '1rem', fontWeight: 600, color: '#ea580c' }}>
                            No beds available in ER or ICU!
                          </p>
                        </div>
                      </div>
                    )
                  ) : (
                    !checking && <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Waiting for check...</p>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowRequestForm(false)} style={{ flex: 1, padding: '1rem', background: 'transparent', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '1rem', background: isEmergencyMode ? '#dc2626' : '#0d6efd', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer' }}>
                  {isEmergencyMode ? 'ADMIT PATIENT NOW' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Emergency;
