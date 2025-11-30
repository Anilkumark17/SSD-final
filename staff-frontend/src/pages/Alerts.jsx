import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import api from '../api/axios';
import { Bell, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { toast } from 'react-toastify';
import './Alerts.css';

const Alerts = () => {
  const { socket } = useSocket();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read

  useEffect(() => {
    fetchAlerts();

    if (socket) {
      socket.on('alert-created', handleNewAlert);
      return () => socket.off('alert-created');
    }
  }, [socket]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/alerts');
      setAlerts(response.data);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      toast.error('Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  };

  const handleNewAlert = (alert) => {
    setAlerts(prev => [alert, ...prev]);
    
    // Show browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('BedManager Alert', {
        body: alert.message,
        icon: '/hospital-icon.png'
      });
    }
    
    toast.info(alert.message);
  };

  const markAsRead = async (alertId) => {
    try {
      await api.patch(`/alerts/${alertId}/read`);
      setAlerts(prev => prev.map(alert => 
        alert._id === alertId ? { ...alert, isRead: true } : alert
      ));
      toast.success('Alert marked as read');
    } catch (error) {
      console.error('Error marking alert as read:', error);
      toast.error('Failed to mark alert as read');
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="severity-icon critical" />;
      case 'warning': return <AlertTriangle className="severity-icon warning" />;
      case 'info': return <Info className="severity-icon info" />;
      default: return <Bell className="severity-icon" />;
    }
  };

  const getSeverityClass = (severity) => {
    return `alert-card ${severity}`;
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'unread') return !alert.isRead;
    if (filter === 'read') return alert.isRead;
    return true;
  });

  if (loading) {
    return (
      <div className="alerts-container">
        <div className="loading">Loading alerts...</div>
      </div>
    );
  }

  return (
    <div className="alerts-container">
      <div className="alerts-header">
        <div>
          <h1>🔔 System Alerts</h1>
          <p className="subtitle">Real-time notifications and system alerts</p>
        </div>
        <div className="filter-buttons">
          <button 
            className={filter === 'all' ? 'active' : ''} 
            onClick={() => setFilter('all')}
          >
            All ({alerts.length})
          </button>
          <button 
            className={filter === 'unread' ? 'active' : ''} 
            onClick={() => setFilter('unread')}
          >
            Unread ({alerts.filter(a => !a.isRead).length})
          </button>
          <button 
            className={filter === 'read' ? 'active' : ''} 
            onClick={() => setFilter('read')}
          >
            Read ({alerts.filter(a => a.isRead).length})
          </button>
        </div>
      </div>

      <div className="alerts-list">
        {filteredAlerts.length === 0 ? (
          <div className="no-alerts">
            <Bell size={48} />
            <p>No alerts to display</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div 
              key={alert._id} 
              className={`${getSeverityClass(alert.severity)} ${alert.isRead ? 'read' : 'unread'}`}
            >
              <div className="alert-icon">
                {getSeverityIcon(alert.severity)}
              </div>
              <div className="alert-content">
                <div className="alert-header">
                  <span className="alert-type">
                    {alert.type.replace(/_/g, ' ')}
                  </span>
                  <span className="alert-time">
                    {new Date(alert.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="alert-message">{alert.message}</p>
                {alert.ward && (
                  <span className="alert-ward">Ward: {alert.ward}</span>
                )}
              </div>
              {!alert.isRead && (
                <button 
                  className="mark-read-btn"
                  onClick={() => markAsRead(alert._id)}
                  title="Mark as read"
                >
                  <CheckCircle size={20} />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Alerts;
