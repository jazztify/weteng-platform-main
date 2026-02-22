import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDashboardStats, getDeposits, requestDeposit, getActiveDraws } from '../api';
import {
    Wallet, ArrowDownCircle, Plus, Clock, CheckCircle,
    CalendarClock, TrendingUp, CreditCard, History
} from 'lucide-react';
import Swal from 'sweetalert2';

export default function PlayerWalletPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState({});
    const [deposits, setDeposits] = useState([]);
    const [activeDraws, setActiveDraws] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showDeposit, setShowDeposit] = useState(false);
    const [depositForm, setDepositForm] = useState({ amount: '', method: 'gcash', referenceNumber: '' });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [statsRes, depositsRes, drawsRes] = await Promise.all([
                getDashboardStats(),
                getDeposits(),
                getActiveDraws()
            ]);
            setStats(statsRes.data.stats);
            setDeposits(depositsRes.data.deposits);
            setActiveDraws(drawsRes.data.draws);
        } catch (err) {
            console.error('Wallet data error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeposit = async (e) => {
        e.preventDefault();
        if (!depositForm.amount || parseFloat(depositForm.amount) < 1) return;
        setSubmitting(true);
        try {
            await requestDeposit({
                amount: parseFloat(depositForm.amount),
                method: depositForm.method,
                referenceNumber: depositForm.referenceNumber
            });
            Swal.fire({
                icon: 'success',
                title: 'Deposit Requested!',
                text: `₱${parseFloat(depositForm.amount).toLocaleString()} pending approval.`,
                background: '#1E1E1F', color: '#DA9101', confirmButtonColor: '#DA9101'
            });
            setDepositForm({ amount: '', method: 'gcash', referenceNumber: '' });
            setShowDeposit(false);
            loadData();
        } catch (err) {
            Swal.fire({
                icon: 'error', title: 'Error',
                text: err.response?.data?.message || 'Failed to request deposit',
                background: '#1E1E1F', color: '#DA9101'
            });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div>
                <div className="stats-grid">
                    {[1, 2, 3, 4].map(i => <div key={i} className="shimmer" style={{ height: '140px' }} />)}
                </div>
            </div>
        );
    }

    const getStatusBadge = (status) => {
        const map = {
            pending: { cls: 'badge-gold', label: 'PENDING' },
            approved: { cls: 'badge-green', label: 'APPROVED' },
            rejected: { cls: 'badge-red', label: 'REJECTED' },
        };
        const s = map[status] || map.pending;
        return <span className={`badge ${s.cls}`}>{s.label}</span>;
    };

    return (
        <div>
            {/* Wallet Overview Card */}
            <div className="wallet-hero-card mb-3">
                <div className="wallet-hero-inner">
                    <div className="wallet-hero-left">
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>
                            Available Balance
                        </div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '48px', fontWeight: 900, color: 'var(--gold)', lineHeight: 1 }}>
                            ₱{(user?.balance || 0).toLocaleString()}
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '12px' }}>
                            {user?.fullName} • {user?.role?.toUpperCase()}
                        </div>
                    </div>
                    <div className="wallet-hero-right">
                        <button className="btn btn-gold btn-lg" onClick={() => setShowDeposit(!showDeposit)}>
                            <Plus size={20} /> Deposit
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Row */}
            <div className="stats-grid">
                <div className="stat-card gold">
                    <div className="stat-icon gold"><TrendingUp size={24} /></div>
                    <div className="stat-info">
                        <h3>Total Deposited</h3>
                        <div className="stat-value">₱{(stats.totalDeposited || 0).toLocaleString()}</div>
                    </div>
                </div>
                <div className="stat-card green">
                    <div className="stat-icon green"><CreditCard size={24} /></div>
                    <div className="stat-info">
                        <h3>Deposits Made</h3>
                        <div className="stat-value">{stats.depositCount || 0}</div>
                    </div>
                </div>
                <div className="stat-card gold">
                    <div className="stat-icon gold"><Clock size={24} /></div>
                    <div className="stat-info">
                        <h3>Pending Deposits</h3>
                        <div className="stat-value">{stats.pendingDeposits || 0}</div>
                    </div>
                </div>
            </div>

            {/* Deposit Form */}
            {showDeposit && (
                <div className="card mb-3" style={{ borderColor: 'var(--gold)', borderWidth: '1px', borderStyle: 'solid' }}>
                    <div className="card-title mb-2">💰 Fund Your Wallet</div>
                    <form onSubmit={handleDeposit}>
                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label">Amount (₱)</label>
                                <input
                                    className="form-input"
                                    type="number" min="1" step="1"
                                    placeholder="Enter deposit amount"
                                    value={depositForm.amount}
                                    onChange={e => setDepositForm({ ...depositForm, amount: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Payment Method</label>
                                <select
                                    className="form-select"
                                    value={depositForm.method}
                                    onChange={e => setDepositForm({ ...depositForm, method: e.target.value })}
                                >
                                    <option value="gcash">GCash</option>
                                    <option value="maya">Maya / PayMaya</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="cash">Cash</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Reference / Transaction # (optional)</label>
                            <input
                                className="form-input"
                                placeholder="e.g. GCash ref #12345"
                                value={depositForm.referenceNumber}
                                onChange={e => setDepositForm({ ...depositForm, referenceNumber: e.target.value })}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button type="submit" className="btn btn-gold" disabled={submitting}>
                                {submitting ? 'Submitting...' : 'Request Deposit'}
                            </button>
                            <button type="button" className="btn btn-ghost" onClick={() => setShowDeposit(false)}>Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid-2">
                {/* Recent Deposits */}
                <div className="card">
                    <div className="card-header">
                        <div>
                            <div className="card-title">Recent Deposits</div>
                            <div className="card-subtitle">Your deposit history</div>
                        </div>
                        <History size={20} style={{ color: 'var(--gold)' }} />
                    </div>
                    {deposits.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                            No deposits yet. Click "Deposit" above to get started.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {deposits.slice(0, 6).map(dep => (
                                <div key={dep._id} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--gold)' }}>
                                            ₱{dep.amount.toLocaleString()}
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                            {dep.method?.toUpperCase()} • {new Date(dep.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                                        </div>
                                    </div>
                                    {getStatusBadge(dep.status)}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Today's Draws */}
                <div className="card">
                    <div className="card-header">
                        <div>
                            <div className="card-title">Today's Draws</div>
                            <div className="card-subtitle">Active draw schedule</div>
                        </div>
                        <CalendarClock size={20} style={{ color: 'var(--gold)' }} />
                    </div>
                    {activeDraws.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                            No active draws today
                        </div>
                    ) : (
                        activeDraws.map(draw => (
                            <div key={draw._id} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)',
                                marginBottom: '10px', border: '1px solid var(--border-subtle)'
                            }}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '14px', textTransform: 'capitalize', color: 'var(--text-primary)' }}>
                                        {draw.drawType} Draw
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                        {new Date(draw.scheduledTime).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                                <span className={`badge ${draw.status === 'open' ? 'badge-green' : 'badge-gray'}`}>
                                    {draw.status.toUpperCase()}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
