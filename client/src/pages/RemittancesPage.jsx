import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    getRemittances, submitRemittance, verifyRemittance, rejectRemittance
} from '../api';
import {
    Send, CheckCircle2, XCircle, Clock, ArrowUpRight,
    DollarSign, Users, TrendingUp
} from 'lucide-react';
import Swal from 'sweetalert2';

export default function RemittancesPage() {
    const { user } = useAuth();
    const [remittances, setRemittances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const isKubrador = user?.role === 'kubrador';
    const isCabo = user?.role === 'cabo';
    const isBankero = user?.role === 'bankero';
    const isAdmin = user?.role === 'admin';

    useEffect(() => { loadRemittances(); }, []);

    const loadRemittances = async () => {
        try {
            const res = await getRemittances();
            setRemittances(res.data.remittances);
        } catch (err) {
            console.error('Load remittances error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitRemittance = async () => {
        const result = await Swal.fire({
            title: '📤 Submit Daily Remittance',
            html: `
                <p style="color:#A09C97;margin-bottom:16px">This will calculate today's collections and submit them to your Cabo for verification.</p>
                <div style="margin-bottom:12px">
                    <label style="display:block;color:#A09C97;font-size:13px;margin-bottom:4px">Notes (optional)</label>
                    <input id="swal-notes" class="swal2-input" placeholder="Any notes for your Cabo..." style="background:#141416;border:1px solid rgba(218,145,1,0.3);color:#F2EDE7">
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Submit Remittance',
            confirmButtonColor: '#DA9101',
            cancelButtonColor: '#333',
            background: '#1E1E1F',
            color: '#DA9101',
            preConfirm: () => {
                return { notes: document.getElementById('swal-notes')?.value || '' };
            }
        });

        if (result.isConfirmed) {
            setSubmitting(true);
            try {
                const res = await submitRemittance({ notes: result.value.notes });
                Swal.fire({
                    icon: 'success',
                    title: 'Remittance Submitted!',
                    text: res.data.message,
                    background: '#1E1E1F', color: '#DA9101',
                    confirmButtonColor: '#DA9101'
                });
                loadRemittances();
            } catch (err) {
                Swal.fire({
                    icon: 'error',
                    title: 'Failed',
                    text: err.response?.data?.message || 'Could not submit remittance',
                    background: '#1E1E1F', color: '#DA9101'
                });
            } finally {
                setSubmitting(false);
            }
        }
    };

    const handleVerify = async (id, netAmount) => {
        const result = await Swal.fire({
            title: '✅ Verify Remittance?',
            html: `<p style="color:#A09C97">This will forward <strong style="color:#DA9101">₱${netAmount.toLocaleString()}</strong> to the Bankero and credit your commission.</p>`,
            showCancelButton: true,
            confirmButtonText: 'Verify & Forward',
            confirmButtonColor: '#006A4F',
            background: '#1E1E1F', color: '#DA9101'
        });
        if (result.isConfirmed) {
            try {
                await verifyRemittance(id);
                Swal.fire({ icon: 'success', title: 'Verified!', background: '#1E1E1F', color: '#DA9101', timer: 1500, showConfirmButton: false });
                loadRemittances();
            } catch (err) {
                Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'Failed', background: '#1E1E1F', color: '#DA9101' });
            }
        }
    };

    const handleReject = async (id) => {
        const { value: reason } = await Swal.fire({
            title: 'Reject Remittance?',
            input: 'text',
            inputPlaceholder: 'Reason for rejection...',
            showCancelButton: true,
            confirmButtonColor: '#8B0001',
            confirmButtonText: 'Reject',
            background: '#1E1E1F', color: '#DA9101'
        });
        if (reason !== undefined) {
            try {
                await rejectRemittance(id, reason || 'Rejected');
                loadRemittances();
            } catch (err) {
                Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'Failed', background: '#1E1E1F', color: '#DA9101' });
            }
        }
    };

    const getStatusBadge = (status) => {
        const map = {
            submitted: { cls: 'badge-gold', icon: <Clock size={12} />, label: 'SUBMITTED' },
            verified: { cls: 'badge-green', icon: <CheckCircle2 size={12} />, label: 'VERIFIED' },
            received: { cls: 'badge-green', icon: <CheckCircle2 size={12} />, label: 'RECEIVED' },
            rejected: { cls: 'badge-red', icon: <XCircle size={12} />, label: 'REJECTED' },
        };
        const s = map[status] || map.submitted;
        return <span className={`badge ${s.cls}`}>{s.icon} {s.label}</span>;
    };

    if (loading) {
        return (
            <div>
                <div className="stats-grid">
                    {[1, 2, 3].map(i => <div key={i} className="shimmer" style={{ height: '120px' }} />)}
                </div>
            </div>
        );
    }

    const pendingCount = remittances.filter(r => r.status === 'submitted').length;
    const verified = remittances.filter(r => r.status === 'verified');
    const totalVerifiedAmount = verified.reduce((s, r) => s + r.netAmount, 0);
    const totalCollections = remittances.reduce((s, r) => s + r.totalCollections, 0);

    return (
        <div>
            {/* Stats */}
            <div className="stats-grid">
                <div className="stat-card gold">
                    <div className="stat-icon gold"><Send size={24} /></div>
                    <div className="stat-info">
                        <h3>{isCabo ? 'Pending Verification' : 'Pending'}</h3>
                        <div className="stat-value">{pendingCount}</div>
                        <div className="stat-change">{isCabo ? 'Awaiting your verification' : 'Awaiting Cabo'}</div>
                    </div>
                </div>
                <div className="stat-card green">
                    <div className="stat-icon green"><TrendingUp size={24} /></div>
                    <div className="stat-info">
                        <h3>Verified Amount</h3>
                        <div className="stat-value">₱{totalVerifiedAmount.toLocaleString()}</div>
                    </div>
                </div>
                <div className="stat-card gold">
                    <div className="stat-icon gold"><DollarSign size={24} /></div>
                    <div className="stat-info">
                        <h3>Total Collections</h3>
                        <div className="stat-value">₱{totalCollections.toLocaleString()}</div>
                    </div>
                </div>
            </div>

            {/* Action Bar */}
            <div className="card mb-3" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <div className="card-title">
                        {isKubrador ? 'My Remittances' : isCabo ? 'Remittance Verification Queue' : isBankero ? 'Remittance Inflows' : 'All Remittances'}
                    </div>
                    <div className="card-subtitle">
                        {isKubrador ? 'Submit your daily collections to your Cabo' :
                            isCabo ? 'Verify kubrador collections and forward to Bankero' :
                                isBankero ? 'Incoming remittances from your Cabos' :
                                    'System-wide remittance tracking'}
                    </div>
                </div>
                {isKubrador && (
                    <button className="btn btn-gold" onClick={handleSubmitRemittance} disabled={submitting}>
                        <Send size={16} /> {submitting ? 'Processing...' : 'Submit Today\'s Remittance'}
                    </button>
                )}
            </div>

            {/* Remittances Table */}
            <div className="card">
                <div className="data-table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                {!isKubrador && <th>Kubrador</th>}
                                <th>Collections</th>
                                <th>Kubra. Commission</th>
                                <th>Cabo Commission</th>
                                <th>Net to Bankero</th>
                                <th>Status</th>
                                <th>Date</th>
                                {(isCabo || isAdmin) && <th>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {remittances.length === 0 ? (
                                <tr>
                                    <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                                        No remittances yet
                                    </td>
                                </tr>
                            ) : (
                                remittances.map(r => (
                                    <tr key={r._id}>
                                        {!isKubrador && (
                                            <td>
                                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.submittedBy?.fullName}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>@{r.submittedBy?.username}</div>
                                            </td>
                                        )}
                                        <td style={{ fontWeight: 700, color: 'var(--gold)', fontFamily: 'var(--font-display)' }}>
                                            ₱{r.totalCollections.toLocaleString()}
                                        </td>
                                        <td style={{ fontSize: '13px' }}>₱{r.kubradorCommission.toLocaleString()}</td>
                                        <td style={{ fontSize: '13px' }}>₱{r.caboCommission.toLocaleString()}</td>
                                        <td style={{ fontWeight: 700, color: 'var(--green-light)', fontFamily: 'var(--font-display)' }}>
                                            ₱{r.netAmount.toLocaleString()}
                                        </td>
                                        <td>{getStatusBadge(r.status)}</td>
                                        <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                            {new Date(r.remittanceDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                                        </td>
                                        {(isCabo || isAdmin) && (
                                            <td>
                                                {r.status === 'submitted' && (
                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                        <button className="btn btn-sm btn-gold" onClick={() => handleVerify(r._id, r.netAmount)}>
                                                            <CheckCircle2 size={14} /> Verify
                                                        </button>
                                                        <button className="btn btn-sm btn-red" onClick={() => handleReject(r._id)}>
                                                            <XCircle size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                                {r.status === 'verified' && r.verifiedBy && (
                                                    <span style={{ fontSize: '12px', color: 'var(--green-light)' }}>
                                                        ✓ {r.verifiedBy?.fullName}
                                                    </span>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
