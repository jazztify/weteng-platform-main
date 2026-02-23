import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Eye, EyeOff } from 'lucide-react';
import Swal from 'sweetalert2';

export default function RegisterPage() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        username: '', email: '', password: '', fullName: '', phone: '', role: 'kubrador'
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.username || !form.email || !form.password || !form.fullName) {
            Swal.fire({ title: 'Missing Fields', text: 'Please fill in all required fields.', icon: 'warning', background: '#1E1E1F', color: '#DA9101', confirmButtonColor: '#8B0001' });
            return;
        }
        setLoading(true);
        try {
            await register(form);
            Swal.fire({ title: 'Account Created!', text: 'Welcome to Weteng Digital.', icon: 'success', timer: 1500, showConfirmButton: false, background: '#1E1E1F', color: '#DA9101' });
            navigate('/dashboard');
        } catch (err) {
            Swal.fire({ title: 'Registration Failed', text: err.message, icon: 'error', background: '#1E1E1F', color: '#DA9101', confirmButtonColor: '#8B0001' });
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
                        <p>Create Your Account</p>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Full Name *</label>
                            <input id="reg-fullname" type="text" className="form-input" placeholder="Juan Dela Cruz" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} />
                        </div>
                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label">Username *</label>
                                <input id="reg-username" type="text" className="form-input" placeholder="juandc" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Phone</label>
                                <input id="reg-phone" type="tel" className="form-input" placeholder="+63-917-..." value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email *</label>
                            <input id="reg-email" type="email" className="form-input" placeholder="juan@email.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Password *</label>
                            <div style={{ position: 'relative' }}>
                                <input id="reg-password" type={showPass ? 'text' : 'password'} className="form-input" placeholder="Minimum 6 characters" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} style={{ paddingRight: '48px' }} />
                                <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                        <button id="reg-submit" type="submit" className="btn btn-gold btn-lg w-full" disabled={loading} style={{ marginTop: '8px' }}>
                            {loading ? <><div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>Creating...</> : <><UserPlus size={18} />Create Account</>}
                        </button>
                    </form>
                    <div className="login-footer">
                        <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Already have an account? </span>
                        <Link to="/login">Sign In</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
