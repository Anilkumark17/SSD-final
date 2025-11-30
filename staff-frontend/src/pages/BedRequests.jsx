import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import api from '../api/axios';
import { FileText, Plus, User, Bed, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import './BedRequests.css';

const BedRequests = () => {
  const { socket } = useSocket();
  const [requests, setRequests] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    patientId: '',
    wardType: 'ICU',
    equipmentRequired: 'standard',
    priority: 'routine',
    notes: ''
  });

  useEffect(() => {
    fetchRequests();
    fetchPatients();

    if (socket) {
      socket.on('bed-request-created', handleNewRequest);
      return () => socket.off('bed-request-created');
    }
  }, [socket]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await api.get('/bed-requests');
      setRequests(response.data);
    } catch (error) {
      console.error('Error fetching bed requests:', error);
      toast.error('Failed to fetch bed requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await api.get('/patients');
      setPatients(response.data);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const handleNewRequest = (request) => {
    setRequests(prev => [request, ...prev]);
    toast.info('New bed request created');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/bed-requests', formData);
      toast.success('Bed request created successfully');
      setShowForm(false);
      setFormData({
        patientId: '',
        wardType: 'ICU',
        equipmentRequired: 'standard',
        priority: 'routine',
        notes: ''
      });
      fetchRequests();
    } catch (error) {
      console.error('Error creating bed request:', error);
      toast.error(error.response?.data?.message || 'Failed to create bed request');
    }
  };

  const getPriorityClass = (priority) => {
    const classes = {
      routine: 'priority-routine',
      urgent: 'priority-urgent',
      critical: 'priority-critical'
    };
    return classes[priority] || 'priority-routine';
  };

  const getStatusClass = (status) => {
    const classes = {
      pending: 'status-pending',
      assigned: 'status-assigned',
      fulfilled: 'status-fulfilled',
      cancelled: 'status-cancelled'
    };
    return classes[status] || 'status-pending';
  };

  if (loading) {
    return (
      <div className="bed-requests-container">
        <div className="loading">Loading bed requests...</div>
      </div>
    );
  }

  return (
    <div className="bed-requests-container">
      <div className="requests-header">
        <div>
          <h1>📋 Bed Requests</h1>
          <p className="subtitle">Manage bed allocation requests</p>
        </div>
        <button className="primary-btn" onClick={() => setShowForm(true)}>
          <Plus size={20} />
          New Request
        </button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Create Bed Request</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>
                  <User size={16} />
                  Patient
                </label>
                <select
                  value={formData.patientId}
                  onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                  required
                >
                  <option value="">Select Patient</option>
                  {patients.map(patient => (
                    <option key={patient._id} value={patient._id}>
                      {patient.name} ({patient.patientId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Ward Type</label>
                <select
                  value={formData.wardType}
                  onChange={(e) => setFormData({ ...formData, wardType: e.target.value })}
                >
                  <option value="ICU">ICU</option>
                  <option value="General Ward A">General Ward A</option>
                  <option value="General Ward B">General Ward B</option>
                  <option value="ER">ER</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Surgery">Surgery</option>
                </select>
              </div>

              <div className="form-group">
                <label>Equipment Required</label>
                <select
                  value={formData.equipmentRequired}
                  onChange={(e) => setFormData({ ...formData, equipmentRequired: e.target.value })}
                >
                  <option value="standard">Standard</option>
                  <option value="ventilator">Ventilator</option>
                  <option value="cardiac_monitor">Cardiac Monitor</option>
                  <option value="dialysis">Dialysis</option>
                </select>
              </div>

              <div className="form-group">
                <label>Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows="3"
                  placeholder="Additional notes or requirements..."
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="submit-btn">Create Request</button>
                <button type="button" className="cancel-btn" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="requests-list">
        {requests.length === 0 ? (
          <div className="no-requests">
            <FileText size={48} />
            <p>No bed requests found</p>
          </div>
        ) : (
          requests.map((request) => (
            <div key={request._id} className="request-card">
              <div className="request-header">
                <div className="request-patient">
                  <User size={20} />
                  <div>
                    <h3>{request.patientId?.name || 'Unknown Patient'}</h3>
                    <p>Requested by: {request.requestedBy?.name}</p>
                  </div>
                </div>
                <div className="request-badges">
                  <span className={`priority-badge ${getPriorityClass(request.priority)}`}>
                    {request.priority}
                  </span>
                  <span className={`status-badge ${getStatusClass(request.status)}`}>
                    {request.status}
                  </span>
                </div>
              </div>

              <div className="request-details">
                <div className="detail-item">
                  <Bed size={16} />
                  <span><strong>Ward:</strong> {request.wardType}</span>
                </div>
                <div className="detail-item">
                  <AlertCircle size={16} />
                  <span><strong>Equipment:</strong> {request.equipmentRequired}</span>
                </div>
                <div className="detail-item">
                  <span><strong>Requested:</strong> {new Date(request.requestDate).toLocaleString()}</span>
                </div>
              </div>

              {request.notes && (
                <div className="request-notes">
                  <strong>Notes:</strong> {request.notes}
                </div>
              )}

              {request.recommendedBeds && request.recommendedBeds.length > 0 && (
                <div className="recommended-beds">
                  <strong>💡 Recommended Beds:</strong>
                  <div className="bed-tags">
                    {request.recommendedBeds.map(bed => (
                      <span key={bed._id} className="bed-tag">
                        {bed.bedNumber}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {request.assignedBedId && (
                <div className="assigned-bed">
                  <Bed size={16} />
                  <span><strong>Assigned Bed:</strong> {request.assignedBedId.bedNumber}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BedRequests;
