import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import AlertNotifications from '../components/AlertNotifications';
import ForecastingPanel from '../components/ForecastingPanel';
import './Beds.css';
import { 
  Users, 
  BedDouble, 
  Activity, 
  Clock, 
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';

// Inline BedDetailsModal Component
const BedDetailsModal = ({ 
  bed, 
  onClose, 
  onUpdateStatus, 
  onDischarge, 
  onAssign, 
  user,
  getStatusColor
}) => {
  if (!bed) return null;

  const hasRole = (role) => {
    if (!user) return false;
    if (user.roles && user.roles.includes(role)) return true;
    return user.role === role;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content bed-details-modal" onClick={(e) => e.stopPropagation()}>
        <div className="bed-modal-header">
          <div>
            <h3>🛏️ Bed {bed.bedNumber}</h3>
            <p className="bed-modal-ward">{bed.ward?.name}</p>
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

            {(hasRole('ICU_MANAGER') || hasRole('Medical Staff')) && (
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

            {bed.status === 'available' && (hasRole('ICU_MANAGER') || hasRole('Medical Staff') || hasRole('WARD_STAFF')) && (
              <button className="primary-btn"
                onClick={() => onAssign(bed)}>
                Assign Patient to This Bed
              </button>
            )}

            {(hasRole('ICU_MANAGER') || hasRole('Medical Staff') || hasRole('WARD_STAFF')) && (
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

const Dashboard = () => {
  const { socket } = useSocket();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [beds, setBeds] = useState([]);
  const [selectedBed, setSelectedBed] = useState(null);
  const [showBedModal, setShowBedModal] = useState(false);
  
  // Patient Form State
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [recommendedBeds, setRecommendedBeds] = useState([]);
  const [patientForm, setPatientForm] = useState({
    name: '',
    age: '',
    gender: 'Male',
    reasonForAdmission: '',
    department: '',
    estimatedDischargeDate: '',
    priority: 'routine',
    wardType: '',
    assignedBed: ''
  });

  useEffect(() => {
    fetchDashboardData();

    if (socket) {
      socket.on('bed:updated', handleUpdate);
      socket.on('patient:admitted', handleUpdate);
      socket.on('patient:discharged', handleUpdate);
      socket.on('alert:created', handleAlert);

      return () => {
        socket.off('bed:updated');
        socket.off('patient:admitted');
        socket.off('patient:discharged');
        socket.off('alert:created');
      };
    }
  }, [socket]);

  const fetchDashboardData = async () => {
    try {
      const [overviewRes, alertsRes, bedsRes] = await Promise.all([
        api.get('/dashboard/overview'),
        api.get('/alerts'),
        api.get('/beds')
      ]);
      setStats(overviewRes.data);
      setAlerts(alertsRes.data);
      setBeds(bedsRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = () => fetchDashboardData();
  const handleAlert = (newAlert) => {
    setAlerts(prev => [newAlert, ...prev]);
  };

  const handleBedClick = (bed) => {
    setSelectedBed(bed);
    setShowBedModal(true);
  };

  const handleBedStatusUpdate = async (bedId, status) => {
    try {
      const payload = { status };
      if (status === 'cleaning') {
        const estimatedTime = new Date(Date.now() + 30 * 60 * 1000);
        payload.estimatedAvailableTime = estimatedTime;
      }
      await api.patch(`/beds/${bedId}`, payload);
      toast.success('Bed status updated');
      fetchDashboardData();
      setShowBedModal(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update bed status');
    }
  };

  const handlePatientDischarge = async (patientId) => {
    if (!window.confirm('Are you sure you want to discharge this patient?')) return;

    try {
      await api.post(`/patients/${patientId}/discharge`);
      toast.success('Patient discharged successfully');
      setShowBedModal(false);
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to discharge patient');
    }
  };

  // Patient Form Logic
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

      await api.post('/patients', patientData);
      toast.success('Patient admitted successfully!');
      setShowPatientForm(false);
      setPatientForm({
        name: '',
        age: '',
        gender: 'Male',
        reasonForAdmission: '',
        department: '',
        estimatedDischargeDate: '',
        priority: 'low',
        wardType: '',
        assignedBed: ''
      });
      setRecommendedBeds([]);
      // Socket.IO will trigger update automatically
    } catch (error) {
      console.error('Patient admission error:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to admit patient');
    }
    setLoading(false);
  };

  if (loading) return <div className="p-8 text-center">Loading dashboard...</div>;

  // Prepare Chart Data
  const barChartData = stats?.wardStats?.map(stat => ({
    name: stat.ward.name,
    occupied: stat.occupied,
    available: stat.available
  })) || [];

  const pieChartData = [
    { name: 'Available', value: stats?.wardStats?.reduce((acc, curr) => acc + curr.available, 0) || 0, color: '#22c55e' },
    { name: 'Occupied', value: stats?.wardStats?.reduce((acc, curr) => acc + curr.occupied, 0) || 0, color: '#fca5a5' },
    { name: 'Cleaning', value: stats?.wardStats?.reduce((acc, curr) => acc + curr.cleaning, 0) || 0, color: '#f59e0b' },
    { name: 'Reserved', value: stats?.wardStats?.reduce((acc, curr) => acc + curr.reserved, 0) || 0, color: '#3b82f6' }
  ].filter(item => item.value > 0);

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return '#22c55e'; // Green
      case 'occupied': return '#fca5a5';  // Light Red
      case 'cleaning': return '#f59e0b';
      case 'reserved': return '#3b82f6';
      case 'maintenance': return '#64748b';
      default: return '#94a3b8';
    }
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
    
    return (
      <div className="bed-visual-grid" key={wardName} style={{ marginBottom: '2rem' }}>
        <h4 className="ward-grid-title" style={{ fontSize: '1.1rem', fontWeight: 600, color: '#334155', marginBottom: '1rem' }}>
          🏥 {wardName} ({wardBeds.length} Beds)
        </h4>
        <div className="bed-grid-container">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="bed-grid-row">
              {wardBeds
                .slice(rowIndex * bedsPerRow, (rowIndex + 1) * bedsPerRow)
                .map((bed) => (
                  <div
                    key={bed._id}
                    className="bed-grid-item clickable"
                    style={{ backgroundColor: getStatusColor(bed.status) }}
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

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '2rem' }}>
      {/* Alert Notifications */}
      <AlertNotifications />

      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', color: '#0f172a', marginBottom: '0.5rem' }}>Dashboard Overview</h1>
        <p style={{ color: '#64748b' }}>Real-time hospital occupancy and activity monitoring</p>
      </header>

      {/* Forecasting Panel */}
      <ForecastingPanel />

      {/* Quick Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Total Patients */}
        <div className="stat-card" style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div style={{ padding: '0.75rem', background: '#eff6ff', borderRadius: '0.75rem', color: '#0d6efd' }}>
              <Users size={24} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
            {stats?.totalPatients || 0}
          </div>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Total Admitted Patients</p>
        </div>

        {/* Available Beds */}
        <div className="stat-card" style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div style={{ padding: '0.75rem', background: '#dcfce7', borderRadius: '0.75rem', color: '#16a34a' }}>
              <BedDouble size={24} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
            {beds.filter(b => b.status === 'available').length}
          </div>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Available Beds</p>
        </div>

        {/* Pending Requests */}
        <div className="stat-card" style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div style={{ padding: '0.75rem', background: '#fff7ed', borderRadius: '0.75rem', color: '#ea580c' }}>
              <Clock size={24} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
            {stats?.pendingRequests || 0}
          </div>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Pending Requests</p>
        </div>

        {/* Unread Alerts */}
        <div className="stat-card" style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div style={{ padding: '0.75rem', background: '#fee2e2', borderRadius: '0.75rem', color: '#dc2626' }}>
              <AlertTriangle size={24} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
            {stats?.unreadAlerts || 0}
          </div>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Unread Alerts</p>
        </div>
      </div>

      {/* Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Ward Occupancy Chart */}
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a', marginBottom: '1.5rem' }}>Ward Occupancy Levels</h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '0.5rem', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
                <Bar dataKey="occupied" name="Occupied" stackId="a" fill="#fca5a5" radius={[0, 0, 4, 4]} />
                <Bar dataKey="available" name="Available" stackId="a" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bed Status Distribution Pie Chart */}
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a', marginBottom: '1.5rem' }}>Bed Status Distribution</h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bed Management Section (Grouped by Ward) */}
      <div className="beds-section" style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div className="section-header" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a' }}>Bed Management</h3>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Click on any bed to view details or assign patients</p>
        </div>
        
        {renderBedGrid(beds.filter(b => b.ward?.name === 'ICU'), 'ICU')}
        {renderBedGrid(beds.filter(b => b.ward?.name === 'ER'), 'ER')}
        {renderBedGrid(beds.filter(b => b.ward?.name === 'General Ward'), 'General Ward')}
      </div>

      {/* Bed Details Modal */}
      {showBedModal && selectedBed && (
        <BedDetailsModal
          bed={selectedBed}
          onClose={() => setShowBedModal(false)}
          onUpdateStatus={handleBedStatusUpdate}
          onDischarge={handlePatientDischarge}
          onAssign={(bed) => {
            setShowBedModal(false);
            setShowPatientForm(true);
            setPatientForm({ ...patientForm, assignedBed: bed._id, wardType: bed.ward?.name });
          }}
          user={user}
          getStatusColor={getStatusColor}
        />
      )}

      {/* Add Patient Form Modal */}
      {showPatientForm && (
        <div className="modal-overlay" onClick={() => setShowPatientForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Add New Patient</h3>
            <form onSubmit={handlePatientSubmit}>
              <input type="text" placeholder="Patient Name" value={patientForm.name}
                onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })} required />
              <input type="number" placeholder="Age" value={patientForm.age}
                onChange={(e) => setPatientForm({ ...patientForm, age: e.target.value })} required />
              <select value={patientForm.gender} onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value })}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              <input type="text" placeholder="Reason for Admission" value={patientForm.reasonForAdmission}
                onChange={(e) => setPatientForm({ ...patientForm, reasonForAdmission: e.target.value })} required />
              <input type="text" placeholder="Department" value={patientForm.department}
                onChange={(e) => setPatientForm({ ...patientForm, department: e.target.value })} />
              <select value={patientForm.priority} onChange={(e) => setPatientForm({ ...patientForm, priority: e.target.value })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>

              <label className="form-label">🏥 Select Ward Type *</label>
              <select value={patientForm.wardType}
                onChange={(e) => {
                  setPatientForm({ ...patientForm, wardType: e.target.value, assignedBed: '' });
                  getBedRecommendations(e.target.value);
                }} required>
                <option value="">-- Select Ward Type --</option>
                <option value="ICU">ICU</option>
                <option value="ER">ER</option>
                <option value="General Ward">General Ward</option>
              </select>

              {recommendedBeds.length > 0 && (
                <div className="recommendations-box">
                  <h4>💡 Recommended Beds:</h4>
                  {recommendedBeds.map(bed => (
                    <div key={bed._id} className="recommendation-item">
                      {bed.bedNumber} - {bed.ward?.name} ({bed.equipmentType.join(', ') || 'Standard'})
                    </div>
                  ))}
                </div>
              )}

              <label className="form-label">🛏️ Assign Bed Number *</label>
              <select value={patientForm.assignedBed}
                onChange={(e) => setPatientForm({ ...patientForm, assignedBed: e.target.value })}
                disabled={!patientForm.wardType} required>
                <option value="">-- {patientForm.wardType ? 'Select Bed Number' : 'Select Ward Type First'} --</option>
                {getAvailableBedsByWard(patientForm.wardType).map(bed => (
                  <option key={bed._id} value={bed._id}>
                    {bed.bedNumber} - {bed.equipmentType.join(', ') || 'Standard'}
                  </option>
                ))}
              </select>

              {patientForm.wardType && getAvailableBedsByWard(patientForm.wardType).length === 0 && (
                <p style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '-8px' }}>
                  ⚠️ No available beds in {patientForm.wardType} ward
                </p>
              )}

              <div className="modal-actions">
                <button type="submit" disabled={loading}>
                  {loading ? 'Adding...' : 'Add Patient'}
                </button>
                <button type="button" onClick={() => setShowPatientForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
