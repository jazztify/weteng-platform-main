import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    getDeposits, requestDeposit, approveDeposit, rejectDeposit
} from '../api';
import {
    ArrowDownCircle, CheckCircle, XCircle, Clock,
    Plus, Wallet, CreditCard
} from 'lucide-react';
import Swal from 'sweetalert2';

export default function DepositsPage() {
    const { user } = useAuth();
    const [deposits, setDeposits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showRequestForm, setShowRequestForm] = useState(false);
    const [formData, setFormData] = useState({
        amount: '', method: 'gcash', referenceNumber: '', notes: ''
    });
    const [submitting, setSubmitting] = useState(false);

    const isApprover = ['admin', 'bankero'].includes(user?.role);

    useEffect(() => { loadDeposits(); }, []);

    const loadDeposits = async () => {
        try {
            const res = await getDeposits();
            setDeposits(res.data.deposits);
        } catch (err) {
            console.error('Load deposits error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRequest = async (e) => {
        e.preventDefault();
        if (!formData.amount || parseFloat(formData.amount) < 1) return;
        setSubmitting(true);
        try {
            await requestDeposit({
                amount: parseFloat(formData.amount),
                method: formData.method,
                referenceNumber: formData.referenceNumber,
                notes: formData.notes
            });
            Swal.fire({
                icon: 'success',
                title: 'Deposit Requested',
                text: `₱${parseFloat(formData.amount).toLocaleString()} deposit request submitted. Awaiting approval.`,
                background: '#1E1E1F', color: '#DA9101',
                confirmButtonColor: '#DA9101'
            });
            setFormData({ amount: '', method: 'gcash', referenceNumber: '', notes: '' });
            setShowRequestForm(false);
            loadDeposits();
        } catch (err) {
            Swal.fire({
                icon: 'error', title: 'Error',
                text: err.response?.data?.message || 'Failed to submit deposit',
                background: '#1E1E1F', color: '#DA9101'
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleApprove = async (id, amount) => {
        const result = await Swal.fire({
            title: 'Approve Deposit?',
            text: `This will credit ₱${amount.toLocaleString()} to the user's wallet.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Approve',
            cancelButtonText: 'Cancel',
            background: '#1E1E1F', color: '#DA9101',
            confirmButtonColor: '#006A4F'
        });
        if (result.isConfirmed) {
            try {
                await approveDeposit(id);
                Swal.fire({ icon: 'success', title: 'Approved!', background: '#1E1E1F', color: '#DA9101', timer: 1500, showConfirmButton: false });
                loadDeposits();
            } catch (err) {
                Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'Failed', background: '#1E1E1F', color: '#DA9101' });
            }
        }
    };

    const handleReject = async (id) => {
        const { value: reason } = await Swal.fire({
            title: 'Reject Deposit?',
            input: 'text',
            inputPlaceholder: 'Reason for rejection...',
            showCancelButton: true,
            background: '#1E1E1F', color: '#DA9101',
            confirmButtonColor: '#8B0001',
            confirmButtonText: 'Reject'
        });
        if (reason !== undefined) {
            try {
                await rejectDeposit(id, reason || 'Rejected');
                loadDeposits();
            } catch (err) {
                Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'Failed', background: '#1E1E1F', color: '#DA9101' });
            }
        }
    };

    const getStatusBadge = (status) => {
        const map = {
            pending: { cls: 'badge-gold', icon: <Clock size={12} />, label: 'PENDING' },
            approved: { cls: 'badge-green', icon: <CheckCircle size={12} />, label: 'APPROVED' },
            rejected: { cls: 'badge-red', icon: <XCircle size={12} />, label: 'REJECTED' },
        };
        const s = map[status] || map.pending;
        return <span className={`badge ${s.cls}`}>{s.icon} {s.label}</span>;
    };

    const methodLabels = {
        gcash: '💚 GCash',
        maya: '💜 Maya',
        bank_transfer: '🏦 Bank',
        cash: '💵 Cash',
        other: '📋 Other'
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

    const pendingCount = deposits.filter(d => d.status === 'pending').length;
    const approvedTotal = deposits.filter(d => d.status === 'approved').reduce((s, d) => s + d.amount, 0);

    return (
        <div>
            {/* Stats */}
            <div className="stats-grid">
                <div className="stat-card gold">
                    <div className="stat-icon gold"><ArrowDownCircle size={24} /></div>
                    <div className="stat-info">
                        <h3>Pending Deposits</h3>
                        <div className="stat-value">{pendingCount}</div>
                        <div className="stat-change">{isApprover ? 'Awaiting your approval' : 'Awaiting admin approval'}</div>
                    </div>
                </div>
                <div className="stat-card green">
                    <div className="stat-icon green"><Wallet size={24} /></div>
                    <div className="stat-info">
                        <h3>Total Deposited</h3>
                        <div className="stat-value">₱{approvedTotal.toLocaleString()}</div>
                    </div>
                </div>
                <div className="stat-card gold">
                    <div className="stat-icon gold"><CreditCard size={24} /></div>
                    <div className="stat-info">
                        <h3>Total Requests</h3>
                        <div className="stat-value">{deposits.length}</div>
                    </div>
                </div>
            </div>

            {/* Action Bar */}
            <div className="card mb-3" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <div className="card-title">{isApprover ? 'Deposit Approval Queue' : 'My Deposit Requests'}</div>
                    <div className="card-subtitle">{isApprover ? 'Review and approve player deposits' : 'Request funds to your wallet'}</div>
                </div>
                {!isApprover && (
                    <button className="btn btn-gold" onClick={() => setShowRequestForm(!showRequestForm)}>
                        <Plus size={16} /> Request Deposit
                    </button>
                )}
            </div>

            {/* Request Form */}
            {showRequestForm && (
                <div className="card mb-3" style={{ borderColor: 'var(--gold)', borderStyle: 'solid' }}>
                    <div className="card-title mb-2">💰 New Deposit Request</div>
                    <form onSubmit={handleRequest}>
                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label">Amount (₱)</label>
                                <input
                                    className="form-input"
                                    type="number"
                                    min="1"
                                    placeholder="Enter amount"
                                    value={formData.amount}
                                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Payment Method</label>
                                <select
                                    className="form-select"
                                    value={formData.method}
                                    onChange={e => setFormData({ ...formData, method: e.target.value })}
                                >
                                    <option value="gcash">GCash</option>
                                    <option value="maya">Maya / PayMaya</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="cash">Cash</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label">Reference Number (optional)</label>
                                <input
                                    className="form-input"
                                    type="text"
                                    placeholder="e.g. GCash transaction #"
                                    value={formData.referenceNumber}
                                    onChange={e => setFormData({ ...formData, referenceNumber: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Notes (optional)</label>
                                <input
                                    className="form-input"
                                    type="text"
                                    placeholder="Any additional info"
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                            <button type="submit" className="btn btn-gold" disabled={submitting}>
                                {submitting ? 'Submitting...' : 'Submit Request'}
                            </button>
                            <button type="button" className="btn btn-ghost" onClick={() => setShowRequestForm(false)}>
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Deposits Table */}
            <div className="card">
                <div className="data-table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                {isApprover && <th>User</th>}
                                <th>Amount</th>
                                <th>Method</th>
                                <th>Reference</th>
                                <th>Status</th>
                                <th>Date</th>
                                {isApprover && <th>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {deposits.length === 0 ? (
                                <tr>
                                    <td colSpan={isApprover ? 7 : 5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                                        No deposit requests yet
                                    </td>
                                </tr>
                            ) : (
                                deposits.map(dep => (
                                    <tr key={dep._id}>
                                        {isApprover && (
                                            <td>
                                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{dep.userId?.fullName}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>@{dep.userId?.username}</div>
                                            </td>
                                        )}
                                        <td style={{ fontWeight: 700, color: 'var(--gold)', fontFamily: 'var(--font-display)' }}>
                                            ₱{dep.amount.toLocaleString()}
                                        </td>
                                        <td>{methodLabels[dep.method] || dep.method}</td>
                                        <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                                            {dep.referenceNumber || '—'}
                                        </td>
                                        <td>{getStatusBadge(dep.status)}</td>
                                        <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                            {new Date(dep.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        {isApprover && (
                                            <td>
                                                {dep.status === 'pending' && (
                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                        <button className="btn btn-sm btn-gold" onClick={() => handleApprove(dep._id, dep.amount)}>
                                                            <CheckCircle size={14} /> Approve
                                                        </button>
                                                        <button className="btn btn-sm btn-red" onClick={() => handleReject(dep._id)}>
                                                            <XCircle size={14} /> Reject
                                                        </button>
                                                    </div>
                                                )}
                                                {dep.status !== 'pending' && (
                                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                                        {dep.approvedBy?.fullName && `by ${dep.approvedBy.fullName}`}
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
