import { useState, useEffect } from 'react';
import { getUsers, updateUser, createUser } from '../api';
import { useAuth } from '../context/AuthContext';
import { Users as UsersIcon, Search, Shield, UserCheck, UserX, RefreshCw, Plus, X } from 'lucide-react';
import Swal from 'sweetalert2';

export default function UsersPage() {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [formData, setFormData] = useState({
        username: '', email: '', password: '', fullName: '', role: 'kubrador', cell: '', phone: ''
    });

    useEffect(() => {
        loadUsers();
    }, [roleFilter]);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const params = { limit: 100 };
            if (roleFilter) params.role = roleFilter;
            if (search) params.search = search;
            const res = await getUsers(params);
            setUsers(res.data.users || []);
        } catch (err) {
            console.error('Failed to load users:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        loadUsers();
    };

    const handleToggleStatus = async (userId, currentStatus) => {
        const confirm = await Swal.fire({
            title: currentStatus ? 'Deactivate User?' : 'Activate User?',
            text: currentStatus ? 'User will not be able to login.' : 'User will be re-enabled.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: currentStatus ? '#8B0001' : '#006A4F',
            cancelButtonColor: '#333',
            confirmButtonText: currentStatus ? 'Deactivate' : 'Activate',
            background: '#1E1E1F',
            color: '#DA9101'
        });

        if (!confirm.isConfirmed) return;

        try {
            await updateUser(userId, { isActive: !currentStatus });
            Swal.fire({ title: 'Updated!', icon: 'success', timer: 1000, showConfirmButton: false, background: '#1E1E1F', color: '#DA9101' });
            loadUsers();
        } catch {
            Swal.fire({ title: 'Error', text: 'Failed to update user.', icon: 'error', background: '#1E1E1F', color: '#DA9101', confirmButtonColor: '#8B0001' });
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setCreating(true);
        try {
            await createUser(formData);
            Swal.fire({ title: 'User Created', icon: 'success', timer: 1500, showConfirmButton: false, background: '#1E1E1F', color: '#DA9101' });
            setShowModal(false);
            setFormData({ username: '', email: '', password: '', fullName: '', role: 'kubrador', cell: '', phone: '' });
            loadUsers();
        } catch (err) {
            Swal.fire({ title: 'Error', text: err.response?.data?.message || 'Failed to create user.', icon: 'error', background: '#1E1E1F', color: '#DA9101', confirmButtonColor: '#8B0001' });
        } finally {
            setCreating(false);
        }
    };

    const getRoleIcon = (role) => {
        const icons = {
            admin: '👑',
            bankero: '💰',
            cabo: '📋',
            kubrador: '🏃'
        };
        return icons[role] || '👤';
    };

    const getRoleBadge = (role) => {
        const map = {
            admin: 'badge-red',
            bankero: 'badge-gold',
            cabo: 'badge-green',
            kubrador: 'badge-gray'
        };
        return <span className={`badge ${map[role] || 'badge-gray'}`}>{getRoleIcon(role)} {role.toUpperCase()}</span>;
    };

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700 }}>User Management</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Manage kubradors, cabos, and bankeros</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn btn-ghost btn-sm" onClick={loadUsers}><RefreshCw size={14} /> Refresh</button>
                    {user?.role === 'admin' && (
                        <button className="btn btn-gold btn-sm" onClick={() => setShowModal(true)}>
                            <Plus size={16} /> Add User
                        </button>
                    )}
                </div>
            </div>

            {/* Create User Modal */}
            {showModal && (
                <div className="receipt-modal-backdrop" style={{ zIndex: 1100 }}>
                    <div className="receipt-modal-content" style={{ maxWidth: '500px', padding: '24px' }}>
                        <button className="receipt-close-btn" onClick={() => setShowModal(false)}><X size={20} /></button>
                        <h2 style={{ fontSize: '18px', marginBottom: '20px', color: 'var(--gold)', fontFamily: 'var(--font-display)' }}>Create New User</h2>

                        <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Full Name</label>
                                <input type="text" className="form-input" required value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} placeholder="Juan Dela Cruz" />
                            </div>
                            <div className="grid-2">
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Username</label>
                                    <input type="text" className="form-input" required value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Password</label>
                                    <input type="text" className="form-input" required value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid-2">
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Email</label>
                                    <input type="email" className="form-input" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Role</label>
                                    <select className="form-select" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                                        <option value="kubrador">Kubrador</option>
                                        <option value="cabo">Cabo</option>
                                        <option value="bankero">Bankero</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Station / Location (Cell)</label>
                                <input type="text" className="form-input" value={formData.cell} onChange={e => setFormData({ ...formData, cell: e.target.value })} placeholder="Makati Branch, Online, etc." />
                            </div>
                            <button type="submit" className="btn btn-gold w-full" disabled={creating} style={{ marginTop: '10px' }}>
                                {creating ? 'Creating...' : 'Create Account'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="card mb-3">
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <form onSubmit={handleSearch} style={{ flex: 1, minWidth: '200px' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Search by name, username, or email..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                style={{ paddingLeft: '36px' }}
                            />
                        </div>
                    </form>
                    <select className="form-select" value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ width: '180px' }}>
                        <option value="">All Roles</option>
                        <option value="admin">Admin</option>
                        <option value="bankero">Bankero</option>
                        <option value="cabo">Cabo</option>
                        <option value="kubrador">Kubrador</option>
                    </select>
                </div>
            </div>

            {/* Role Summary Cards */}
            <div className="stats-grid" style={{ marginBottom: '24px' }}>
                <div className="stat-card gold" onClick={() => setRoleFilter('bankero')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon gold"><Shield size={24} /></div>
                    <div className="stat-info">
                        <h3>Bankeros</h3>
                        <div className="stat-value">{users.filter(u => u.role === 'bankero').length}</div>
                    </div>
                </div>
                <div className="stat-card green" onClick={() => setRoleFilter('cabo')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon green"><UserCheck size={24} /></div>
                    <div className="stat-info">
                        <h3>Cabos</h3>
                        <div className="stat-value">{users.filter(u => u.role === 'cabo').length}</div>
                    </div>
                </div>
                <div className="stat-card red" onClick={() => setRoleFilter('kubrador')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon red"><UsersIcon size={24} /></div>
                    <div className="stat-info">
                        <h3>Kubradors</h3>
                        <div className="stat-value">{users.filter(u => u.role === 'kubrador').length}</div>
                    </div>
                </div>
            </div>

            {/* Users Table */}
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="spinner"></div></div>
            ) : (
                <div className="data-table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Role</th>
                                <th>Cell</th>
                                <th>Balance</th>
                                <th>Commission Rate</th>
                                <th>Collections</th>
                                <th>Status</th>
                                <th>Last Login</th>
                                {(user.role === 'admin' || user.role === 'bankero') && <th>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u._id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{
                                                width: '34px', height: '34px', borderRadius: '50%',
                                                background: 'var(--gold-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontWeight: 700, fontSize: '12px', color: '#000', flexShrink: 0
                                            }}>
                                                {u.fullName?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>{u.fullName}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>@{u.username}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>{getRoleBadge(u.role)}</td>
                                    <td style={{ color: 'var(--text-muted)' }}>{u.cell || '—'}</td>
                                    <td style={{ color: 'var(--gold)', fontWeight: 600 }}>₱{(u.balance || 0).toLocaleString()}</td>
                                    <td>{((u.commissionRate || 0) * 100).toFixed(0)}%</td>
                                    <td>₱{(u.totalCollections || 0).toLocaleString()}</td>
                                    <td>
                                        <span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>
                                            {u.isActive ? 'ACTIVE' : 'INACTIVE'}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                        {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('en-PH') : 'Never'}
                                    </td>
                                    {(user.role === 'admin' || user.role === 'bankero') && (
                                        <td>
                                            <button
                                                className={`btn btn-sm ${u.isActive ? 'btn-red' : 'btn-outline'}`}
                                                onClick={() => handleToggleStatus(u._id, u.isActive)}
                                                style={{ fontSize: '11px' }}
                                            >
                                                {u.isActive ? <><UserX size={12} /> Disable</> : <><UserCheck size={12} /> Enable</>}
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {!loading && users.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                    <UsersIcon size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                    <p>No users found.</p>
                </div>
            )}
        </div>
    );
}
