import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { canViewReports } from '../utils/roleUtils';
import { FileText, Download, Filter, Calendar } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line
} from 'recharts';

const Reports = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [utilizationData, setUtilizationData] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [timeRange, setTimeRange] = useState('week'); // 'day', 'week', 'month'

  useEffect(() => {
    if (canViewReports(user)) {
      fetchReports();
    }
  }, [user, timeRange]);

  const fetchReports = async () => {
    try {
      setLoading(true);

      // Calculate dates
      const end = new Date();
      const start = new Date();
      if (timeRange === 'day') start.setDate(end.getDate() - 1);
      if (timeRange === 'week') start.setDate(end.getDate() - 7);
      if (timeRange === 'month') start.setDate(end.getDate() - 30);

      const [utilRes, summaryRes] = await Promise.all([
        api.get(`/reports/utilization?startDate=${start.toISOString()}&endDate=${end.toISOString()}`),
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

        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ display: 'flex', background: 'white', border: '1px solid #e2e8f0', borderRadius: '0.5rem', overflow: 'hidden' }}>
            {['day', 'week', 'month'].map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                style={{
                  padding: '0.5rem 1rem',
                  background: timeRange === range ? '#eff6ff' : 'transparent',
                  color: timeRange === range ? '#0d6efd' : '#64748b',
                  border: 'none',
                  borderRight: '1px solid #e2e8f0',
                  cursor: 'pointer',
                  fontWeight: 500,
                  textTransform: 'capitalize'
                }}
              >
                {range}
              </button>
            ))}
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
            Export
          </button>
        </div>
      </header>

      {/* Key Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0' }}>
          <h3 style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Overall Occupancy</h3>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a' }}>
            {utilizationData?.overall?.utilizationPercentage || 0}%
          </div>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
            {utilizationData?.overall?.occupied} / {utilizationData?.overall?.totalBeds} beds
          </p>
        </div>

        {utilizationData?.wardBreakdown && (
          <>
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0' }}>
              <h3 style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total Admissions</h3>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a' }}>
                {utilizationData.wardBreakdown.reduce((acc, curr) => acc + curr.totalAdmissions, 0)}
              </div>
              <p style={{ fontSize: '0.875rem', color: '#64748b' }}>In selected period</p>
            </div>
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0' }}>
              <h3 style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total Discharges</h3>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a' }}>
                {utilizationData.wardBreakdown.reduce((acc, curr) => acc + curr.totalDischarges, 0)}
              </div>
              <p style={{ fontSize: '0.875rem', color: '#64748b' }}>In selected period</p>
            </div>
          </>
        )}
      </div>

      {/* Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Ward Utilization Chart */}
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0', minHeight: '400px' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a', marginBottom: '1.5rem' }}>Ward Utilization</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={utilizationData?.wardBreakdown || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="ward" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="avgOccupancyPercentage" name="Occupancy %" fill="#3b82f6" />
              <Bar dataKey="turnoverRate" name="Turnover Rate" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Admissions vs Discharges */}
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0', minHeight: '400px' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a', marginBottom: '1.5rem' }}>Activity Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={utilizationData?.wardBreakdown || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="ward" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="totalAdmissions" name="Admissions" fill="#8b5cf6" />
              <Bar dataKey="totalDischarges" name="Discharges" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Request Ratio Chart */}
      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a', marginBottom: '1.5rem' }}>Request Type Distribution</h3>
        <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {utilizationData?.requestStats ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Emergency Mode', count: utilizationData.requestStats.emergency, fill: '#dc2626' },
                { name: 'Standard Request', count: utilizationData.requestStats.standard, fill: '#3b82f6' }
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="Requests" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: '#64748b' }}>No request data available</p>
          )}
        </div>
      </div>

      {/* Detailed Table */}
      <section style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#334155', marginBottom: '1rem' }}>
          Detailed Breakdown
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', color: '#64748b' }}>Ward</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', color: '#64748b' }}>Total Beds</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', color: '#64748b' }}>Occupied</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', color: '#64748b' }}>Occupancy %</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', color: '#64748b' }}>Admissions</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', color: '#64748b' }}>Discharges</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', color: '#64748b' }}>Turnover</th>
              </tr>
            </thead>
            <tbody>
              {utilizationData?.wardBreakdown?.map((ward, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem', fontWeight: 500 }}>{ward.ward}</td>
                  <td style={{ padding: '1rem' }}>{ward.totalBeds}</td>
                  <td style={{ padding: '1rem' }}>{ward.currentOccupied}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '9999px',
                      background: ward.avgOccupancyPercentage > 90 ? '#fee2e2' : '#dcfce7',
                      color: ward.avgOccupancyPercentage > 90 ? '#dc2626' : '#16a34a',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}>
                      {ward.avgOccupancyPercentage}%
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>{ward.totalAdmissions}</td>
                  <td style={{ padding: '1rem' }}>{ward.totalDischarges}</td>
                  <td style={{ padding: '1rem' }}>{ward.turnoverRate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default Reports;
