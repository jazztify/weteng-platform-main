import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../api';
import { Mail, ArrowLeft } from 'lucide-react';
import Swal from 'sweetalert2';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) return;
        setLoading(true);
        try {
            await forgotPassword(email);
            setSent(true);
            Swal.fire({ title: 'Email Sent!', text: 'Check your inbox for a password reset link.', icon: 'success', background: '#1E1E1F', color: '#DA9101', confirmButtonColor: '#8B0001' });
        } catch {
            Swal.fire({ title: 'Error', text: 'Failed to send reset email.', icon: 'error', background: '#1E1E1F', color: '#DA9101', confirmButtonColor: '#8B0001' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-card">
                    <div className="login-header">
                        <div className="login-brand">W</div>
                        <h1>Reset Password</h1>
                        <p>Enter your email to receive a reset link</p>
                    </div>
                    {sent ? (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <Mail size={48} style={{ color: 'var(--gold)', marginBottom: '16px' }} />
                            <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>Check Your Email</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>We sent a password reset link to <strong style={{ color: 'var(--gold)' }}>{email}</strong></p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Email Address</label>
                                <input id="forgot-email" type="email" className="form-input" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} />
                            </div>
                            <button id="forgot-submit" type="submit" className="btn btn-gold btn-lg w-full" disabled={loading}>
                                {loading ? 'Sending...' : 'Send Reset Link'}
                            </button>
                        </form>
                    )}
                    <div className="login-footer">
                        <Link to="/login" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                            <ArrowLeft size={14} /> Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
