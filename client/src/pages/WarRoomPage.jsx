import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { getDraws, executeDraw, getDrawWinners } from '../api';
import { Flame, RefreshCw, Crown, Skull, Trophy, Target, AlertTriangle, History, Send, Hash, CheckCircle2 } from 'lucide-react';
import Swal from 'sweetalert2';

export default function WarRoomPage() {
    const { user } = useAuth();
    const { socket } = useSocket();
    const [draws, setDraws] = useState([]);
    const [selectedDraw, setSelectedDraw] = useState(null);
    const [loading, setLoading] = useState(true);

    // Manual input state
    const [num1, setNum1] = useState('');
    const [num2, setNum2] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Winner state
    const [winners, setWinners] = useState(null);
    const [winnersLoading, setWinnersLoading] = useState(false);

    // Draw result state (after submission)
    const [drawResult, setDrawResult] = useState(null);

    useEffect(() => {
        loadDraws();
    }, []);

    // Listen for real-time draw results
    useEffect(() => {
        if (!socket) return;
        const handleDrawResult = () => {
            loadDraws();
        };
        socket.on('DRAW_RESULT', handleDrawResult);
        return () => socket.off('DRAW_RESULT', handleDrawResult);
    }, [socket]);

    const loadDraws = async () => {
        try {
            const res = await getDraws({ limit: 50 });
            setDraws(res.data.draws || []);
        } catch (err) {
            console.error('Failed to load draws:', err);
        } finally {
            setLoading(false);
        }
    };

    // Get locked draws that can be executed
    const lockedDraws = draws.filter(d => d.status === 'locked');
    // Get settled draws for history
    const settledDraws = draws.filter(d => d.status === 'settled').sort((a, b) => new Date(b.settledAt || b.updatedAt) - new Date(a.settledAt || a.updatedAt));

    const loadWinners = async (drawId) => {
        setWinnersLoading(true);
        try {
            const res = await getDrawWinners(drawId);
            setWinners(res.data);
        } catch (err) {
            console.error('Failed to load winners:', err);
            setWinners({ winners: [], totalWinners: 0, totalPayout: 0 });
        } finally {
            setWinnersLoading(false);
        }
    };

    const handleSubmitDraw = async () => {
        // Validate inputs
        const n1 = parseInt(num1);
        const n2 = parseInt(num2);

        if (!selectedDraw) {
            Swal.fire({
                title: 'No Draw Selected',
                text: 'Please select a locked draw first.',
                icon: 'warning',
                background: '#1a0a0a',
                color: '#DA9101',
                confirmButtonColor: '#DA9101'
            });
            return;
        }

        if (isNaN(n1) || isNaN(n2) || n1 < 1 || n1 > 37 || n2 < 1 || n2 > 37) {
            Swal.fire({
                title: 'Invalid Numbers',
                text: 'Both numbers must be between 1 and 37.',
                icon: 'error',
                background: '#1a0a0a',
                color: '#DA9101',
                confirmButtonColor: '#8B0001'
            });
            return;
        }

        // Confirmation pop-up with total bet pool
        const totalPool = selectedDraw.totalBetAmount || 0;
        const totalBets = selectedDraw.totalBets || 0;

        const confirm = await Swal.fire({
            title: '⚠️ Confirm Draw Submission',
            html: `
                <div style="text-align:center; padding: 8px 0;">
                    <div style="display:flex; align-items:center; justify-content:center; gap:16px; margin-bottom:20px;">
                        <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#DA9101,#F5B731);display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;color:#1a0a0a;box-shadow:0 0 25px rgba(218,145,1,0.5);">${n1}</div>
                        <span style="color:#DA9101;font-size:28px;font-weight:700;">—</span>
                        <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#DA9101,#F5B731);display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;color:#1a0a0a;box-shadow:0 0 25px rgba(218,145,1,0.5);">${n2}</div>
                    </div>
                    <p style="color:#F2EDE7;font-size:15px;margin-bottom:6px;">Are you sure? This will calculate winners for all</p>
                    <p style="color:#DA9101;font-size:28px;font-weight:800;margin:8px 0;">₱${totalPool.toLocaleString()}</p>
                    <p style="color:#A09C97;font-size:13px;">in bets (${totalBets} total bet${totalBets !== 1 ? 's' : ''}).</p>
                    <p style="color:#DA9101;font-weight:600;margin-top:12px;font-size:14px;">${selectedDraw.label}</p>
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: '✅ Submit Draw Result',
            confirmButtonColor: '#DA9101',
            cancelButtonText: 'Cancel',
            cancelButtonColor: '#333',
            background: '#1a0a0a',
            color: '#DA9101',
            customClass: {
                popup: 'swal-dark-popup'
            }
        });

        if (!confirm.isConfirmed) return;

        setSubmitting(true);
        try {
            const res = await executeDraw(selectedDraw._id, { num1: n1, num2: n2 });
            const result = res.data.result;
            setDrawResult(result);

            // Show success
            Swal.fire({
                title: '🎯 Draw Submitted!',
                html: `
                    <div style="text-align:center;">
                        <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin:16px 0;">
                            <div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#DA9101,#F5B731);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:#1a0a0a;">${result.winningNumbers.num1}</div>
                            <span style="color:#DA9101;font-size:24px;font-weight:700;">—</span>
                            <div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#DA9101,#F5B731);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:#1a0a0a;">${result.winningNumbers.num2}</div>
                        </div>
                        <p style="color:#4ade80;font-size:16px;font-weight:600;">${result.totalWinners} Winner${result.totalWinners !== 1 ? 's' : ''} · ₱${result.totalPayout.toLocaleString()} Payout</p>
                    </div>
                `,
                icon: 'success',
                timer: 4000,
                showConfirmButton: true,
                confirmButtonColor: '#DA9101',
                background: '#1a0a0a',
                color: '#DA9101'
            });

            // Load winners and refresh lists
            await loadWinners(selectedDraw._id);
            await loadDraws();
            setNum1('');
            setNum2('');

        } catch (err) {
            Swal.fire({
                title: 'Draw Failed',
                text: err.response?.data?.message || 'Failed to submit draw result',
                icon: 'error',
                background: '#1a0a0a',
                color: '#DA9101',
                confirmButtonColor: '#8B0001'
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleViewResults = async (draw) => {
        setSelectedDraw(draw);
        setDrawResult({
            winningNumbers: draw.winningNumbers,
            totalWinners: draw.totalWinners,
            totalPayout: draw.totalPayout
        });
        await loadWinners(draw._id);
    };

    const resetWarRoom = () => {
        setSelectedDraw(null);
        setNum1('');
        setNum2('');
        setWinners(null);
        setDrawResult(null);
    };

    // Handle num input - only allow 1-37
    const handleNumInput = (value, setter) => {
        const cleaned = value.replace(/[^0-9]/g, '');
        if (cleaned === '') {
            setter('');
            return;
        }
        const num = parseInt(cleaned);
        if (num <= 37) {
            setter(cleaned);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="war-room">
            {/* War Room Header */}
            <div className="wr-header">
                <div className="wr-header-left">
                    <div className="wr-emblem">
                        <Flame size={28} />
                    </div>
                    <div>
                        <h2 className="wr-title">Bolahan War Room</h2>
                        <p className="wr-subtitle">Manual Draw Execution · Live Stream Based</p>
                    </div>
                </div>
                <div className="wr-header-right">
                    <button className="btn btn-ghost btn-sm" onClick={() => { resetWarRoom(); loadDraws(); }}>
                        <RefreshCw size={14} /> Reset
                    </button>
                </div>
            </div>

            {/* Draw Selector Bar */}
            <div className="wr-selector-bar">
                <div className="wr-selector-section">
                    <label className="wr-label">
                        <Target size={14} /> Select Locked Draw
                    </label>
                    <div className="wr-draw-chips">
                        {lockedDraws.length === 0 ? (
                            <div className="wr-empty-chip">
                                <AlertTriangle size={14} />
                                No locked draws available
                            </div>
                        ) : (
                            lockedDraws.map(draw => (
                                <button
                                    key={draw._id}
                                    className={`wr-draw-chip ${selectedDraw?._id === draw._id ? 'active' : ''}`}
                                    onClick={() => { resetWarRoom(); setSelectedDraw(draw); }}
                                    disabled={submitting}
                                >
                                    <span className="chip-type">{draw.drawType}</span>
                                    <span className="chip-date">
                                        {new Date(draw.drawDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                                    </span>
                                    <span className="chip-bets">{draw.totalBets || 0} bets</span>
                                    <span className="chip-pool">₱{(draw.totalBetAmount || 0).toLocaleString()}</span>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* ═══ Manual Input Section ═══ */}
            <div className="wr-manual-section">
                <div className="wr-manual-card">
                    <div className="wr-manual-header">
                        <Hash size={20} />
                        <h3>Manual Draw Input</h3>
                        <span className="wr-manual-badge">LIVE STREAM</span>
                    </div>

                    {selectedDraw && selectedDraw.status === 'locked' ? (
                        <>
                            <p className="wr-manual-desc">
                                Enter the winning numbers from the live stream draw for <strong>{selectedDraw.label}</strong>
                            </p>

                            <div className="wr-manual-inputs">
                                <div className="wr-number-input-group">
                                    <label>First Number</label>
                                    <input
                                        id="manual-num1"
                                        type="text"
                                        inputMode="numeric"
                                        className="wr-number-input"
                                        placeholder="00"
                                        value={num1}
                                        onChange={(e) => handleNumInput(e.target.value, setNum1)}
                                        maxLength={2}
                                        disabled={submitting}
                                        autoComplete="off"
                                    />
                                    <span className="wr-number-range">1 – 37</span>
                                </div>

                                <div className="wr-number-separator">
                                    <span>—</span>
                                </div>

                                <div className="wr-number-input-group">
                                    <label>Second Number</label>
                                    <input
                                        id="manual-num2"
                                        type="text"
                                        inputMode="numeric"
                                        className="wr-number-input"
                                        placeholder="00"
                                        value={num2}
                                        onChange={(e) => handleNumInput(e.target.value, setNum2)}
                                        maxLength={2}
                                        disabled={submitting}
                                        autoComplete="off"
                                    />
                                    <span className="wr-number-range">1 – 37</span>
                                </div>
                            </div>

                            {/* Pool Info */}
                            <div className="wr-pool-info">
                                <div className="wr-pool-stat">
                                    <span className="wr-pool-label">Total Bets</span>
                                    <span className="wr-pool-value">{selectedDraw.totalBets || 0}</span>
                                </div>
                                <div className="wr-pool-divider"></div>
                                <div className="wr-pool-stat">
                                    <span className="wr-pool-label">Bet Pool</span>
                                    <span className="wr-pool-value gold">₱{(selectedDraw.totalBetAmount || 0).toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                className="wr-submit-btn"
                                onClick={handleSubmitDraw}
                                disabled={submitting || !num1 || !num2}
                                id="submit-draw-btn"
                            >
                                {submitting ? (
                                    <>
                                        <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
                                        <span>Processing Draw...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send size={20} />
                                        <span>Submit Draw Result</span>
                                    </>
                                )}
                            </button>
                        </>
                    ) : selectedDraw && selectedDraw.status === 'settled' ? (
                        <div className="wr-result-display">
                            <p className="wr-manual-desc" style={{ marginBottom: '16px' }}>
                                Results for <strong>{selectedDraw.label}</strong>
                            </p>
                            {drawResult && drawResult.winningNumbers && (
                                <div className="wr-result-numbers">
                                    <div className="wr-result-ball">{drawResult.winningNumbers.num1}</div>
                                    <span className="wr-result-dash">—</span>
                                    <div className="wr-result-ball">{drawResult.winningNumbers.num2}</div>
                                </div>
                            )}
                            {drawResult && (
                                <div className="wr-result-stats">
                                    <span className="wr-result-stat green">
                                        <CheckCircle2 size={16} />
                                        {drawResult.totalWinners || 0} Winner{(drawResult.totalWinners || 0) !== 1 ? 's' : ''}
                                    </span>
                                    <span className="wr-result-stat gold">
                                        <Trophy size={16} />
                                        ₱{(drawResult.totalPayout || 0).toLocaleString()} Payout
                                    </span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="wr-manual-empty">
                            <Target size={40} style={{ opacity: 0.2, marginBottom: '12px' }} />
                            <p>Select a locked draw above to enter winning numbers.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Winner Status Table */}
            {(winners || winnersLoading) && (
                <div className="wr-winners-section">
                    <div className="wr-winners-header">
                        <div className="wr-winners-title">
                            <Trophy size={20} />
                            <h3>Winner Status</h3>
                        </div>
                        {winners && (
                            <div className="wr-winners-summary">
                                <span className="wr-summary-chip gold">
                                    {winners.totalWinners || 0} Winner{(winners.totalWinners || 0) !== 1 ? 's' : ''}
                                </span>
                                <span className="wr-summary-chip red">
                                    ₱{(winners.totalPayout || 0).toLocaleString()} Payout
                                </span>
                            </div>
                        )}
                    </div>

                    {winnersLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                            <div className="spinner"></div>
                        </div>
                    ) : winners && winners.winners && winners.winners.length > 0 ? (
                        <div className="data-table-wrapper wr-table">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Player Name</th>
                                        <th>Kubrador</th>
                                        <th>Numbers</th>
                                        <th>Bet Amount</th>
                                        <th>Amount Won</th>
                                        <th>Papelito</th>
                                        <th>Type</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {winners.winners.map((w, i) => (
                                        <tr key={i} className="wr-winner-row">
                                            <td style={{ fontWeight: 700, color: 'var(--gold)' }}>{i + 1}</td>
                                            <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Crown size={14} style={{ color: 'var(--gold)' }} />
                                                    {w.bettorName}
                                                </div>
                                            </td>
                                            <td>{w.kubradorName}</td>
                                            <td>
                                                <div className="number-pair">
                                                    <span className="number-ball" style={{ width: '28px', height: '28px', fontSize: '11px' }}>
                                                        {w.numbers.split('-')[0]}
                                                    </span>
                                                    <span className="separator" style={{ fontSize: '14px' }}>-</span>
                                                    <span className="number-ball" style={{ width: '28px', height: '28px', fontSize: '11px' }}>
                                                        {w.numbers.split('-')[1]}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>₱{w.betAmount.toLocaleString()}</td>
                                            <td style={{ color: 'var(--green-light)', fontWeight: 700, fontSize: '15px' }}>
                                                ₱{w.payout.toLocaleString()}
                                            </td>
                                            <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--gold)' }}>
                                                {w.papelito}
                                            </td>
                                            <td>
                                                {w.isPompyang ? (
                                                    <span className="badge badge-red">POMPYANG</span>
                                                ) : (
                                                    <span className="badge badge-gold">STANDARD</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="wr-no-winner">
                            <Skull size={48} />
                            <h3>No Winner</h3>
                            <p>No bets matched the winning combination for this draw.</p>
                        </div>
                    )}
                </div>
            )}

            {/* ═══ Draw History Table ═══ */}
            <div className="wr-history-section">
                <div className="wr-history-header">
                    <div className="wr-history-title">
                        <History size={20} />
                        <h3>Draw History</h3>
                    </div>
                    <span className="wr-history-count">{settledDraws.length} past draw{settledDraws.length !== 1 ? 's' : ''}</span>
                </div>

                {settledDraws.length === 0 ? (
                    <div className="wr-history-empty">
                        <History size={40} style={{ opacity: 0.2, marginBottom: '12px' }} />
                        <p>No completed draws yet.</p>
                    </div>
                ) : (
                    <div className="data-table-wrapper">
                        <table className="data-table" id="draw-history-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Draw</th>
                                    <th>Winning Numbers</th>
                                    <th>Total Bets</th>
                                    <th>Pool</th>
                                    <th>Winners</th>
                                    <th>Payout</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {settledDraws.map(draw => (
                                    <tr key={draw._id} className={`wr-history-row ${selectedDraw?._id === draw._id ? 'active' : ''}`}>
                                        <td>
                                            {new Date(draw.drawDate).toLocaleDateString('en-PH', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </td>
                                        <td style={{ fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                                            {draw.drawType}
                                        </td>
                                        <td>
                                            {draw.winningNumbers ? (
                                                <div className="number-pair" style={{ justifyContent: 'flex-start' }}>
                                                    <span className="number-ball wr-history-ball">{draw.winningNumbers.num1}</span>
                                                    <span className="separator">-</span>
                                                    <span className="number-ball wr-history-ball">{draw.winningNumbers.num2}</span>
                                                </div>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)' }}>—</span>
                                            )}
                                        </td>
                                        <td>{draw.totalBets || 0}</td>
                                        <td style={{ color: 'var(--gold)', fontWeight: 600 }}>
                                            ₱{(draw.totalBetAmount || 0).toLocaleString()}
                                        </td>
                                        <td>
                                            <span className={`badge ${draw.totalWinners > 0 ? 'badge-green' : 'badge-gray'}`}>
                                                {draw.totalWinners || 0}
                                            </span>
                                        </td>
                                        <td style={{ color: draw.totalPayout > 0 ? 'var(--green-light)' : 'var(--text-muted)', fontWeight: draw.totalPayout > 0 ? 600 : 400 }}>
                                            {draw.totalPayout > 0 ? `₱${draw.totalPayout.toLocaleString()}` : '—'}
                                        </td>
                                        <td>
                                            <button
                                                className="btn btn-sm btn-outline"
                                                onClick={() => handleViewResults(draw)}
                                                id={`view-result-${draw._id}`}
                                            >
                                                <Trophy size={12} /> View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
