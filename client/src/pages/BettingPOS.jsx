import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useSettings } from '../context/SettingsContext';
import { getActiveDraws, placeBet, getBets } from '../api';
import { Dices, RotateCcw, Send, Receipt, Trash2, Eye } from 'lucide-react';
import Swal from 'sweetalert2';
import BetReceiptModal from '../components/ReceiptModal';

export default function BettingPOS() {
    const { user } = useAuth();
    const { socket } = useSocket();
    const { settings } = useSettings();
    const [activeDraws, setActiveDraws] = useState([]);
    const [selectedDraw, setSelectedDraw] = useState(null);
    const [num1, setNum1] = useState(null);
    const [num2, setNum2] = useState(null);
    const [amount, setAmount] = useState('');
    const [bettorName, setBettorName] = useState('');
    const [recentBets, setRecentBets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1); // 1: select num1, 2: select num2
    const [placedBetSlip, setPlacedBetSlip] = useState(null);

    useEffect(() => {
        loadDraws();
    }, []);

    useEffect(() => {
        if (!socket) return;
        socket.on('LOCK_BETS', (data) => {
            Swal.fire({
                title: '🔒 MARKET LOCKED',
                text: `${data.label} - Betting is now closed!`,
                icon: 'warning',
                background: '#1E1E1F',
                color: '#DA9101',
                confirmButtonColor: '#8B0001'
            });
            loadDraws();
        });

        socket.on('DRAW_RESULT', (data) => {
            Swal.fire({
                title: '🎰 BIG WIN!',
                html: `<div style="text-align:center">
          <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin:16px 0">
            <div class="number-ball large">${data.winningNumbers.num1}</div>
            <span style="font-size:24px;color:#6B6762">—</span>
            <div class="number-ball large">${data.winningNumbers.num2}</div>
          </div>
          <p style="color:#00BFA5;font-size:16px;font-weight:700">${data.totalWinners} Winner(s) • ₱${data.totalPayout.toLocaleString()}</p>
        </div>`,
                background: '#1E1E1F',
                color: '#DA9101',
                confirmButtonColor: '#8B0001',
                backdrop: 'rgba(139,0,1,0.4)'
            });
        });

        return () => {
            socket.off('LOCK_BETS');
            socket.off('DRAW_RESULT');
        };
    }, [socket]);

    const loadDraws = async () => {
        try {
            const res = await getActiveDraws();
            const draws = res.data.draws;
            setActiveDraws(draws);
            const openDraw = draws.find(d => d.status === 'open');
            if (openDraw) setSelectedDraw(openDraw);
            else if (draws.length > 0) setSelectedDraw(draws[0]);

            // Load recent bets
            const betsRes = await getBets({ limit: 10 });
            setRecentBets(betsRes.data.bets || []);
        } catch (err) {
            console.error('Failed to load draws:', err);
        }
    };

    const selectNumber = (num) => {
        if (step === 1) {
            setNum1(num);
            setStep(2);
        } else {
            setNum2(num);
        }
    };

    const resetSelection = () => {
        setNum1(null);
        setNum2(null);
        setStep(1);
        setAmount('');
        setBettorName('');
    };

    const handlePlaceBet = async () => {
        if (!selectedDraw || selectedDraw.status !== 'open') {
            Swal.fire({ title: 'Cannot Bet', text: 'No open draw available.', icon: 'error', background: '#1E1E1F', color: '#DA9101', confirmButtonColor: '#8B0001' });
            return;
        }
        if (num1 === null || num2 === null) {
            Swal.fire({ title: 'Select Numbers', text: `Please select two numbers (1-${settings?.maxNumber || 37}).`, icon: 'warning', background: '#1E1E1F', color: '#DA9101', confirmButtonColor: '#8B0001' });
            return;
        }
        if (!amount || parseFloat(amount) < 1) {
            Swal.fire({ title: 'Invalid Amount', text: 'Minimum bet is ₱1.', icon: 'warning', background: '#1E1E1F', color: '#DA9101', confirmButtonColor: '#8B0001' });
            return;
        }

        const isPompyang = num1 === num2;
        const payout = parseFloat(amount) * (isPompyang ? (settings?.pompyangMultiplier || 800) : (settings?.payoutMultiplier || 400));

        const confirm = await Swal.fire({
            title: 'Confirm Bet',
            html: `
        <div style="text-align:center">
          <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin:16px 0">
            <div class="number-ball">${num1}</div>
            <span style="font-size:20px;color:#6B6762">—</span>
            <div class="number-ball ${isPompyang ? 'pompyang' : ''}">${num2}</div>
          </div>
          ${isPompyang ? '<p style="color:#C62828;font-weight:700;margin-bottom:8px">⚡ POMPYANG (2x Payout)</p>' : ''}
          <p style="color:#A09C97">Amount: <strong style="color:#DA9101">₱${parseFloat(amount).toLocaleString()}</strong></p>
          <p style="color:#A09C97">Potential Payout: <strong style="color:#00BFA5">₱${payout.toLocaleString()}</strong></p>
          <p style="color:#A09C97">Commission (15%): <strong style="color:#DA9101">₱${(parseFloat(amount) * 0.15).toLocaleString()}</strong></p>
        </div>
      `,
            background: '#1E1E1F',
            color: '#DA9101',
            showCancelButton: true,
            confirmButtonColor: '#DA9101',
            cancelButtonColor: '#333',
            confirmButtonText: '✅ Place Bet',
            cancelButtonText: 'Cancel'
        });

        if (!confirm.isConfirmed) return;

        setLoading(true);
        try {
            const res = await placeBet({
                num1, num2,
                amount: parseFloat(amount),
                drawId: selectedDraw._id,
                bettorName: bettorName || 'Walk-in'
            });

            Swal.fire({
                title: 'Bet Placed! 🎰',
                html: `<p style="color:#A09C97">Reference: <strong style="color:#DA9101;font-family:monospace">${res.data.bet.papelito}</strong></p>`,
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
                background: '#1E1E1F',
                color: '#DA9101'
            }).then(() => {
                setPlacedBetSlip(res.data.bet);
            });

            resetSelection();
            loadDraws();
        } catch (err) {
            Swal.fire({
                title: 'Bet Failed',
                text: err.response?.data?.message || 'An error occurred.',
                icon: 'error',
                background: '#1E1E1F',
                color: '#DA9101',
                confirmButtonColor: '#8B0001'
            });
        } finally {
            setLoading(false);
        }
    };

    const maxNum = settings?.maxNumber || 37;
    const numbers = Array.from({ length: maxNum }, (_, i) => i + 1);

    return (
        <div>
            {/* Draw Selector */}
            <div className="card mb-3">
                <div className="card-header">
                    <div>
                        <div className="card-title">Active Draw</div>
                        <div className="card-subtitle">Select a draw to place bets</div>
                    </div>
                    <Dices size={20} style={{ color: 'var(--gold)' }} />
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {activeDraws.map(draw => (
                        <button
                            key={draw._id}
                            className={`btn ${selectedDraw?._id === draw._id ? 'btn-gold' : 'btn-outline'}`}
                            onClick={() => setSelectedDraw(draw)}
                            disabled={draw.status !== 'open'}
                        >
                            <span style={{ textTransform: 'capitalize' }}>{draw.drawType}</span>
                            <span className={`badge ${draw.status === 'open' ? 'badge-green' : 'badge-gray'}`} style={{ marginLeft: '6px' }}>
                                {draw.status.toUpperCase()}
                            </span>
                        </button>
                    ))}
                    {activeDraws.length === 0 && (
                        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No draws available today.</p>
                    )}
                </div>
            </div>

            <div className="grid-2">
                {/* Number Keypad */}
                <div className="card">
                    <div className="card-header">
                        <div>
                            <div className="card-title">
                                {step === 1 ? '① Select First Number' : '② Select Second Number'}
                            </div>
                            <div className="card-subtitle">Pick from 1-{maxNum}</div>
                        </div>
                        <button className="btn btn-ghost btn-sm" onClick={resetSelection}>
                            <RotateCcw size={14} /> Reset
                        </button>
                    </div>

                    {/* Current Selection */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px',
                        padding: '20px', margin: '0 0 20px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--border-subtle)'
                    }}>
                        <div className={`number-ball large ${num1 !== null ? '' : ''}`}
                            style={num1 === null ? { background: 'var(--bg-card)', color: 'var(--text-muted)', boxShadow: 'none' } : {}}>
                            {num1 !== null ? num1 : '?'}
                        </div>
                        <span style={{ fontSize: '28px', color: 'var(--text-muted)', fontWeight: 300 }}>—</span>
                        <div className={`number-ball large ${num1 !== null && num2 !== null && num1 === num2 ? 'pompyang' : ''}`}
                            style={num2 === null ? { background: 'var(--bg-card)', color: 'var(--text-muted)', boxShadow: 'none' } : {}}>
                            {num2 !== null ? num2 : '?'}
                        </div>
                    </div>

                    {num1 !== null && num2 !== null && num1 === num2 && (
                        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                            <span className="badge badge-red" style={{ fontSize: '13px', padding: '4px 14px' }}>
                                ⚡ POMPYANG — Double Payout!
                            </span>
                        </div>
                    )}

                    {/* Number Grid */}
                    <div className="keypad-grid">
                        {numbers.map(n => (
                            <button
                                key={n}
                                className={`keypad-btn ${(step === 1 && num1 === n) || (step === 2 && num2 === n) ? 'selected' : ''}`}
                                onClick={() => selectNumber(n)}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Bet Form + Recent Bets */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Bet Form */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">Place Bet</div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Bettor Name</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Walk-in / Bettor name"
                                value={bettorName}
                                onChange={e => setBettorName(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Bet Amount (₱)</label>
                            <input
                                type="number"
                                className="form-input"
                                placeholder="Enter amount (min ₱1)"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                min="1"
                                step="1"
                            />
                        </div>

                        {amount && parseFloat(amount) >= 1 && (
                            <div style={{
                                background: 'var(--bg-elevated)', padding: '14px', borderRadius: 'var(--radius-md)',
                                marginBottom: '16px', border: '1px solid var(--border-subtle)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Potential Payout:</span>
                                    <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--green-light)' }}>
                                        ₱{(parseFloat(amount) * (num1 === num2 && num1 !== null ? (settings?.pompyangMultiplier || 800) : (settings?.payoutMultiplier || 400))).toLocaleString()}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Your Commission (15%):</span>
                                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gold)' }}>
                                        ₱{(parseFloat(amount) * 0.15).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Quick Amount Buttons */}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                            {[5, 10, 20, 50, 100].map(a => (
                                <button
                                    key={a}
                                    className={`btn btn-sm ${parseFloat(amount) === a ? 'btn-gold' : 'btn-outline'}`}
                                    onClick={() => setAmount(a.toString())}
                                >
                                    ₱{a}
                                </button>
                            ))}
                        </div>

                        <button
                            className="btn btn-gold btn-lg w-full"
                            onClick={handlePlaceBet}
                            disabled={loading || !selectedDraw || selectedDraw.status !== 'open' || num1 === null || num2 === null}
                        >
                            {loading ? (
                                <><div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} /> Placing...</>
                            ) : (
                                <><Send size={18} /> Place Bet</>
                            )}
                        </button>
                    </div>

                    {/* Recent Bets (Digital Papelitos) */}
                    <div className="card">
                        <div className="card-header">
                            <div>
                                <div className="card-title">Recent Bets</div>
                                <div className="card-subtitle">Your digital receipts</div>
                            </div>
                            <Receipt size={18} style={{ color: 'var(--gold)' }} />
                        </div>

                        {recentBets.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                                No bets placed yet
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '320px', overflowY: 'auto' }}>
                                {recentBets.map(bet => (
                                    <div key={bet._id} className="papelito">
                                        <div className="papelito-header">
                                            <span className="papelito-ref">{bet.papelito}</span>
                                            <span className={`badge ${bet.status === 'won' ? 'badge-green' :
                                                bet.status === 'lost' ? 'badge-red' :
                                                    bet.status === 'pending' ? 'badge-gold' : 'badge-gray'
                                                }`}>
                                                {bet.status.toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="papelito-body">
                                            <div className="number-pair">
                                                <span className="number-ball" style={{ width: '36px', height: '36px', fontSize: '14px' }}>{bet.numbers.num1}</span>
                                                <span className="separator">-</span>
                                                <span className={`number-ball ${bet.isPompyang ? 'pompyang' : ''}`} style={{ width: '36px', height: '36px', fontSize: '14px' }}>{bet.numbers.num2}</span>
                                            </div>
                                        </div>
                                        <div className="papelito-footer" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px', marginBottom: '8px' }}>
                                            <span>₱{bet.amount}</span>
                                            <span>{bet.isPompyang ? '⚡ Pompyang' : 'Standard'}</span>
                                            <span style={{ color: 'var(--green-light)' }}>Win: ₱{bet.potentialPayout?.toLocaleString()}</span>
                                        </div>
                                        <button className="btn btn-outline btn-sm w-full" onClick={() => setPlacedBetSlip(bet)}>
                                            <Eye size={14} style={{ marginRight: '4px' }} /> View Slip
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {placedBetSlip && <BetReceiptModal bet={placedBetSlip} onClose={() => setPlacedBetSlip(null)} />}
        </div>
    );
}
