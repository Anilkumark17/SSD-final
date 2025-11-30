import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { Siren, CheckCircle, XCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { toast } from 'react-toastify';

const Emergency = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const { socket } = useSocket();
  const { user } = useAuth();

  // Form State
  const [formData, setFormData] = useState({
    patientName: '',
    urgency: 'critical',
    preferredWard: 'ICU',
    requiredEquipment: [],
    notes: ''
  });

  useEffect(() => {
    fetchRequests();

    if (socket) {
      socket.on('emergency:new', handleNewRequest);
      socket.on('emergency:assigned', handleRequestUpdate);
      return () => {
        socket.off('emergency:new');
        socket.off('emergency:assigned');
      };
    }
  }, [socket]);

  const fetchRequests = async () => {
    try {
      const { data } = await api.get('/emergency-requests');
      setRequests(data);
    } catch (error) {
      toast.error('Failed to fetch emergency requests');
    } finally {
      setLoading(false);
    }
  };

  const handleNewRequest = () => fetchRequests();
  const handleRequestUpdate = () => fetchRequests();

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
      await api.post('/emergency-requests', formData);
      toast.success('Emergency request created');
      setShowRequestForm(false);
      setFormData({
        patientName: '',
        urgency: 'critical',
        preferredWard: 'ICU',
        requiredEquipment: [],
        notes: ''
      });
    } catch (error) {
      toast.error('Failed to create request');
    }
  };

  const assignBed = async (requestId, bedId) => {
    try {
      await api.patch(`/emergency-requests/${requestId}/assign`, { bedId });
      toast.success('Bed assigned successfully');
    } catch (error) {
      toast.error('Failed to assign bed');
    }
  };

  const cancelRequest = async (requestId) => {
    if (!window.confirm('Cancel this emergency request?')) return;
    try {
      await api.patch(`/emergency-requests/${requestId}/cancel`);
      toast.success('Request cancelled');
    } catch (error) {
      toast.error('Failed to cancel request');
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'critical': return '#dc2626';
      case 'urgent': return '#ea580c';
      default: return '#ca8a04';
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', color: '#0f172a', marginBottom: '0.5rem' }}>Emergency Requests</h1>
          <p style={{ color: '#64748b' }}>Manage incoming emergency bed requests</p>
        </div>
        {(user?.role === 'ER_STAFF' || user?.role === 'ICU_MANAGER' || user?.role === 'Medical Staff') && (
          <button 
            onClick={() => setShowRequestForm(!showRequestForm)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              padding: '0.75rem 1.25rem', 
              background: '#dc2626', 
              color: 'white', 
              border: 'none', 
              borderRadius: '0.5rem', 
              fontWeight: 600, 
              cursor: 'pointer',
              boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.2)'
            }}
          >
            <Siren size={20} />
            New Emergency Request
          </button>
        )}
      </header>

      {/* Request Form */}
      {showRequestForm && (
        <div style={{ background: 'white', padding: '2rem', borderRadius: '1rem', border: '1px solid #e2e8f0', marginBottom: '2rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a', marginBottom: '1.5rem' }}>Create New Request</h2>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.5rem' }}>Patient Name</label>
                <input required type="text" value={formData.patientName} onChange={e => setFormData({...formData, patientName: e.target.value})} style={{ width: '100%', padding: '0.625rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.5rem' }}>Urgency Level</label>
                <select value={formData.urgency} onChange={e => setFormData({...formData, urgency: e.target.value})} style={{ width: '100%', padding: '0.625rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                  <option value="critical">Critical</option>
                  <option value="urgent">Urgent</option>
                  <option value="moderate">Moderate</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.5rem' }}>Preferred Ward</label>
                <select value={formData.preferredWard} onChange={e => setFormData({...formData, preferredWard: e.target.value})} style={{ width: '100%', padding: '0.625rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                  <option value="ICU">ICU</option>
                  <option value="ER">ER</option>
                  <option value="General Ward A">General Ward A</option>
                  <option value="Cardiology">Cardiology</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.5rem' }}>Required Equipment</label>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  {['Ventilator', 'Monitor', 'Oxygen', 'Defibrillator'].map(eq => (
                    <label key={eq} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                      <input type="checkbox" value={eq} checked={formData.requiredEquipment.includes(eq)} onChange={handleEquipmentChange} />
                      {eq}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button type="button" onClick={() => setShowRequestForm(false)} style={{ padding: '0.75rem 1.5rem', background: 'transparent', border: '1px solid #e2e8f0', borderRadius: '0.5rem', color: '#64748b', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" style={{ padding: '0.75rem 1.5rem', background: '#dc2626', border: 'none', borderRadius: '0.5rem', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Submit Request</button>
            </div>
          </form>
        </div>
      )}

      {/* Requests List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {requests.map((request) => (
          <div key={request._id} style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0', borderLeft: `4px solid ${getUrgencyColor(request.urgency)}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a' }}>{request.patientName}</h3>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.125rem 0.5rem', borderRadius: '9999px', background: `${getUrgencyColor(request.urgency)}15`, color: getUrgencyColor(request.urgency), textTransform: 'uppercase' }}>
                  {request.urgency}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {new Date(request.requestedAt).toLocaleString()}
                </span>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                Requested by: {request.requestedBy?.name} • Ward: {request.preferredWard}
              </p>
              {request.requiredEquipment.length > 0 && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {request.requiredEquipment.map(eq => (
                    <span key={eq} style={{ fontSize: '0.75rem', padding: '0.125rem 0.5rem', background: '#f1f5f9', borderRadius: '0.25rem', color: '#475569' }}>{eq}</span>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              {request.status === 'pending' ? (
                <>
                  {request.recommendedBed ? (
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600, marginBottom: '0.25rem' }}>Recommended Bed</p>
                      <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>{request.recommendedBed.bedNumber}</div>
                      <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{request.recommendedBed.ward}</p>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'right', color: '#ea580c', fontSize: '0.875rem', fontWeight: 500 }}>
                      No auto-match
                    </div>
                  )}
                  
                  {(user?.role === 'ICU_MANAGER' || user?.role === 'Medical Staff') && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {request.recommendedBed && (
                        <button 
                          onClick={() => assignBed(request._id, request.recommendedBed._id)}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#16a34a', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 500 }}
                        >
                          <CheckCircle size={16} /> Assign
                        </button>
                      )}
                      <button 
                        onClick={() => cancelRequest(request._id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'white', border: '1px solid #e2e8f0', color: '#64748b', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 500 }}
                      >
                        <XCircle size={16} /> Cancel
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: request.status === 'assigned' ? '#dcfce7' : '#f1f5f9', borderRadius: '0.5rem', color: request.status === 'assigned' ? '#16a34a' : '#64748b', fontWeight: 600 }}>
                  {request.status === 'assigned' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                  {request.status === 'assigned' ? `Assigned to ${request.assignedBed?.bedNumber}` : 'Cancelled'}
                </div>
              )}
            </div>
          </div>
        ))}
        {requests.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            No emergency requests found
          </div>
        )}
      </div>
    </div>
  );
};

export default Emergency;
