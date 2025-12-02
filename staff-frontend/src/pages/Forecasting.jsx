import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Clock,
  AlertCircle,
  Activity,
  User
} from 'lucide-react';

const Forecasting = () => {
  const [forecastData, setForecastData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [events, setEvents] = useState({ discharges: [], surgeries: [] });
  const [loading, setLoading] = useState(true);
  const [wardFilter, setWardFilter] = useState('All'); // Ward filter state
  const { socket } = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    fetchForecastData();
    fetchSummary();
    if (user?.role === 'HOSPITAL_ADMIN') {
      fetchEvents();
    }

    if (socket) {
      socket.on('bed:updated', fetchForecastData);
      socket.on('patient:admitted', fetchForecastData);
      socket.on('patient:discharged', fetchForecastData);

      // Listen for forecasting updates from cron job
      socket.on('forecasting:updated', (data) => {
        console.log('📊 Received forecasting update:', data);
        if (data.discharges || data.surgeries) {
          setEvents({
            discharges: data.discharges || [],
            surgeries: data.surgeries || []
          });
        }
      });

      return () => {
        socket.off('bed:updated');
        socket.off('patient:admitted');
        socket.off('patient:discharged');
        socket.off('forecasting:updated');
      };
    }
  }, [socket, user]);

  const fetchForecastData = async () => {
    try {
      const { data } = await api.get('/dashboard/overview');
      setForecastData(data.forecasting);
    } catch (error) {
      console.error('Error fetching forecast:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const { data } = await api.get('/reports/summary');
      setSummary(data);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const fetchEvents = async () => {
    try {
      const { data } = await api.get('/forecasting/events?hours=12');
      if (data.success) {
        setEvents(data.events);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading forecasting data...</div>;

  const getTrendIcon = (trend) => {
    if (trend === 'increasing') return <TrendingUp className="text-red-500" size={20} />;
    if (trend === 'decreasing') return <TrendingDown className="text-green-500" size={20} />;
    return <Minus className="text-gray-500" size={20} />;
  };

  const getTrendColor = (trend) => {
    if (trend === 'increasing') return '#dc2626';
    if (trend === 'decreasing') return '#16a34a';
    return '#64748b';
  };

  // Filter events by ward
  const filteredDischarges = wardFilter === 'All'
    ? events.discharges
    : events.discharges.filter(d => d.wardType === wardFilter || d.ward === wardFilter);

  const filteredSurgeries = wardFilter === 'All'
    ? events.surgeries
    : events.surgeries.filter(s => s.wardType === wardFilter || s.ward === wardFilter);

  // Get unique wards for filter
  const getUniqueWards = () => {
    const wards = new Set();
    events.discharges.forEach(d => wards.add(d.wardType || d.ward));
    events.surgeries.forEach(s => wards.add(s.wardType || s.ward));
    return Array.from(wards).filter(w => w !== 'Unknown');
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', color: '#0f172a', marginBottom: '0.5rem' }}>Capacity Forecasting</h1>
        <p style={{ color: '#64748b' }}>Predictive analytics for bed availability and capacity planning</p>
      </header>

      {/* Summary Report */}
      {summary && (
        <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '2rem', borderRadius: '1rem', marginBottom: '2rem', color: 'white', boxShadow: '0 10px 25px rgba(102, 126, 234, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <AlertCircle size={24} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Current Status Summary</h2>
          </div>
          <p style={{ fontSize: '1.125rem', lineHeight: 1.8, opacity: 0.95 }}>{summary.summary}</p>
          <p style={{ fontSize: '0.875rem', marginTop: '1rem', opacity: 0.8 }}>
            Last updated: {new Date(summary.details.timestamp).toLocaleString()}
          </p>
        </div>
      )}

      {/* Capacity Prediction */}
      {forecastData?.capacityPrediction && (
        <div style={{ background: 'white', padding: '2rem', borderRadius: '1rem', border: '1px solid #e2e8f0', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Clock size={24} style={{ color: '#0d6efd' }} />
            6-Hour Capacity Forecast
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>Current Occupied</p>
              <p style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a' }}>{forecastData.capacityPrediction.currentOccupied}</p>
            </div>

            <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>Predicted Occupied</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <p style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a' }}>{forecastData.capacityPrediction.predictedOccupied}</p>
                {getTrendIcon(forecastData.capacityPrediction.trend)}
              </div>
            </div>

            <div style={{ padding: '1.5rem', background: '#dcfce7', borderRadius: '0.75rem', border: '1px solid #bbf7d0' }}>
              <p style={{ fontSize: '0.875rem', color: '#15803d', marginBottom: '0.5rem' }}>Predicted Available</p>
              <p style={{ fontSize: '2rem', fontWeight: 700, color: '#15803d' }}>{forecastData.capacityPrediction.predictedAvailable}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Admission Rate</p>
              <p style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a' }}>{forecastData.capacityPrediction.admissionRate} / hour</p>
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Discharge Rate</p>
              <p style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a' }}>{forecastData.capacityPrediction.dischargeRate} / hour</p>
            </div>
          </div>

          <div style={{ marginTop: '1rem', padding: '1rem', background: `${getTrendColor(forecastData.capacityPrediction.trend)}15`, borderRadius: '0.5rem', borderLeft: `4px solid ${getTrendColor(forecastData.capacityPrediction.trend)}` }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: getTrendColor(forecastData.capacityPrediction.trend), textTransform: 'capitalize' }}>
              Trend: {forecastData.capacityPrediction.trend}
            </p>
          </div>
        </div>
      )}

      {/* Upcoming Events Section (Hospital Admin Only) */}
      {user?.role === 'HOSPITAL_ADMIN' && (
        <>
          {/* Ward Filter */}
          <div style={{ background: 'white', padding: '1rem 1.5rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, color: '#64748b' }}>Filter by Ward:</span>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {['All', ...getUniqueWards()].map(ward => (
                <button
                  key={ward}
                  onClick={() => setWardFilter(ward)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    border: wardFilter === ward ? '2px solid #0d6efd' : '1px solid #e2e8f0',
                    background: wardFilter === ward ? '#eff6ff' : 'white',
                    color: wardFilter === ward ? '#0d6efd' : '#64748b',
                    fontWeight: wardFilter === ward ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {ward}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Discharges */}
            <div style={{ background: 'white', padding: '2rem', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Calendar size={24} style={{ color: '#0d6efd' }} />
                  Expected Discharges (12h)
                </div>
                <span style={{ background: '#eff6ff', color: '#0d6efd', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.875rem', fontWeight: 700 }}>
                  {filteredDischarges.length}
                </span>
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '600px', overflowY: 'auto' }}>
                {filteredDischarges?.length > 0 ? (
                  filteredDischarges.map((discharge, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '1.25rem',
                        background: discharge.isUrgent ? '#fef2f2' : '#f8fafc',
                        borderRadius: '0.75rem',
                        border: discharge.isUrgent ? '2px solid #fca5a5' : '1px solid #e2e8f0',
                        boxShadow: discharge.isUrgent ? '0 4px 6px rgba(220, 38, 38, 0.1)' : 'none'
                      }}
                    >
                      {/* Urgency Banner */}
                      {discharge.isUrgent && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', padding: '0.5rem', background: '#dc2626', color: 'white', borderRadius: '0.5rem' }}>
                          <AlertCircle size={16} />
                          <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>URGENT - Less than 3 hours</span>
                        </div>
                      )}

                      {/* Patient Name & ID */}
                      <div style={{ marginBottom: '0.75rem' }}>
                        <h4 style={{ fontWeight: 700, color: '#0f172a', fontSize: '1.125rem', marginBottom: '0.25rem' }}>
                          {discharge.patientName}
                        </h4>
                        <p style={{ fontSize: '0.75rem', color: '#64748b' }}>ID: {discharge.patientId}</p>
                      </div>

                      {/* Patient Details Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem', padding: '0.75rem', background: 'white', borderRadius: '0.5rem' }}>
                        <div>
                          <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Age / Gender</p>
                          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>{discharge.age} yrs / {discharge.gender}</p>
                        </div>
                        <div>
                          <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Bed / Ward</p>
                          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>{discharge.bedNumber} • {discharge.ward}</p>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Doctor</p>
                          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>{discharge.doctor}</p>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Diagnosis</p>
                          <p style={{ fontSize: '0.875rem', color: '#475569' }}>{discharge.diagnosis}</p>
                        </div>
                      </div>

                      {/* Discharge Time & Countdown */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: discharge.isUrgent ? '#fee2e2' : '#ecfdf5', borderRadius: '0.5rem' }}>
                        <div>
                          <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Expected Discharge</p>
                          <p style={{ fontSize: '0.875rem', fontWeight: 700, color: discharge.isUrgent ? '#dc2626' : '#16a34a' }}>
                            {new Date(discharge.expectedDischargeTime).toLocaleString('en-US', {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Time Remaining</p>
                          <p style={{ fontSize: '1.25rem', fontWeight: 700, color: discharge.isUrgent ? '#dc2626' : '#16a34a' }}>
                            {discharge.hoursRemaining}h
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-8">No discharges expected in this ward</div>
                )}
              </div>
            </div>

            {/* Surgeries */}
            <div style={{ background: 'white', padding: '2rem', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Activity size={24} style={{ color: '#e11d48' }} />
                  Upcoming Surgeries (12h)
                </div>
                <span style={{ background: '#fef2f2', color: '#e11d48', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.875rem', fontWeight: 700 }}>
                  {filteredSurgeries.length}
                </span>
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '600px', overflowY: 'auto' }}>
                {filteredSurgeries?.length > 0 ? (
                  filteredSurgeries.map((surgery, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '1.25rem',
                        background: surgery.isUrgent ? '#fef2f2' : '#f8fafc',
                        borderRadius: '0.75rem',
                        border: surgery.isUrgent ? '2px solid #fca5a5' : '1px solid #e2e8f0',
                        boxShadow: surgery.isUrgent ? '0 4px 6px rgba(220, 38, 38, 0.1)' : 'none'
                      }}
                    >
                      {/* Urgency Banner */}
                      {surgery.isUrgent && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', padding: '0.5rem', background: '#dc2626', color: 'white', borderRadius: '0.5rem' }}>
                          <AlertCircle size={16} />
                          <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>URGENT - Less than 3 hours</span>
                        </div>
                      )}

                      {/* Patient Name & ID */}
                      <div style={{ marginBottom: '0.75rem' }}>
                        <h4 style={{ fontWeight: 700, color: '#0f172a', fontSize: '1.125rem', marginBottom: '0.25rem' }}>
                          {surgery.patientName}
                        </h4>
                        <p style={{ fontSize: '0.75rem', color: '#64748b' }}>ID: {surgery.patientId}</p>
                      </div>

                      {/* Patient Details Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem', padding: '0.75rem', background: 'white', borderRadius: '0.5rem' }}>
                        <div>
                          <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Age / Gender</p>
                          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>{surgery.age} yrs / {surgery.gender}</p>
                        </div>
                        <div>
                          <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Bed / Ward</p>
                          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>{surgery.bedNumber} • {surgery.ward}</p>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Procedure</p>
                          <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#e11d48' }}>{surgery.procedure}</p>
                        </div>
                        <div>
                          <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Surgeon</p>
                          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>{surgery.surgeon}</p>
                        </div>
                        <div>
                          <p style={{ fontSize: '0.75rem', color: '#64748b' }}>OT</p>
                          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>{surgery.operatingTheater}</p>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Diagnosis</p>
                          <p style={{ fontSize: '0.875rem', color: '#475569' }}>{surgery.diagnosis}</p>
                        </div>
                      </div>

                      {/* Surgery Time & Countdown */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: surgery.isUrgent ? '#fee2e2' : '#fef3c7', borderRadius: '0.5rem' }}>
                        <div>
                          <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Scheduled Time</p>
                          <p style={{ fontSize: '0.875rem', fontWeight: 700, color: surgery.isUrgent ? '#dc2626' : '#ea580c' }}>
                            {new Date(surgery.time).toLocaleString('en-US', {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Time Remaining</p>
                          <p style={{ fontSize: '1.25rem', fontWeight: 700, color: surgery.isUrgent ? '#dc2626' : '#ea580c' }}>
                            {surgery.hoursRemaining}h
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-8">No surgeries scheduled in this ward</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Forecasting;
