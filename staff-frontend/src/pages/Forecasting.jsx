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

      return () => {
        socket.off('bed:updated');
        socket.off('patient:admitted');
        socket.off('patient:discharged');
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Discharges */}
          <div style={{ background: 'white', padding: '2rem', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Calendar size={24} style={{ color: '#0d6efd' }} />
              Expected Discharges (12h)
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {events.discharges?.length > 0 ? (
                events.discharges.map((discharge, index) => (
                  <div key={index} style={{ padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e2e8f0' }}>
                    <div>
                      <p style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.25rem' }}>{discharge.patientName}</p>
                      <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
                        {discharge.bedNumber} • {discharge.ward}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Expected</p>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#16a34a' }}>
                        {new Date(discharge.expectedDischargeTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-4">No discharges expected</div>
              )}
            </div>
          </div>

          {/* Surgeries */}
          <div style={{ background: 'white', padding: '2rem', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Activity size={24} style={{ color: '#e11d48' }} />
              Upcoming Surgeries (12h)
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {events.surgeries?.length > 0 ? (
                events.surgeries.map((surgery, index) => (
                  <div key={index} style={{ padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e2e8f0' }}>
                    <div>
                      <p style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.25rem' }}>{surgery.patientName}</p>
                      <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
                        {surgery.procedure}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="flex items-center justify-end gap-1 text-sm text-gray-600 mb-1">
                        <User size={12} />
                        <span>{surgery.surgeon}</span>
                      </div>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#e11d48' }}>
                        {new Date(surgery.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-4">No surgeries scheduled</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Forecasting;
