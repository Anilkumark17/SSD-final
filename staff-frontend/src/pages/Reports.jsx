import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { canViewReports } from '../utils/roleUtils';
import { FileText, Download, Filter } from 'lucide-react';
import { toast } from 'react-toastify';

const Reports = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [utilizationData, setUtilizationData] = useState(null);
  const [summaryData, setSummaryData] = useState(null);

  useEffect(() => {
    if (canViewReports(user)) {
      fetchReports();
    }
  }, [user]);

  const fetchReports = async () => {
    try {
      const [utilRes, summaryRes] = await Promise.all([
        api.get('/reports/utilization'),
        api.get('/reports/summary')
      ]);
      setUtilizationData(utilRes.data);
      setSummaryData(summaryRes.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  if (!canViewReports(user)) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
        <p className="text-gray-600">You do not have permission to view reports.</p>
      </div>
    );
  }

  if (loading) return <div className="p-8 text-center">Loading reports...</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
            Hospital Reports
          </h1>
          <p style={{ color: '#64748b' }}>Comprehensive utilization and activity reports</p>
        </div>
        <button 
          className="primary-btn"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            background: '#0d6efd',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <Download size={20} />
          Export All
        </button>
      </header>

      {/* Utilization Stats */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#334155', marginBottom: '1rem' }}>
          Current Utilization
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <div className="stat-card" style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0' }}>
            <h3 style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Overall Occupancy</h3>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a' }}>
              {utilizationData?.overallOccupancy ? `${Math.round(utilizationData.overallOccupancy)}%` : '0%'}
            </div>
          </div>
          {/* Add more stats as needed based on API response structure */}
        </div>
      </section>

      {/* Summary Report */}
      <section>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#334155', marginBottom: '1rem' }}>
          Daily Summary
        </h2>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0' }}>
          {/* Placeholder for summary data visualization */}
          <pre style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', overflowX: 'auto' }}>
            {JSON.stringify(summaryData, null, 2)}
          </pre>
        </div>
      </section>
    </div>
  );
};

export default Reports;
