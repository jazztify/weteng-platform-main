import { useState, useEffect } from 'react';
import { getBets } from '../api';
import { Receipt, Search } from 'lucide-react';
import BetReceiptModal from '../components/ReceiptModal';

export default function BetLogsPage() {
    const [bets, setBets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({});
    const [selectedBet, setSelectedBet] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            loadBets();
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [page, searchQuery]);

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
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>View all your digital papelitos</p>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Search Papelito or Name..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                            style={{ paddingLeft: '36px', width: '250px' }}
                        />
                    </div>
                </div>
            </div>

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
                                    <th>Papelito</th>
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
