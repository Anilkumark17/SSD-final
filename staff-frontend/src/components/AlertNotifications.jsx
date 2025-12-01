import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import './AlertNotifications.css';

const AlertNotifications = () => {
  const [alerts, setAlerts] = useState([]);
  const { socket } = useSocket();

  useEffect(() => {
    if (socket) {
      // Listen for new alerts
      socket.on('alert:new', (alert) => {
        console.log('New alert received:', alert);
        setAlerts(prev => [alert, ...prev].slice(0, 5)); // Keep last 5 alerts
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
          setAlerts(prev => prev.filter(a => a._id !== alert._id));
        }, 10000);
      });

      return () => {
        socket.off('alert:new');
      };
    }
  }, [socket]);

  const removeAlert = (id) => {
    setAlerts(prev => prev.filter(a => a._id !== id));
  };

  if (alerts.length === 0) return null;

  return (
    <div className="alert-notifications-container">
      {alerts.map((alert) => (
        <div 
          key={alert._id} 
          className={`alert-notification ${alert.severity}`}
        >
          <div className="alert-notification-header">
            <span className="alert-notification-title">
              {alert.severity === 'critical' ? '🚨' : alert.severity === 'warning' ? '⚠️' : 'ℹ️'}
              {' '}
              {alert.type.replace(/_/g, ' ')}
            </span>
            <button 
              className="alert-close-btn"
              onClick={() => removeAlert(alert._id)}
            >
              ×
            </button>
          </div>
          <p className="alert-notification-message">{alert.message}</p>
        </div>
      ))}
    </div>
  );
};

export default AlertNotifications;
