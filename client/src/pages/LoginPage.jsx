import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import Swal from 'sweetalert2';

export default function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ username: '', password: '' });
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.username || !form.password) {
            Swal.fire({
                title: 'Missing Fields',
                text: 'Please enter both username and password.',
                icon: 'warning',
                background: '#1E1E1F',
                color: '#DA9101',
                confirmButtonColor: '#8B0001'
            });
            return;
        }

        setLoading(true);
        try {
            const user = await login(form);
            Swal.fire({
                title: `Welcome back, ${user.fullName}!`,
                text: `Logged in as ${user.role.toUpperCase()}`,
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
                background: '#1E1E1F',
                color: '#DA9101'
            });
            navigate('/dashboard');
        } catch (err) {
            Swal.fire({
                title: 'Login Failed',
                text: err.message,
                icon: 'error',
                background: '#1E1E1F',
                color: '#DA9101',
                confirmButtonColor: '#8B0001'
            });
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
                        <h1>ONLINE WETENG</h1>
                        <p>Premium Digital Numbers Game</p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Username or Email</label>
                            <input
                                id="login-username"
                                type="text"
                                className="form-input"
                                placeholder="Enter your username"
                                value={form.username}
                                onChange={e => setForm({ ...form, username: e.target.value })}
                                autoComplete="username"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    id="login-password"
                                    type={showPass ? 'text' : 'password'}
                                    className="form-input"
                                    placeholder="Enter your password"
                                    value={form.password}
                                    onChange={e => setForm({ ...form, password: e.target.value })}
                                    style={{ paddingRight: '48px' }}
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass(!showPass)}
                                    style={{
                                        position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                        background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer'
                                    }}
                                >
                                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            id="login-submit"
                            type="submit"
                            className="btn btn-gold btn-lg w-full"
                            disabled={loading}
                            style={{ marginTop: '8px' }}
                        >
                            {loading ? (
                                <>
                                    <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
                                    Authenticating...
                                </>
                            ) : (
                                <>
                                    <LogIn size={18} />
                                    Sign In
                                </>
                            )}
                        </button>
                    </form>

                    <div className="login-footer">
                        <Link to="/forgot-password">Forgot Password?</Link>
                        <div style={{ marginTop: '12px' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Need access? Contact an Administrator.</span>
                        </div>
                    </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    © 2026 Weteng Digital Platform. All rights reserved.
                </div>
            </div>
        </div>
    );
}
