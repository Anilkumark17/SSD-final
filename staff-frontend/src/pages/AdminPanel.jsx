import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { 
  Users, 
  Search, 
  Edit, 
  Trash2, 
  Calendar, 
  Activity, 
  LogOut,
  X,
  Save
} from 'lucide-react';

const AdminPanel = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal States
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSurgeryModal, setShowSurgeryModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Form States
  const [editForm, setEditForm] = useState({
    name: '',
    age: '',
    priority: '',
    department: '',
    expectedDischargeDate: ''
  });

  const [surgeryForm, setSurgeryForm] = useState({
    procedureName: '',
    date: '',
    time: '',
    surgeon: '',
    notes: ''
  });

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const { data } = await api.get('/patients');
      setPatients(data);
    } catch (error) {
      toast.error('Failed to fetch patients');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (patient) => {
    setSelectedPatient(patient);
    setEditForm({
      name: patient.name,
      age: patient.age,
      priority: patient.priority,
      department: patient.department,
      expectedDischargeDate: patient.expectedDischargeDate ? new Date(patient.expectedDischargeDate).toISOString().split('T')[0] : ''
    });
    setShowEditModal(true);
  };

  const handleSurgeryClick = (patient) => {
    setSelectedPatient(patient);
    setSurgeryForm({
      procedureName: '',
      date: '',
      time: '',
      surgeon: '',
      notes: ''
    });
    setShowSurgeryModal(true);
  };

  const handleUpdatePatient = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/patients/${selectedPatient._id}`, editForm);
      toast.success('Patient updated successfully');
      setShowEditModal(false);
      fetchPatients();
    } catch (error) {
      toast.error('Failed to update patient');
    }
  };

  const handleScheduleSurgery = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/patients/${selectedPatient._id}/surgeries`, surgeryForm);
      toast.success('Surgery scheduled successfully');
      setShowSurgeryModal(false);
      fetchPatients();
    } catch (error) {
      toast.error('Failed to schedule surgery');
    }
  };

  const handleDeletePatient = async (patientId) => {
    if (!window.confirm('Are you sure you want to delete this patient record? This action cannot be undone.')) return;
    
    try {
      await api.delete(`/patients/${patientId}`);
      toast.success('Patient record deleted');
      fetchPatients();
    } catch (error) {
      toast.error('Failed to delete patient');
    }
  };

  const handleDischargePatient = async (patientId) => {
    if (!window.confirm('Are you sure you want to discharge this patient?')) return;

    try {
      await api.post(`/patients/${patientId}/discharge`);
      toast.success('Patient discharged successfully');
      fetchPatients();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to discharge patient');
    }
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.patientId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center">Loading admin panel...</div>;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
            Administration Panel
          </h1>
          <p style={{ color: '#64748b' }}>Manage patient records and schedules</p>
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input 
            type="text" 
            placeholder="Search patients..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              padding: '0.75rem 1rem 0.75rem 2.75rem', 
              borderRadius: '0.5rem', 
              border: '1px solid #e2e8f0',
              width: '300px'
            }}
          />
        </div>
      </header>

      <div style={{ background: 'white', borderRadius: '1rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <tr>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>Patient</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>Details</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>Status</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>Surgeries</th>
              <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPatients.map(patient => (
              <tr key={patient._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>{patient.name}</div>
                  <div style={{ fontSize: '0.875rem', color: '#64748b' }}>ID: {patient.patientId}</div>
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontSize: '0.875rem' }}>Age: {patient.age}</div>
                  <div style={{ fontSize: '0.875rem' }}>Dept: {patient.department}</div>
                </td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ 
                    padding: '0.25rem 0.75rem', 
                    borderRadius: '9999px', 
                    fontSize: '0.75rem', 
                    fontWeight: 600,
                    background: patient.status === 'admitted' ? '#dcfce7' : '#f1f5f9',
                    color: patient.status === 'admitted' ? '#16a34a' : '#64748b'
                  }}>
                    {patient.status}
                  </span>
                  {patient.expectedDischargeDate && (
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                      Exp. Discharge: {new Date(patient.expectedDischargeDate).toLocaleDateString()}
                    </div>
                  )}
                </td>
                <td style={{ padding: '1rem' }}>
                  {patient.surgeries?.length > 0 ? (
                    <div style={{ fontSize: '0.875rem' }}>
                      {patient.surgeries.length} scheduled
                    </div>
                  ) : (
                    <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>None</span>
                  )}
                </td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button 
                      onClick={() => handleSurgeryClick(patient)}
                      title="Schedule Surgery"
                      style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', color: '#0d6efd' }}
                    >
                      <Activity size={18} />
                    </button>
                    <button 
                      onClick={() => handleEditClick(patient)}
                      title="Edit Details"
                      style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', color: '#f59e0b' }}
                    >
                      <Edit size={18} />
                    </button>
                    {patient.status === 'admitted' && (
                      <button 
                        onClick={() => handleDischargePatient(patient._id)}
                        title="Discharge Patient"
                        style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', color: '#16a34a' }}
                      >
                        <LogOut size={18} />
                      </button>
                    )}
                    <button 
                      onClick={() => handleDeletePatient(patient._id)}
                      title="Delete Record"
                      style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', color: '#ef4444' }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3>Edit Patient Details</h3>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <form onSubmit={handleUpdatePatient}>
              <input type="text" placeholder="Name" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} required />
              <input type="number" placeholder="Age" value={editForm.age} onChange={e => setEditForm({...editForm, age: e.target.value})} required />
              <select value={editForm.priority} onChange={e => setEditForm({...editForm, priority: e.target.value})}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              <input type="text" placeholder="Department" value={editForm.department} onChange={e => setEditForm({...editForm, department: e.target.value})} required />
              <label className="form-label">Expected Discharge Date</label>
              <input type="date" value={editForm.expectedDischargeDate} onChange={e => setEditForm({...editForm, expectedDischargeDate: e.target.value})} />
              
              <div className="modal-actions">
                <button type="submit" className="primary-btn">Update Patient</button>
                <button type="button" onClick={() => setShowEditModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Surgery Modal */}
      {showSurgeryModal && (
        <div className="modal-overlay" onClick={() => setShowSurgeryModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3>Schedule Surgery</h3>
              <button onClick={() => setShowSurgeryModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <form onSubmit={handleScheduleSurgery}>
              <input type="text" placeholder="Procedure Name" value={surgeryForm.procedureName} onChange={e => setSurgeryForm({...surgeryForm, procedureName: e.target.value})} required />
              <input type="date" value={surgeryForm.date} onChange={e => setSurgeryForm({...surgeryForm, date: e.target.value})} required />
              <input type="time" value={surgeryForm.time} onChange={e => setSurgeryForm({...surgeryForm, time: e.target.value})} required />
              <input type="text" placeholder="Surgeon Name" value={surgeryForm.surgeon} onChange={e => setSurgeryForm({...surgeryForm, surgeon: e.target.value})} required />
              <textarea placeholder="Notes" value={surgeryForm.notes} onChange={e => setSurgeryForm({...surgeryForm, notes: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', minHeight: '100px' }} />
              
              <div className="modal-actions">
                <button type="submit" className="primary-btn">Schedule Surgery</button>
                <button type="button" onClick={() => setShowSurgeryModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
