import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { getDraws, createDraw, openDraw, lockDraw, startDrawing } from '../api';
import { CalendarClock, Play, Lock, Zap, Plus, RefreshCw, Radio } from 'lucide-react';
import Swal from 'sweetalert2';

export default function DrawsPage() {
    const { user } = useAuth();
    const { socket } = useSocket();
    const navigate = useNavigate();
    const [draws, setDraws] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDraws();
    }, []);

    // Listen for real-time draw status changes
    useEffect(() => {
        if (!socket) return;

        const handleDrawStatus = () => {
            loadDraws();
        };

        socket.on('draw_status', handleDrawStatus);
        socket.on('DRAW_STARTING', handleDrawStatus);
        socket.on('DRAW_RESULT', handleDrawStatus);
        socket.on('LOCK_BETS', handleDrawStatus);

        return () => {
            socket.off('draw_status', handleDrawStatus);
            socket.off('DRAW_STARTING', handleDrawStatus);
            socket.off('DRAW_RESULT', handleDrawStatus);
            socket.off('LOCK_BETS', handleDrawStatus);
        };
    }, [socket]);

    const loadDraws = async () => {
        try {
            const res = await getDraws({ limit: 30 });
            setDraws(res.data.draws || []);
        } catch (err) {
            console.error('Failed to load draws:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateDraw = async () => {
        const { value: formValues } = await Swal.fire({
            title: 'Create New Draw',
            html: `
        <div style="text-align:left">
          <label style="display:block;margin-bottom:4px;color:#A09C97;font-size:13px">Draw Type</label>
          <select id="swal-drawType" class="swal2-input" style="background:#141416;color:#F2EDE7;border:1px solid rgba(218,145,1,0.3);width:100%">
            <option value="morning">Morning (11:00 AM)</option>
            <option value="noon">Noon (2:00 PM)</option>
            <option value="afternoon">Afternoon (5:00 PM)</option>
          </select>
          <label style="display:block;margin-top:12px;margin-bottom:4px;color:#A09C97;font-size:13px">Date</label>
          <input id="swal-drawDate" type="date" class="swal2-input" value="${new Date().toISOString().split('T')[0]}" style="background:#141416;color:#F2EDE7;border:1px solid rgba(218,145,1,0.3);width:100%" />
        </div>
      `,
            background: '#1E1E1F',
            color: '#DA9101',
            confirmButtonColor: '#DA9101',
            confirmButtonText: 'Create Draw',
            showCancelButton: true,
            cancelButtonColor: '#333',
            preConfirm: () => {
                const drawType = document.getElementById('swal-drawType').value;
                const drawDate = document.getElementById('swal-drawDate').value;
                return { drawType, drawDate };
            }
        });

        if (!formValues) return;

        const timeMap = { morning: 11, noon: 14, afternoon: 17 };
        const scheduledTime = new Date(formValues.drawDate);
        scheduledTime.setHours(timeMap[formValues.drawType], 0, 0, 0);

        try {
            await createDraw({
                drawType: formValues.drawType,
                drawDate: formValues.drawDate,
                scheduledTime: scheduledTime.toISOString()
            });
            Swal.fire({ title: 'Draw Created!', icon: 'success', timer: 1500, showConfirmButton: false, background: '#1E1E1F', color: '#DA9101' });
            loadDraws();
        } catch (err) {
            Swal.fire({ title: 'Error', text: err.response?.data?.message || 'Failed', icon: 'error', background: '#1E1E1F', color: '#DA9101', confirmButtonColor: '#8B0001' });
        }
    };

    const handleAction = async (drawId, action) => {
        const actions = {
            open: { fn: openDraw, title: 'Open Betting?', text: 'This will allow kubradors to place bets.', btn: 'Open Market' },
            lock: { fn: lockDraw, title: 'Lock Bets?', text: 'No more bets will be accepted!', btn: 'Lock Bets' }
        };

        const cfg = actions[action];
        const confirm = await Swal.fire({
            title: cfg.title,
            text: cfg.text,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: cfg.btn,
            confirmButtonColor: '#DA9101',
            cancelButtonColor: '#333',
            background: '#1E1E1F',
            color: '#DA9101'
        });

        if (!confirm.isConfirmed) return;

        try {
            const res = await cfg.fn(drawId);
            Swal.fire({
                title: 'Success!',
                text: res.data.message,
                icon: 'success',
                timer: 2000,
                showConfirmButton: false,
                background: '#1E1E1F',
                color: '#DA9101'
            });
            loadDraws();
        } catch (err) {
            Swal.fire({ title: 'Error', text: err.response?.data?.message || 'Failed', icon: 'error', background: '#1E1E1F', color: '#DA9101', confirmButtonColor: '#8B0001' });
        }
    };

    // Handle the "Draw" button on a locked session → transition to DRAWING and navigate to War Room
    const handleStartDrawing = async (draw) => {
        const confirm = await Swal.fire({
            title: 'Enter the War Room?',
            html: `
                <div style="text-align:center; padding: 8px 0;">
                    <p style="color:#F2EDE7;font-size:15px;margin-bottom:10px;">You are about to start the draw for:</p>
                    <p style="color:#DA9101;font-weight:700;font-size:20px;margin-bottom:12px;">${draw.label}</p>
                    <div style="display:flex;justify-content:center;gap:20px;margin-bottom:10px;">
                        <div style="text-align:center;">
                            <span style="color:#A09C97;font-size:12px;display:block;">Total Bets</span>
                            <span style="color:#F2EDE7;font-weight:700;font-size:18px;">${draw.totalBets || 0}</span>
                        </div>
                        <div style="text-align:center;">
                            <span style="color:#A09C97;font-size:12px;display:block;">Bet Pool</span>
                            <span style="color:#DA9101;font-weight:700;font-size:18px;">₱${(draw.totalBetAmount || 0).toLocaleString()}</span>
                        </div>
                    </div>
                    <p style="color:#ff6b6b;font-size:13px;margin-top:12px;">⚠ Status will change to DRAWING and other admins will be notified.</p>
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: '🔥 Enter War Room',
            confirmButtonColor: '#8B0001',
            cancelButtonText: 'Cancel',
            cancelButtonColor: '#333',
            background: '#1E1E1F',
            color: '#DA9101'
        });

        if (!confirm.isConfirmed) return;

        try {
            await startDrawing(draw._id);
            // Navigate to War Room with the draw ID
            navigate(`/admin/war-room?drawId=${draw._id}`);
        } catch (err) {
            Swal.fire({ title: 'Error', text: err.response?.data?.message || 'Failed to start drawing', icon: 'error', background: '#1E1E1F', color: '#DA9101', confirmButtonColor: '#8B0001' });
        }
    };

    const getStatusBadge = (status) => {
        const map = {
            upcoming: 'badge-gray',
            open: 'badge-green',
            locked: 'badge-gold',
            drawing: 'badge-drawing',
            drawn: 'badge-red',
            settled: 'badge-red',
            cancelled: 'badge-gray'
        };
        return <span className={`badge ${map[status] || 'badge-gray'}`}>
            <span className={`status-dot ${status}`}></span>
            {status.toUpperCase()}
            {status === 'drawing' && <Radio size={12} style={{ marginLeft: '4px', animation: 'pulse 1.5s ease-in-out infinite' }} />}
        </span>;
    };

    if (loading) {
        return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="spinner"></div></div>;
    }

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700 }}>Draw Management</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Manage bolahan schedule and execution</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn btn-ghost btn-sm" onClick={loadDraws}><RefreshCw size={14} /> Refresh</button>
                    {(user.role === 'admin') && (
                        <button className="btn btn-gold" onClick={handleCreateDraw}><Plus size={16} /> New Draw</button>
                    )}
                </div>
            </div>

            {/* Draws Table */}
            <div className="data-table-wrapper">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Draw</th>
                            <th>Date</th>
                            <th>Scheduled</th>
                            <th>Status</th>
                            <th>Total Bets</th>
                            <th>Collections</th>
                            <th>Result</th>
                            <th>Payout</th>
                            {user.role === 'admin' && <th>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {draws.map(draw => (
                            <tr key={draw._id}>
                                <td style={{ fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                                    {draw.drawType}
                                </td>
                                <td>{new Date(draw.drawDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</td>
                                <td>{new Date(draw.scheduledTime).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}</td>
                                <td>{getStatusBadge(draw.status)}</td>
                                <td>{draw.totalBets || 0}</td>
                                <td style={{ color: 'var(--gold)', fontWeight: 600 }}>₱{(draw.totalBetAmount || 0).toLocaleString()}</td>
                                <td>
                                    {draw.winningNumbers ? (
                                        <div className="number-pair">
                                            <span className="number-ball" style={{ width: '32px', height: '32px', fontSize: '12px' }}>{draw.winningNumbers.num1}</span>
                                            <span className="separator">-</span>
                                            <span className="number-ball" style={{ width: '32px', height: '32px', fontSize: '12px' }}>{draw.winningNumbers.num2}</span>
                                        </div>
                                    ) : (
                                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                                    )}
                                </td>
                                <td style={{ color: draw.totalPayout > 0 ? 'var(--green-light)' : 'var(--text-muted)', fontWeight: draw.totalPayout > 0 ? 600 : 400 }}>
                                    {draw.totalPayout > 0 ? `₱${draw.totalPayout.toLocaleString()} (${draw.totalWinners}W)` : '—'}
                                </td>
                                {user.role === 'admin' && (
                                    <td>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            {draw.status === 'upcoming' && (
                                                <button className="btn btn-sm btn-outline" onClick={() => handleAction(draw._id, 'open')}>
                                                    <Play size={12} /> Open
                                                </button>
                                            )}
                                            {draw.status === 'open' && (
                                                <button className="btn btn-sm btn-gold" onClick={() => handleAction(draw._id, 'lock')}>
                                                    <Lock size={12} /> Lock
                                                </button>
                                            )}
                                            {draw.status === 'locked' && (
                                                <button className="btn btn-sm btn-red" onClick={() => handleStartDrawing(draw)} id={`start-drawing-${draw._id}`}>
                                                    <Zap size={12} /> Draw
                                                </button>
                                            )}
                                            {draw.status === 'drawing' && (
                                                <button
                                                    className="btn btn-sm btn-drawing"
                                                    onClick={() => navigate(`/admin/war-room?drawId=${draw._id}`)}
                                                    id={`enter-warroom-${draw._id}`}
                                                >
                                                    <Radio size={12} /> War Room
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {draws.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                    <CalendarClock size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                    <p>No draws found. Create one to get started.</p>
                </div>
            )}
        </div>
    );
}
