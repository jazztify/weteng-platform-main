import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDraws, executeDraw, getDrawWinners } from '../api';
import { Zap, Trophy, Flame, RefreshCw, Crown, Skull, Target, AlertTriangle } from 'lucide-react';
import Swal from 'sweetalert2';

const TOTAL_NUMBERS = 37;
const ANIMATION_DURATION = 4000; // 4 seconds total animation
const CYCLE_INTERVAL_START = 40;  // ms between number changes (fast start)
const CYCLE_INTERVAL_END = 250;   // ms between number changes (slow finish)

export default function WarRoomPage() {
    const { user } = useAuth();
    const [draws, setDraws] = useState([]);
    const [selectedDraw, setSelectedDraw] = useState(null);
    const [loading, setLoading] = useState(true);

    // Animation state
    const [isAnimating, setIsAnimating] = useState(false);
    const [animBall1, setAnimBall1] = useState(null);
    const [animBall2, setAnimBall2] = useState(null);
    const [animPhase, setAnimPhase] = useState('idle'); // idle | spinning | reveal | done
    const [finalNumbers, setFinalNumbers] = useState(null);

    // Winner state
    const [winners, setWinners] = useState(null);
    const [winnersLoading, setWinnersLoading] = useState(false);

    const animRef = useRef(null);

    useEffect(() => {
        loadDraws();
    }, []);

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

    // Get locked draws that can be executed
    const lockedDraws = draws.filter(d => d.status === 'locked');
    // Get settled draws (to view results)
    const settledDraws = draws.filter(d => d.status === 'settled').slice(0, 10);

    const randomNum = () => Math.floor(Math.random() * TOTAL_NUMBERS) + 1;

    const runAnimation = useCallback((finalNum1, finalNum2) => {
        setAnimPhase('spinning');
        setIsAnimating(true);
        setFinalNumbers(null);
        setWinners(null);

        const startTime = Date.now();
        let phase = 1; // 1 = both spinning, 2 = ball1 locked, ball2 spinning

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / ANIMATION_DURATION, 1);

            // Easing: start fast, end slow
            const interval = CYCLE_INTERVAL_START + (CYCLE_INTERVAL_END - CYCLE_INTERVAL_START) * Math.pow(progress, 2);

            if (progress < 0.5) {
                // Phase 1: Both balls spinning
                setAnimBall1(randomNum());
                setAnimBall2(randomNum());
            } else if (progress < 0.85) {
                // Phase 2: Ball 1 locks in
                if (phase === 1) {
                    phase = 2;
                    setAnimBall1(finalNum1);
                    setAnimPhase('reveal');
                }
                setAnimBall2(randomNum());
            } else if (progress >= 1) {
                // Done: Ball 2 locks in
                setAnimBall2(finalNum2);
                setAnimPhase('done');
                setFinalNumbers({ num1: finalNum1, num2: finalNum2 });
                setIsAnimating(false);
                return;
            }

            animRef.current = setTimeout(animate, interval);
        };

        animate();
    }, []);

    const handleStartDraw = async () => {
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

        const confirm = await Swal.fire({
            title: '⚡ Execute Bolahan?',
            html: `<p style="color:#A09C97">This will generate winning numbers and settle all bets for:</p>
                   <p style="color:#DA9101;font-weight:700;font-size:16px;margin-top:8px">${selectedDraw.label}</p>
                   <p style="color:#6B6762;font-size:13px;margin-top:4px">${selectedDraw.totalBets || 0} bets · ₱${(selectedDraw.totalBetAmount || 0).toLocaleString()} pool</p>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: '🔥 START THE BOLAHAN',
            confirmButtonColor: '#8B0001',
            cancelButtonColor: '#333',
            background: '#1a0a0a',
            color: '#DA9101'
        });

        if (!confirm.isConfirmed) return;

        try {
            const res = await executeDraw(selectedDraw._id);
            const result = res.data.result;

            // Run the animation with the actual winning numbers
            runAnimation(result.winningNumbers.num1, result.winningNumbers.num2);

            // After animation completes, load winners
            setTimeout(async () => {
                await loadWinners(selectedDraw._id);
                loadDraws(); // Refresh draw list
            }, ANIMATION_DURATION + 500);

        } catch (err) {
            Swal.fire({
                title: 'Draw Failed',
                text: err.response?.data?.message || 'Failed to execute draw',
                icon: 'error',
                background: '#1a0a0a',
                color: '#DA9101',
                confirmButtonColor: '#8B0001'
            });
        }
    };

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

    const handleViewResults = async (draw) => {
        setSelectedDraw(draw);
        setFinalNumbers(draw.winningNumbers);
        setAnimPhase('done');
        await loadWinners(draw._id);
    };

    const resetWarRoom = () => {
        if (animRef.current) clearTimeout(animRef.current);
        setIsAnimating(false);
        setAnimBall1(null);
        setAnimBall2(null);
        setAnimPhase('idle');
        setFinalNumbers(null);
        setWinners(null);
        setSelectedDraw(null);
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
                        <p className="wr-subtitle">Draw Execution & Settlement Control Center</p>
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
                                    disabled={isAnimating}
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

                {settledDraws.length > 0 && (
                    <div className="wr-selector-section">
                        <label className="wr-label" style={{ color: 'var(--text-muted)' }}>
                            <Trophy size={14} /> View Past Results
                        </label>
                        <div className="wr-draw-chips">
                            {settledDraws.map(draw => (
                                <button
                                    key={draw._id}
                                    className={`wr-draw-chip settled ${selectedDraw?._id === draw._id ? 'active' : ''}`}
                                    onClick={() => handleViewResults(draw)}
                                    disabled={isAnimating}
                                >
                                    <span className="chip-type">{draw.drawType}</span>
                                    <span className="chip-date">
                                        {new Date(draw.drawDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                                    </span>
                                    {draw.winningNumbers && (
                                        <span className="chip-result">{draw.winningNumbers.num1}-{draw.winningNumbers.num2}</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Main Arena */}
            <div className="wr-arena">
                {/* Ball Display */}
                <div className={`wr-ball-stage ${animPhase}`}>
                    <div className="wr-stage-glow"></div>

                    <div className="wr-ball-container">
                        <div className={`wr-ball wr-ball-1 ${animPhase === 'spinning' ? 'spin' : ''} ${animPhase === 'reveal' || animPhase === 'done' ? 'locked' : ''}`}>
                            <span>{animBall1 ?? '?'}</span>
                        </div>
                        <div className="wr-ball-separator">
                            <span>—</span>
                        </div>
                        <div className={`wr-ball wr-ball-2 ${animPhase === 'spinning' || animPhase === 'reveal' ? 'spin' : ''} ${animPhase === 'done' ? 'locked' : ''}`}>
                            <span>{animBall2 ?? '?'}</span>
                        </div>
                    </div>

                    {animPhase === 'done' && finalNumbers && (
                        <div className="wr-result-label">
                            <Crown size={18} />
                            WINNING COMBINATION
                        </div>
                    )}

                    {animPhase === 'idle' && (
                        <div className="wr-idle-text">
                            {selectedDraw
                                ? 'Ready to execute. Press START THE BOLAHAN.'
                                : 'Select a locked draw to begin.'
                            }
                        </div>
                    )}

                    {(animPhase === 'spinning' || animPhase === 'reveal') && (
                        <div className="wr-spinning-text">
                            <div className="wr-pulse-dot"></div>
                            {animPhase === 'spinning' ? 'Drawing numbers...' : 'First number locked!'}
                        </div>
                    )}
                </div>

                {/* Start Draw Button */}
                {animPhase === 'idle' && selectedDraw && selectedDraw.status === 'locked' && (
                    <div className="wr-action-zone">
                        <button
                            className="wr-start-btn"
                            onClick={handleStartDraw}
                            disabled={isAnimating}
                            id="start-draw-btn"
                        >
                            <Zap size={24} />
                            <span>START THE BOLAHAN</span>
                            <div className="wr-start-btn-glow"></div>
                        </button>
                        <p className="wr-action-hint">
                            {selectedDraw.label} · {selectedDraw.totalBets || 0} bets · ₱{(selectedDraw.totalBetAmount || 0).toLocaleString()} pool
                        </p>
                    </div>
                )}
            </div>

            {/* Winner Status Table */}
            {(animPhase === 'done' || winnersLoading) && (
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
                            {finalNumbers && (
                                <p style={{ color: 'var(--gold)', marginTop: '8px', fontWeight: 600 }}>
                                    Winning Numbers: {finalNumbers.num1} - {finalNumbers.num2}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
