import { useEffect, useState } from 'react';
import { getPendingTransactions, approveTransaction, rejectTransaction } from '../api';
import { CheckCircle, XCircle, Clock, DollarSign, User, Hash, Wallet, ArrowRight } from 'lucide-react';
import Swal from 'sweetalert2';

export default function DepositApprovalsPage() {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTransactions();
    }, []);

    const loadTransactions = async () => {
        try {
            setLoading(true);
            const res = await getPendingTransactions();
            setTransactions(res.data.transactions);
        } catch (err) {
            console.error('Load transactions error:', err);
            Swal.fire('Error', 'Failed to load pending transactions', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (transaction) => {
        const result = await Swal.fire({
            title: 'Approve Deposit?',
            html: `
                <div style="text-align: left; background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px; font-size: 14px; color: #A09C97;">
                    <p style="margin-bottom: 8px;"><strong style="color: #DA9101;">Player:</strong> ${transaction.userId?.fullName || 'N/A'}</p>
                    <p style="margin-bottom: 8px;"><strong style="color: #DA9101;">Amount:</strong> ₱${transaction.amount.toLocaleString()}</p>
                    <p style="margin-bottom: 8px;"><strong style="color: #DA9101;">Method:</strong> ${transaction.paymentMethod}</p>
                    <p style="margin-bottom: 0;"><strong style="color: #DA9101;">Ref #:</strong> ${transaction.referenceNumber || 'N/A'}</p>
                </div>
                <p style="margin-top: 15px; font-weight: bold; color: #00BFA5;">The player's balance will be increased immediately.</p>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#00BFA5',
            cancelButtonColor: '#6B6762',
            confirmButtonText: 'Yes, Approve!',
            background: '#1E1E1F',
            color: '#fff'
        });

        if (result.isConfirmed) {
            try {
                await approveTransaction(transaction._id);
                Swal.fire({
                    title: 'Approved!',
                    text: `₱${transaction.amount.toLocaleString()} has been credited to ${transaction.userId?.username}'s wallet.`,
                    icon: 'success',
                    background: '#1E1E1F',
                    color: '#fff',
                    confirmButtonColor: '#00BFA5'
                });
                loadTransactions();
            } catch (err) {
                Swal.fire('Error', err.response?.data?.message || 'Approval failed', 'error');
            }
        }
    };

    const handleReject = async (id) => {
        const { value: reason } = await Swal.fire({
            title: 'Reject Deposit',
            input: 'text',
            inputLabel: 'Reason for rejection',
            inputPlaceholder: 'Wrong reference number, amount mismatch, etc.',
            showCancelButton: true,
            confirmButtonColor: '#8B0001',
            background: '#1E1E1F',
            color: '#fff'
        });

        if (reason !== undefined) {
            try {
                await rejectTransaction(id, reason);
                Swal.fire('Rejected', 'The deposit request has been rejected.', 'info');
                loadTransactions();
            } catch (err) {
                Swal.fire('Error', 'Rejection failed', 'error');
            }
        }
    };

    return (
        <div className="deposits-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Deposit Approvals</h1>
                    <p className="page-subtitle">Manage and verify player fund requests</p>
                </div>
                <div className="pending-badge">
                    <Clock size={16} />
                    {transactions.length} Pending
                </div>
            </div>

            <div className="card">
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Player Details</th>
                                <th>Amount</th>
                                <th>Method</th>
                                <th>Ref Number</th>
                                <th>Balance Before</th>
                                <th>Requested At</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                                        <div className="shimmer" style={{ height: '30px', margin: '10px 0' }} />
                                        <div className="shimmer" style={{ height: '30px', margin: '10px 0' }} />
                                    </td>
                                </tr>
                            ) : transactions.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                                        <div style={{ marginBottom: '16px' }}>
                                            <CheckCircle size={48} style={{ opacity: 0.2 }} />
                                        </div>
                                        <div>No pending deposits to approve.</div>
                                    </td>
                                </tr>
                            ) : (
                                transactions.map((tx) => (
                                    <tr key={tx._id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div className="user-avatar mini">
                                                    {tx.userId?.username?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{tx.userId?.fullName}</div>
                                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>@{tx.userId?.username}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 700, color: 'var(--green-light)', fontSize: '15px' }}>
                                                ₱{tx.amount.toLocaleString()}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge badge-gray`}>{tx.paymentMethod}</span>
                                        </td>
                                        <td>
                                            <code style={{ background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>
                                                {tx.referenceNumber || 'N/A'}
                                            </code>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                                ₱{(tx.userId?.balance || 0).toLocaleString()}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                                {new Date(tx.createdAt).toLocaleDateString()}<br />
                                                {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button
                                                    onClick={() => handleApprove(tx)}
                                                    className="btn-icon approve"
                                                    title="Approve"
                                                >
                                                    <CheckCircle size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleReject(tx._id)}
                                                    className="btn-icon reject"
                                                    title="Reject"
                                                >
                                                    <XCircle size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .btn-icon {
                    width: 36px;
                    height: 36px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid transparent;
                    cursor: pointer;
                    transition: all 0.2s;
                    background: var(--bg-elevated);
                    color: var(--text-muted);
                }
                .btn-icon.approve:hover {
                    background: rgba(0, 191, 165, 0.1);
                    color: #00BFA5;
                    border-color: rgba(0, 191, 165, 0.2);
                }
                .btn-icon.reject:hover {
                    background: rgba(198, 40, 40, 0.1);
                    color: #C62828;
                    border-color: rgba(198, 40, 40, 0.2);
                }
                .pending-badge {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 16px;
                    background: rgba(218, 145, 1, 0.1);
                    border: 1px solid rgba(218, 145, 1, 0.2);
                    border-radius: 20px;
                    color: var(--gold);
                    font-size: 13px;
                    font-weight: 600;
                }
            `}} />
        </div>
    );
}
