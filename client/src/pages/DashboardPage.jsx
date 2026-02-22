import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useSettings } from '../context/SettingsContext';
import { getDashboardStats, getActiveDraws, getHotNumbers, requestDeposit } from '../api';
import {
    TrendingUp, Users, Dices, DollarSign, Target, Award,
    Clock, ChevronRight, Flame, XCircle, Timer
} from 'lucide-react';
import Swal from 'sweetalert2';

export default function DashboardPage() {
    const { user } = useAuth();
    const { socket } = useSocket();
    const { settings } = useSettings();
    const [stats, setStats] = useState({});
    const [activeDraws, setActiveDraws] = useState([]);
    const [hotNumbers, setHotNumbers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState(null);
    const [nextDrawTime, setNextDrawTime] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (!settings || !settings.drawSchedule || settings.drawSchedule.length === 0) return;

        const updateCountdown = () => {
            const now = new Date();
            let nextDraw = null;
            let minDiff = Infinity;

            settings.drawSchedule.forEach(timeStr => {
                const [time, modifier] = timeStr.split(' ');
                let [hours, minutes] = time.split(':');
                hours = parseInt(hours, 10);
                if (hours === 12) hours = 0;
                if (modifier === 'PM' || modifier === 'pm') hours += 12;

                const drawDate = new Date();
                drawDate.setHours(hours, parseInt(minutes, 10), 0, 0);

                if (drawDate < now) {
                    drawDate.setDate(drawDate.getDate() + 1);
                }

                const diff = drawDate - now;
                if (diff < minDiff) {
                    minDiff = diff;
                    nextDraw = drawDate;
                }
            });

            if (nextDraw) {
                setNextDrawTime(nextDraw);
                const hrs = Math.floor((minDiff / (1000 * 60 * 60)) % 24);
                const mins = Math.floor((minDiff / 1000 / 60) % 60);
                const secs = Math.floor((minDiff / 1000) % 60);
                setTimeLeft({ hrs, mins, secs });
            }
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, [settings]);

    const [depositModal, setDepositModal] = useState(false);
    const [depositForm, setDepositForm] = useState({ amount: '', referenceNumber: '', paymentMethod: 'GCash' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleDepositSubmit = async (e) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            await requestDeposit({
                amount: parseFloat(depositForm.amount),
                referenceNumber: depositForm.referenceNumber,
                paymentMethod: depositForm.paymentMethod
            });

            setDepositModal(false);
            setDepositForm({ amount: '', referenceNumber: '', paymentMethod: 'GCash' });

            Swal.fire({
                title: 'Request Submitted!',
                text: 'Your deposit request has been sent for approval. Your balance will be updated once confirmed.',
                icon: 'success',
                background: '#1E1E1F',
                color: '#DA9101',
                confirmButtonColor: '#8B0001'
            });
            loadData();
        } catch (err) {
            Swal.fire('Error', err.response?.data?.message || 'Failed to submit request', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        if (!socket) return;

        socket.on('DRAW_RESULT', (data) => {
            Swal.fire({
                title: '🎰 DRAW RESULT!',
                html: `
          <div style="text-align:center">
            <p style="color:#A09C97;margin-bottom:16px">${data.label}</p>
            <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:16px">
              <div class="number-ball large">${data.winningNumbers.num1}</div>
              <span style="font-size:28px;color:#6B6762">—</span>
              <div class="number-ball large">${data.winningNumbers.num2}</div>
            </div>
            <p style="color:#00BFA5;font-size:18px;font-weight:700">${data.totalWinners} Winner(s) • ₱${data.totalPayout.toLocaleString()}</p>
          </div>
        `,
                background: '#1E1E1F',
                color: '#DA9101',
                confirmButtonColor: '#8B0001',
                confirmButtonText: 'Close',
                backdrop: 'rgba(139, 0, 1, 0.4)',
                showClass: { popup: 'swal2-show' }
            });
            loadData();
        });

        socket.on('LOCK_BETS', () => {
            loadData();
        });

        socket.on('balance_updated', (data) => {
            if (data.type === 'deposit_approved') {
                Swal.fire({
                    title: '💰 FUNDS READY!',
                    text: `Your deposit of ₱${data.amount.toLocaleString()} has been approved. Your new balance is ₱${data.newBalance.toLocaleString()}.`,
                    icon: 'success',
                    background: '#1E1E1F',
                    color: '#DA9101',
                    confirmButtonColor: '#00BFA5'
                });
            }
            loadData();
        });

        return () => {
            socket.off('DRAW_RESULT');
            socket.off('LOCK_BETS');
            socket.off('draw_status');
            socket.off('balance_updated');
        };
    }, [socket]);

    const loadData = async () => {
        try {
            const [statsRes, drawsRes, hotRes] = await Promise.all([
                getDashboardStats(),
                getActiveDraws(),
                getHotNumbers()
            ]);
            setStats(statsRes.data.stats);
            setActiveDraws(drawsRes.data.draws);
            setHotNumbers(hotRes.data.hotNumbers || []);
        } catch (err) {
            console.error('Dashboard load error:', err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const map = {
            upcoming: 'badge-gray',
            open: 'badge-green',
            locked: 'badge-gold',
            drawn: 'badge-red',
            settled: 'badge-red'
        };
        return <span className={`badge ${map[status] || 'badge-gray'}`}>
            <span className={`status-dot ${status}`}></span>
            {status.toUpperCase()}
        </span>;
    };

    if (loading) {
        return (
            <div>
                <div className="stats-grid">
                    {[1, 2, 3, 4].map(i => <div key={i} className="shimmer" style={{ height: '120px' }} />)}
                </div>
            </div>
        );
    }

    const renderAdminStats = () => (
        <div className="stats-grid">
            <div className="stat-card gold">
                <div className="stat-icon gold"><DollarSign size={24} /></div>
                <div className="stat-info">
                    <h3>Today's Collections</h3>
                    <div className="stat-value">₱{(stats.todayCollections || 0).toLocaleString()}</div>
                    <div className="stat-change up">↑ Net: ₱{(stats.netRevenue || 0).toLocaleString()}</div>
                </div>
            </div>
            <div className="stat-card green">
                <div className="stat-icon green"><Dices size={24} /></div>
                <div className="stat-info">
                    <h3>Today's Bets</h3>
                    <div className="stat-value">{stats.todayBets || 0}</div>
                    <div className="stat-change up">{stats.activeDraws || 0} active draws</div>
                </div>
            </div>
            <div className="stat-card red">
                <div className="stat-icon red"><TrendingUp size={24} /></div>
                <div className="stat-info">
                    <h3>Today's Payouts</h3>
                    <div className="stat-value">₱{(stats.todayPayouts || 0).toLocaleString()}</div>
                </div>
            </div>
            <div className="stat-card gold">
                <div className="stat-icon gold"><Users size={24} /></div>
                <div className="stat-info">
                    <h3>Total Users</h3>
                    <div className="stat-value">{stats.totalUsers || 0}</div>
                    <div className="stat-change up">{stats.activeKubradors || 0} active kubradors</div>
                </div>
            </div>
        </div>
    );

    const renderKubradorStats = () => (
        <div className="stats-grid">
            <div className="stat-card gold">
                <div className="stat-icon gold"><DollarSign size={24} /></div>
                <div className="stat-info">
                    <h3>Today's Collections</h3>
                    <div className="stat-value">₱{(stats.todayCollections || 0).toLocaleString()}</div>
                </div>
            </div>
            <div className="stat-card green">
                <div className="stat-icon green"><Dices size={24} /></div>
                <div className="stat-info">
                    <h3>Today's Bets</h3>
                    <div className="stat-value">{stats.todayBets || 0}</div>
                </div>
            </div>
            <div className="stat-card gold">
                <div className="stat-icon gold"><Award size={24} /></div>
                <div className="stat-info">
                    <h3>Today's Commission</h3>
                    <div className="stat-value">₱{(stats.todayCommissions || 0).toLocaleString()}</div>
                </div>
            </div>
            <div className="stat-card green">
                <div className="stat-icon green"><Target size={24} /></div>
                <div className="stat-info">
                    <h3>Balance</h3>
                    <div className="stat-value">₱{(stats.balance || 0).toLocaleString()}</div>
                </div>
            </div>
            <div className="stat-card red" style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => setDepositModal(true)}>
                <div className="stat-icon red"><DollarSign size={24} /></div>
                <div className="stat-info">
                    <h3>Deposit Funds</h3>
                    <div className="stat-value" style={{ fontSize: '18px' }}>ADD CREDIT</div>
                </div>
            </div>
        </div>
    );

    const renderCaboStats = () => (
        <div className="stats-grid">
            <div className="stat-card gold">
                <div className="stat-icon gold"><Users size={24} /></div>
                <div className="stat-info">
                    <h3>Team Size</h3>
                    <div className="stat-value">{stats.teamSize || 0}</div>
                </div>
            </div>
            <div className="stat-card green">
                <div className="stat-icon green"><Dices size={24} /></div>
                <div className="stat-info">
                    <h3>Today's Bets</h3>
                    <div className="stat-value">{stats.todayBets || 0}</div>
                </div>
            </div>
            <div className="stat-card gold">
                <div className="stat-icon gold"><DollarSign size={24} /></div>
                <div className="stat-info">
                    <h3>Today's Collections</h3>
                    <div className="stat-value">₱{(stats.todayCollections || 0).toLocaleString()}</div>
                </div>
            </div>
            <div className="stat-card green">
                <div className="stat-icon green"><Target size={24} /></div>
                <div className="stat-info">
                    <h3>Balance</h3>
                    <div className="stat-value">₱{(stats.balance || 0).toLocaleString()}</div>
                </div>
            </div>
        </div>
    );



    const renderPlayerStats = () => (
        <div style={{ marginBottom: '24px' }}>
            <div className="stats-grid">
                <div className="stat-card gold">
                    <div className="stat-icon gold"><DollarSign size={24} /></div>
                    <div className="stat-info">
                        <h3>Wallet Balance</h3>
                        <div className="stat-value">₱{(stats.balance || 0).toLocaleString()}</div>
                    </div>
                </div>
                <div className="stat-card green">
                    <div className="stat-icon green"><Target size={24} /></div>
                    <div className="stat-info">
                        <h3>Pending Deposits</h3>
                        <div className="stat-value">{stats.pendingDeposits || 0}</div>
                    </div>
                </div>
                <div className="stat-card gold">
                    <div className="stat-icon gold"><TrendingUp size={24} /></div>
                    <div className="stat-info">
                        <h3>Total Deposited</h3>
                        <div className="stat-value">₱{(stats.totalDeposited || 0).toLocaleString()}</div>
                    </div>
                </div>
                <div className="stat-card red" style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => setDepositModal(true)}>
                    <div className="stat-icon red"><DollarSign size={24} /></div>
                    <div className="stat-info">
                        <h3>Deposit Funds</h3>
                        <div className="stat-value" style={{ fontSize: '18px' }}>ADD CREDIT</div>
                    </div>
                </div>
            </div>
        </div>
    );


    return (
        <div>
            {depositModal && (
                <div className="modal-overlay" onClick={() => setDepositModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', margin: 'auto' }}>
                        <div className="card-header" style={{ marginBottom: '20px' }}>
                            <div>
                                <h2 className="card-title">Deposit Funds</h2>
                                <p className="card-subtitle">Request credit to your wallet</p>
                            </div>
                            <XCircle size={24} className="close-btn" onClick={() => setDepositModal(false)} />
                        </div>

                        <div className="grid-2" style={{ gap: '20px' }}>
                            {/* Payment Instructions */}
                            <div className="instruction-card">
                                <h4 style={{ color: 'var(--gold)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Award size={18} /> Payment Instructions
                                </h4>
                                <div className="instruction-item">
                                    <div className="label">GCash Number</div>
                                    <div className="value">0912 345 6789</div>
                                </div>
                                <div className="instruction-item">
                                    <div className="label">PayMaya</div>
                                    <div className="value">0912 345 6789</div>
                                </div>
                                <div className="instruction-item">
                                    <div className="label">Bank Transfer (BPI)</div>
                                    <div className="value">1234-5678-90</div>
                                </div>
                                <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                    * Please send the exact amount and save your reference number for verification.
                                </div>
                            </div>

                            {/* Deposit Form */}
                            <form onSubmit={handleDepositSubmit}>
                                <div className="form-group">
                                    <label>Amount (PHP)</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        placeholder="Min: 100"
                                        required
                                        min="1"
                                        value={depositForm.amount}
                                        onChange={e => setDepositForm({ ...depositForm, amount: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Payment Method</label>
                                    <select
                                        className="form-control"
                                        value={depositForm.paymentMethod}
                                        onChange={e => setDepositForm({ ...depositForm, paymentMethod: e.target.value })}
                                    >
                                        <option value="GCash">GCash</option>
                                        <option value="PayMaya">PayMaya</option>
                                        <option value="Bank Transfer">Bank Transfer</option>
                                        <option value="Cash">Cash</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Reference Number</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="G-XXXX-XXXXX"
                                        required
                                        value={depositForm.referenceNumber}
                                        onChange={e => setDepositForm({ ...depositForm, referenceNumber: e.target.value })}
                                    />
                                </div>
                                <button type="submit" className="btn btn-red w-full" disabled={isSubmitting}>
                                    {isSubmitting ? 'Submitting...' : 'Submit Deposit Request'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                .modal-overlay {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.85);
                    display: flex; align-items: center; justify-content: center;
                    z-index: 1000;
                    backdrop-filter: blur(4px);
                }
                .modal-content {
                    background: #1A1A1B;
                    border: 1px solid var(--border-subtle);
                    border-radius: var(--radius-lg);
                    padding: 30px;
                    width: 90%;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.5);
                }
                .instruction-card {
                    background: var(--bg-elevated);
                    border-radius: var(--radius-md);
                    padding: 20px;
                    border: 1px solid rgba(218, 145, 1, 0.1);
                }
                .instruction-item {
                    margin-bottom: 12px;
                }
                .instruction-item .label {
                    font-size: 11px;
                    color: var(--text-muted);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .instruction-item .value {
                    font-family: 'Outfit', sans-serif;
                    font-weight: 700;
                    color: var(--text-primary);
                    font-size: 16px;
                }
                .close-btn {
                    cursor: pointer;
                    color: var(--text-muted);
                    transition: color 0.2s;
                }
                .close-btn:hover {
                    color: var(--red-light);
                }
                .btn-red {
                    background: linear-gradient(135deg, #B71C1C, #8B0000);
                    color: white;
                    border: none;
                    padding: 12px;
                    border-radius: 8px;
                    font-weight: 700;
                    cursor: pointer;
                    box-shadow: 0 4px 12px rgba(139, 0, 0, 0.3);
                }
                .btn-red:hover {
                    filter: brightness(1.1);
                    transform: translateY(-1px);
                }
                .form-group label {
                    display: block;
                    margin-bottom: 8px;
                    color: var(--text-muted);
                    font-size: 13px;
                }
                .form-control {
                    width: 100%;
                    background: var(--bg-body);
                    border: 1px solid var(--border-subtle);
                    padding: 10px 12px;
                    border-radius: 6px;
                    color: white;
                    margin-bottom: 16px;
                }
            `}} />

            {/* Draw Countdown Section */}
            {timeLeft && (
                <div className="card mb-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: '-30px', right: '-30px', opacity: 0.05, pointerEvents: 'none' }}>
                        <Timer size={140} color="var(--gold)" />
                    </div>
                    <div style={{ textAlign: 'center', padding: '16px' }}>
                        <h3 style={{ color: 'var(--gold)', marginBottom: '16px', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold' }}>
                            Next Draw Countdown • {nextDrawTime && nextDrawTime.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                        </h3>
                        <div className="countdown-display" style={{ display: 'flex', justifyContent: 'center', gap: '20px', alignItems: 'center' }}>
                            <div className="countdown-segment" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div className="count-value" style={{ fontSize: '36px', fontWeight: '900', fontFamily: 'monospace', textShadow: '0 0 10px rgba(218,145,1,0.5)', color: 'var(--text-primary)' }}>{String(timeLeft.hrs).padStart(2, '0')}</div>
                                <div className="count-label" style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px' }}>HRS</div>
                            </div>
                            <div className="countdown-separator" style={{ fontSize: '32px', color: 'var(--text-muted)' }}>:</div>
                            <div className="countdown-segment" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div className="count-value" style={{ fontSize: '36px', fontWeight: '900', fontFamily: 'monospace', textShadow: '0 0 10px rgba(218,145,1,0.5)', color: 'var(--text-primary)' }}>{String(timeLeft.mins).padStart(2, '0')}</div>
                                <div className="count-label" style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px' }}>MINS</div>
                            </div>
                            <div className="countdown-separator" style={{ fontSize: '32px', color: 'var(--text-muted)' }}>:</div>
                            <div className="countdown-segment" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div className="count-value" style={{ fontSize: '36px', fontWeight: '900', fontFamily: 'monospace', textShadow: '0 0 10px rgba(218,145,1,0.5)', color: 'var(--red-light)' }}>{String(timeLeft.secs).padStart(2, '0')}</div>
                                <div className="count-label" style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px' }}>SECS</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Grid */}
            {(user.role === 'admin' || user.role === 'bankero') && renderAdminStats()}
            {user.role === 'kubrador' && renderKubradorStats()}
            {user.role === 'cabo' && renderCaboStats()}
            {user.role === 'player' && renderPlayerStats()}

            <div className="grid-2">
                {/* Active Draws */}
                <div className="card">
                    <div className="card-header">
                        <div>
                            <div className="card-title">Today's Draws</div>
                            <div className="card-subtitle">Active draw schedule</div>
                        </div>
                        <Clock size={20} style={{ color: 'var(--gold)' }} />
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
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                        {new Date(draw.scheduledTime).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                                        {draw.totalBets > 0 && ` • ${draw.totalBets} bets • ₱${(draw.totalBetAmount || 0).toLocaleString()}`}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {getStatusBadge(draw.status)}
                                    <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Hot Numbers */}
                <div className="card">
                    <div className="card-header">
                        <div>
                            <div className="card-title">Hot Combinations</div>
                            <div className="card-subtitle">Most popular number pairs (30 days)</div>
                        </div>
                        <Flame size={20} style={{ color: 'var(--red-light)' }} />
                    </div>
                    {hotNumbers.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                            No betting data yet
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {hotNumbers.slice(0, 8).map((item, i) => (
                                <div key={i} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', width: '24px' }}>#{i + 1}</span>
                                        <div className="number-pair">
                                            <span className="number-ball" style={{ width: '32px', height: '32px', fontSize: '13px' }}>{item._id.num1}</span>
                                            <span className="separator">-</span>
                                            <span className="number-ball" style={{ width: '32px', height: '32px', fontSize: '13px' }}>{item._id.num2}</span>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gold)' }}>{item.count} bets</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>₱{item.totalAmount.toLocaleString()}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
