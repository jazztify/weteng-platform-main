import { useState, useEffect } from 'react';
import { getTransactions } from '../api';
import { Receipt, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [typeFilter, setTypeFilter] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({});

    useEffect(() => {
        loadTransactions();
    }, [typeFilter, page]);

    const loadTransactions = async () => {
        setLoading(true);
        try {
            const params = { page, limit: 25 };
            if (typeFilter) params.type = typeFilter;
            const res = await getTransactions(params);
            setTransactions(res.data.transactions || []);
            setPagination(res.data.pagination || {});
        } catch (err) {
            console.error('Failed to load transactions:', err);
        } finally {
            setLoading(false);
        }
    };

    const getTypeInfo = (type) => {
        const map = {
            commission: { label: 'Commission', color: 'var(--gold)', icon: '💰', direction: 'in' },
            payout: { label: 'Payout', color: 'var(--green-light)', icon: '🏆', direction: 'in' },
            collection: { label: 'Collection', color: 'var(--text-secondary)', icon: '📥', direction: 'in' },
            remittance: { label: 'Remittance', color: 'var(--red-light)', icon: '📤', direction: 'out' },
            adjustment: { label: 'Adjustment', color: 'var(--text-muted)', icon: '⚙️', direction: 'in' },
            deposit: { label: 'Deposit', color: 'var(--green-light)', icon: '💵', direction: 'in' },
            withdrawal: { label: 'Withdrawal', color: 'var(--red-light)', icon: '💸', direction: 'out' }
        };
        return map[type] || { label: type, color: 'var(--text-muted)', icon: '📝', direction: 'in' };
    };

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700 }}>Transaction History</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Commission, payouts, and financial records</p>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={loadTransactions}><RefreshCw size={14} /> Refresh</button>
            </div>

            {/* Filters */}
            <div className="card mb-3">
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {['', 'commission', 'payout', 'collection', 'remittance'].map(type => (
                        <button
                            key={type}
                            className={`btn btn-sm ${typeFilter === type ? 'btn-gold' : 'btn-outline'}`}
                            onClick={() => { setTypeFilter(type); setPage(1); }}
                        >
                            {type ? getTypeInfo(type).icon + ' ' + getTypeInfo(type).label : '📊 All'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Transactions List */}
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="spinner"></div></div>
            ) : transactions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                    <Receipt size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                    <p>No transactions found.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {transactions.map(tx => {
                        const info = getTypeInfo(tx.type);
                        return (
                            <div key={tx._id} className="card" style={{ padding: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                        <div style={{
                                            width: '42px', height: '42px', borderRadius: 'var(--radius-md)',
                                            background: info.direction === 'in' ? 'rgba(0,106,79,0.15)' : 'rgba(139,0,1,0.15)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
                                        }}>
                                            {info.direction === 'in' ? <ArrowDownRight size={20} style={{ color: 'var(--green-light)' }} /> : <ArrowUpRight size={20} style={{ color: 'var(--red-light)' }} />}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>
                                                {info.icon} {info.label}
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                {tx.description || 'No description'}
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                {new Date(tx.createdAt).toLocaleString('en-PH')}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{
                                            fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700,
                                            color: info.direction === 'in' ? 'var(--green-light)' : 'var(--red-light)'
                                        }}>
                                            {info.direction === 'in' ? '+' : '-'}₱{Math.abs(tx.amount).toLocaleString()}
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                            Bal: ₱{(tx.balanceAfter || 0).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Pagination */}
                    {pagination.pages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
                            <button className="btn btn-sm btn-outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
                            <span style={{ display: 'flex', alignItems: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
                                Page {page} of {pagination.pages}
                            </span>
                            <button className="btn btn-sm btn-outline" disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>Next</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
