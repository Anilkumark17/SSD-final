import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import {
    Hospital,
    Search,
    Bell,
    LogOut,
    Calendar,
    Clock,
    Activity,
    User
} from 'lucide-react';
import '../styles/employees.css'; // Reusing existing styles for layout

const Forecasting = () => {
    const [events, setEvents] = useState({ discharges: [], surgeries: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { logout, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        fetchForecastData();
    }, []);

    const fetchForecastData = async () => {
        try {
            setLoading(true);
            // Direct call to staff-backend
            const response = await axios.get('http://localhost:5001/api/forecasting/events?hours=12', {
                withCredentials: true
            });

            if (response.data.success) {
                setEvents(response.data.events);
            }
        } catch (err) {
            console.error('Error fetching forecast:', err);
            setError('Failed to load forecasting data');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="employees-page">
            {/* Top Navigation Bar - Reused from Employees.jsx */}
            <header className="top-nav">
                <div className="nav-container">
                    <div className="nav-left">
                        <div className="brand">
                            <div className="brand-icon">
                                <Hospital />
                            </div>
                            <span className="brand-name">MedAdmin</span>
                        </div>

                        <nav className="nav-links">
                            <Link to="/employees" className="nav-link">Dashboard</Link>
                            <Link to="/forecasting" className="nav-link active">Forecasting</Link>
                            <a href="#" className="nav-link">Departments</a>
                            <a href="#" className="nav-link">Settings</a>
                        </nav>
                    </div>

                    <div className="nav-right">
                        <div className="search-box">
                            <Search className="search-icon" />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="search-input"
                            />
                        </div>

                        <button className="notification-btn">
                            <Bell />
                            <span className="notification-badge"></span>
                        </button>

                        <div className="nav-divider"></div>

                        <div className="user-section">
                            <div className="user-info">
                                <p className="user-name">{user?.name || 'User'}</p>
                                <p className="user-role">IT Admin</p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="logout-btn"
                            >
                                <LogOut />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="main-content">
                <div className="page-header">
                    <div className="header-text">
                        <h1 className="page-title">12-Hour Forecast</h1>
                        <p className="page-subtitle">Upcoming discharges and surgeries for the next 12 hours.</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock size={16} />
                        <span>Updated: {new Date().toLocaleTimeString()}</span>
                    </div>
                </div>

                {loading ? (
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p className="loading-text">Loading forecast data...</p>
                    </div>
                ) : error ? (
                    <div className="error-container">
                        <p className="error-text">{error}</p>
                        <button onClick={fetchForecastData} className="btn-retry">Retry</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Discharges Section */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                                    <LogOut className="text-blue-600" size={20} />
                                    Upcoming Discharges
                                </h2>
                                <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-medium">
                                    {events.discharges?.length || 0}
                                </span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold">
                                        <tr>
                                            <th className="px-6 py-3 text-left">Patient</th>
                                            <th className="px-6 py-3 text-left">Location</th>
                                            <th className="px-6 py-3 text-left">Expected Time</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {events.discharges?.length > 0 ? (
                                            events.discharges.map((discharge, index) => (
                                                <tr key={index} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="font-medium text-slate-900">{discharge.patientName}</div>
                                                        <div className="text-xs text-slate-500">ID: {discharge.patientId}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm text-slate-700">{discharge.ward}</div>
                                                        <div className="text-xs text-slate-500">Bed: {discharge.bedNumber}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-1.5 text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded-md w-fit">
                                                            <Clock size={14} />
                                                            {new Date(discharge.expectedDischargeTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="3" className="px-6 py-8 text-center text-slate-500">
                                                    No discharges expected in the next 12 hours
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Surgeries Section */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                                    <Activity className="text-rose-600" size={20} />
                                    Scheduled Surgeries
                                </h2>
                                <span className="bg-rose-100 text-rose-700 px-2.5 py-0.5 rounded-full text-xs font-medium">
                                    {events.surgeries?.length || 0}
                                </span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold">
                                        <tr>
                                            <th className="px-6 py-3 text-left">Patient</th>
                                            <th className="px-6 py-3 text-left">Procedure</th>
                                            <th className="px-6 py-3 text-left">Time & Surgeon</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {events.surgeries?.length > 0 ? (
                                            events.surgeries.map((surgery, index) => (
                                                <tr key={index} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="font-medium text-slate-900">{surgery.patientName}</div>
                                                        <div className="text-xs text-slate-500">ID: {surgery.patientId}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm text-slate-700 font-medium">{surgery.procedure}</div>
                                                        <div className="text-xs text-slate-500 capitalize">{surgery.status}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                                                                <Clock size={14} className="text-slate-400" />
                                                                {new Date(surgery.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                                <User size={12} />
                                                                {surgery.surgeon}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="3" className="px-6 py-8 text-center text-slate-500">
                                                    No surgeries scheduled in the next 12 hours
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Forecasting;
