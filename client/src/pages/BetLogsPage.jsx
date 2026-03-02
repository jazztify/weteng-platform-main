import { useState, useEffect, useCallback } from 'react';
import { getBets } from '../api';
import { useSocket } from '../context/SocketContext';
import { Receipt, Search, Bell } from 'lucide-react';
import BetReceiptModal from '../components/ReceiptModal';

export default function BetLogsPage() {
    const { socket } = useSocket();
    const [bets, setBets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({});
    const [selectedBet, setSelectedBet] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [drawAlert, setDrawAlert] = useState(null);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            loadBets();
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [page, searchQuery]);

    // Auto-update when a draw result is broadcasted
    useEffect(() => {
        if (!socket) return;
        const handleDrawResult = (data) => {
            // Show alert notification
            setDrawAlert({
                label: data.label || 'Draw',
                winningNumbers: data.winningNumbers,
                totalWinners: data.totalWinners,
                totalPayout: data.totalPayout
            });
            // Auto-refresh bets list
            loadBets();
            // Auto-dismiss alert after 8 seconds
            setTimeout(() => setDrawAlert(null), 8000);
        };
        socket.on('DRAW_RESULT', handleDrawResult);
        return () => socket.off('DRAW_RESULT', handleDrawResult);
    }, [socket, page, searchQuery]);

    const loadBets = async () => {
        setLoading(true);
        try {
            const res = await getBets({ page, limit: 25, search: searchQuery });
            setBets(res.data.bets || []);
            setPagination(res.data.pagination || {});
        } catch (err) {
            console.error('Failed to load bets:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700 }}>Bet History & Logs</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>View all your digital receipts</p>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Search Ref or Name..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                            style={{ paddingLeft: '36px', width: '250px' }}
                        />
                    </div>
                </div>
            </div>

            {/* Draw Result Notification Banner */}
            {drawAlert && (
                <div className="draw-alert-banner" id="draw-result-alert">
                    <div className="draw-alert-content">
                        <Bell size={18} className="draw-alert-icon" />
                        <div className="draw-alert-text">
                            <strong>🎯 {drawAlert.label} — Results In!</strong>
                            <span>
                                Winning: <strong>{drawAlert.winningNumbers?.num1} - {drawAlert.winningNumbers?.num2}</strong>
                                {' · '}
                                {drawAlert.totalWinners} winner{drawAlert.totalWinners !== 1 ? 's' : ''}
                                {' · '}
                                ₱{(drawAlert.totalPayout || 0).toLocaleString()} payout
                            </span>
                        </div>
                        <button className="draw-alert-close" onClick={() => setDrawAlert(null)}>✕</button>
                    </div>
                </div>
            )}

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="spinner"></div></div>
            ) : bets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                    <Receipt size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                    <p>No bets found.</p>
                </div>
            ) : (
                <div className="card">
                    <div className="data-table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Reference</th>
                                    <th>Date</th>
                                    <th>Numbers</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bets.map(bet => (
                                    <tr key={bet._id}>
                                        <td style={{ fontFamily: 'monospace', color: 'var(--gold)' }}>{bet.papelito}</td>
                                        <td>{new Date(bet.createdAt).toLocaleString('en-PH')}</td>
                                        <td>
                                            <div className="number-pair" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <span className="number-ball" style={{ width: '24px', height: '24px', fontSize: '12px' }}>{bet.numbers.num1}</span>
                                                <span className="separator">-</span>
                                                <span className={`number-ball ${bet.isPompyang ? 'pompyang' : ''}`} style={{ width: '24px', height: '24px', fontSize: '12px' }}>{bet.numbers.num2}</span>
                                                {bet.isPompyang && <span style={{ color: 'var(--red-light)', fontSize: '10px' }}>⚡</span>}
                                            </div>
                                        </td>
                                        <td>₱{bet.amount.toLocaleString()}</td>
                                        <td>
                                            <span className={`badge ${bet.status === 'won' ? 'badge-green' : bet.status === 'lost' ? 'badge-red' : bet.status === 'pending' ? 'badge-gold' : 'badge-gray'}`}>
                                                {bet.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td>
                                            <button className="btn btn-sm btn-outline" onClick={() => setSelectedBet(bet)}>
                                                <Receipt size={14} style={{ marginRight: '4px' }} /> View Receipt
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {pagination.pages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
                            <button className="btn btn-sm btn-outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
                            <span style={{ display: 'flex', alignItems: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
                                Page {page} of {pagination.pages}
                            </span>
                            <button className="btn btn-sm btn-outline" disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>Next</button>
                        </div>
                    )}
                </div>
            )}

            {selectedBet && <BetReceiptModal bet={selectedBet} onClose={() => setSelectedBet(null)} />}
        </div>
    );
}
