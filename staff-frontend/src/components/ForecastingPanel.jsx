import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import api from '../api/axios';
import { toast } from 'react-toastify';
import './ForecastingPanel.css';

const ForecastingPanel = () => {
  const [summaryReport, setSummaryReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  useEffect(() => {
    fetchSummary();

    // Refresh every 5 minutes
    const interval = setInterval(fetchSummary, 5 * 60 * 1000);

    // Refresh when beds update
    if (socket) {
      socket.on('bed:updated', fetchSummary);
      socket.on('patient:admitted', fetchSummary);
      socket.on('patient:discharged', fetchSummary);

      return () => {
        socket.off('bed:updated', fetchSummary);
        socket.off('patient:admitted', fetchSummary);
        socket.off('patient:discharged', fetchSummary);
        clearInterval(interval);
      };
    }

    return () => clearInterval(interval);
  }, [socket]);

  const fetchSummary = async () => {
    try {
      const { data } = await api.get('/forecasting/summary');
      if (data.success) {
        setSummaryReport(data.report);
      }
    } catch (error) {
      console.error('Error fetching forecast:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="forecasting-panel">Loading forecast...</div>;
  }

  if (!summaryReport) {
    return null;
  }

  return (
    <div className="forecasting-panel">
      <h3>📊 Bed Availability Forecast (Next 24 Hours)</h3>
      
      <div className="summary-text">
        <p>{summaryReport.summary}</p>
      </div>

      <div className="forecast-cards">
        {summaryReport.reports.map((report) => (
          <div key={report.ward.id} className="forecast-card">
            <div className="forecast-header">
              <h4>{report.ward.name}</h4>
              <span className={`occupancy-badge ${getOccupancyClass(report.current.occupancyRate)}`}>
                {report.current.occupancyRate}%
              </span>
            </div>

            <div className="forecast-stats">
              <div className="stat">
                <span className="stat-label">Current Available:</span>
                <span className="stat-value">{report.current.available}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Occupied:</span>
                <span className="stat-value">{report.current.occupied}/{report.current.total}</span>
              </div>
              {report.current.cleaning > 0 && (
                <div className="stat">
                  <span className="stat-label">Cleaning:</span>
                  <span className="stat-value">{report.current.cleaning}</span>
                </div>
              )}
            </div>

            <div className="forecast-prediction">
              <div className="prediction-header">
                <strong>Predicted (24h):</strong>
              </div>
              <div className="prediction-stats">
                <div className="prediction-item">
                  <span>Expected Discharges:</span>
                  <span className="highlight">{report.forecast.expectedDischarges}</span>
                </div>
                <div className="prediction-item">
                  <span>Cleaning Complete:</span>
                  <span className="highlight">{report.forecast.cleaningComplete}</span>
                </div>
                <div className="prediction-item">
                  <span>Predicted Available:</span>
                  <span className="highlight success">{report.forecast.predictedAvailable}</span>
                </div>
              </div>
            </div>

            {report.nextExpectedDischarge && (
              <div className="next-discharge">
                <strong>Next Discharge:</strong>
                <span>
                  {new Date(report.nextExpectedDischarge.time).toLocaleString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                  {' '}(Bed {report.nextExpectedDischarge.bedNumber})
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const getOccupancyClass = (rate) => {
  if (rate >= 90) return 'critical';
  if (rate >= 80) return 'warning';
  if (rate >= 60) return 'moderate';
  return 'good';
};

export default ForecastingPanel;
