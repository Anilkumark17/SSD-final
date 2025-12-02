import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, XCircle, Clock, User } from 'lucide-react';
import { toast } from 'react-toastify';

const BedRequestApproval = () => {
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showRejectModal, setShowRejectModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            const [bedReqRes, emergReqRes] = await Promise.all([
                api.get('/bed-requests'),
                api.get('/emergency-requests')
            ]);

            const bedRequests = bedReqRes.data.filter(req => req.status === 'pending').map(r => ({ ...r, type: 'Standard' }));
            const emergencyRequests = emergReqRes.data.filter(req => req.status === 'pending').map(r => ({ ...r, type: 'Emergency', requestDate: r.requestedAt, patientId: { name: r.patientName }, wardType: r.preferredWard, equipmentRequired: r.requiredEquipment.join(', ') }));

            setRequests([...emergencyRequests, ...bedRequests].sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate)));
        } catch (error) {
            console.error('Error fetching bed requests:', error);
            toast.error('Failed to fetch requests');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (request) => {
        try {
            if (request.type === 'Emergency') {
                await api.patch(`/emergency-requests/${request._id}/approve`);
            } else {
                await api.patch(`/bed-requests/${request._id}/approve`);
            }
            toast.success('Request approved');
            fetchRequests();
        } catch (error) {
            toast.error('Failed to approve request');
        }
    };

    const openRejectModal = (request) => {
        setSelectedRequest(request);
        setRejectionReason('');
        setShowRejectModal(true);
    };

    const handleRejectSubmit = async (e) => {
        e.preventDefault();
        if (!selectedRequest) return;

        try {
            await api.patch(`/bed-requests/${selectedRequest._id}/reject`, {
                rejectionReason
            });
            toast.success('Request rejected');
            setShowRejectModal(false);
            fetchRequests();
        } catch (error) {
            console.error('Reject error:', error);
            toast.error('Failed to reject request');
        }
    };

    if (loading) return <div className="p-8 text-center">Loading requests...</div>;

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <header style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
                    Bed Request Approvals
                </h1>
                <p style={{ color: '#64748b' }}>Review and approve incoming bed requests</p>
            </header>

            <div style={{ display: 'grid', gap: '1rem' }}>
                {requests.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '1rem', border: '1px solid #e2e8f0', color: '#64748b' }}>
                        No pending requests
                    </div>
                ) : (
                    requests.map(request => (
                        <div key={request._id} style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a' }}>
                                        {request.patientId?.name || 'Unknown Patient'}
                                    </h3>
                                    <span style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        padding: '0.125rem 0.5rem',
                                        borderRadius: '9999px',
                                        background: request.priority === 'critical' ? '#fee2e2' : '#fef3c7',
                                        color: request.priority === 'critical' ? '#dc2626' : '#d97706',
                                        textTransform: 'uppercase'
                                    }}>
                                        {request.priority}
                                    </span>
                                </div>
                                <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                                    Ward: {request.wardType} • Equipment: {request.equipmentRequired}
                                </p>
                                {(request.assignedBed || request.recommendedBed) && (
                                    <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#f0f9ff', borderRadius: '0.375rem', border: '1px solid #bae6fd', display: 'inline-block' }}>
                                        <p style={{ fontSize: '0.875rem', color: '#0369a1', fontWeight: 600, margin: 0 }}>
                                            Auto-Allocated: {request.assignedBed?.bedNumber || request.recommendedBed?.bedNumber} ({request.assignedBed?.ward || request.recommendedBed?.ward})
                                        </p>
                                    </div>
                                )}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                                    <Clock size={14} />
                                    {new Date(request.requestDate).toLocaleString()}
                                    <span style={{ margin: '0 0.5rem' }}>•</span>
                                    <User size={14} />
                                    Requested by {request.requestedBy?.name}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    onClick={() => handleApprove(request)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0.5rem 1rem',
                                        background: '#16a34a',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '0.5rem',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    <CheckCircle size={18} />
                                    Approve
                                </button>
                                <button
                                    onClick={() => openRejectModal(request)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0.5rem 1rem',
                                        background: 'white',
                                        border: '1px solid #e2e8f0',
                                        color: '#64748b',
                                        borderRadius: '0.5rem',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    <XCircle size={18} />
                                    Reject
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Reject Modal */}
            {showRejectModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
                    <div style={{ background: 'white', width: '100%', maxWidth: '500px', borderRadius: '1rem', padding: '2rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Reject Request</h2>
                        <form onSubmit={handleRejectSubmit}>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Reason for Rejection</label>
                                <textarea
                                    required
                                    rows="3"
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    placeholder="Enter reason..."
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowRejectModal(false)}
                                    style={{ padding: '0.75rem 1.5rem', background: 'transparent', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    style={{ padding: '0.75rem 1.5rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    Confirm Reject
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BedRequestApproval;
