import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
    LayoutDashboard, Dices, CalendarClock, Users, Receipt,
    LogOut, Menu, X, Wifi, WifiOff,
    Wallet, ArrowUpCircle, ArrowDownCircle, Eye, Shield,
    BadgeDollarSign, Send, CheckCircle2, Flame, Settings
} from 'lucide-react';

const roleLabels = {
    admin: 'System Administrator',
    bankero: 'Bankero / Kapitalista',
    cabo: 'Cabo / Supervisor',
    kubrador: 'Kubrador / Collector',
    player: 'Player / Manlalaro'
};

const roleSectionTitle = {
    admin: 'Administration',
    bankero: 'Financial Control',
    cabo: 'Team Operations',
    kubrador: 'Collection Hub',
    player: 'My Account'
};

export default function Layout() {
    const { user, logout } = useAuth();
    const { connected } = useSocket();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // ─── Role-Specific Navigation ───
    const getNavItems = () => {
        const role = user?.role;

        const shared = [
            { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        ];

        if (role === 'admin') {
            return [
                ...shared,
                { path: '/admin/war-room', icon: Flame, label: 'Bolahan War Room' },
                { path: '/draws', icon: CalendarClock, label: 'Draw Management' },
                { path: '/betting', icon: Dices, label: 'Betting POS' },
                { path: '/bet-logs', icon: Receipt, label: 'Bet Logs' },
                { path: '/users', icon: Users, label: 'User Management' },
                { path: '/admin/deposit-approvals', icon: ArrowDownCircle, label: 'Deposit Approvals' },
                { path: '/remittances', icon: Send, label: 'Remittances' },
                { path: '/transactions', icon: Receipt, label: 'Transactions' },
                { path: '/admin/settings', icon: Settings, label: 'System Settings' },
            ];
        }

        if (role === 'bankero') {
            return [
                ...shared,
                { path: '/deposits', icon: ArrowDownCircle, label: 'Deposit Approvals' },
                { path: '/remittances', icon: BadgeDollarSign, label: 'Remittance Inflow' },
                { path: '/draws', icon: CalendarClock, label: 'Draw Schedule' },
                { path: '/bet-logs', icon: Receipt, label: 'Platform Bet Logs' },
                { path: '/users', icon: Users, label: 'Network Overview' },
                { path: '/transactions', icon: Receipt, label: 'Financial Ledger' },
            ];
        }

        if (role === 'cabo') {
            return [
                ...shared,
                { path: '/remittances', icon: CheckCircle2, label: 'Remittance Verify' },
                { path: '/users', icon: Eye, label: 'Kubrador Monitoring' },
                { path: '/draws', icon: CalendarClock, label: 'Draws' },
                { path: '/bet-logs', icon: Receipt, label: 'Team Bet Logs' },
                { path: '/transactions', icon: Receipt, label: 'Transactions' },
            ];
        }

        if (role === 'kubrador') {
            return [
                ...shared,
                { path: '/betting', icon: Dices, label: 'Digital POS' },
                { path: '/bet-logs', icon: Receipt, label: 'Bet History' },
                { path: '/deposits', icon: ArrowDownCircle, label: 'Add / View Credit' },
                { path: '/remittances', icon: Send, label: 'Submit Remittance' },
                { path: '/draws', icon: CalendarClock, label: 'Draws' },
                { path: '/transactions', icon: Receipt, label: 'My Transactions' },
            ];
        }

        if (role === 'player') {
            return [
                ...shared,
                { path: '/wallet', icon: Wallet, label: 'My Wallet' },
                { path: '/bet-logs', icon: Receipt, label: 'My Bets' },
                { path: '/draws', icon: CalendarClock, label: 'Draws' },
                { path: '/transactions', icon: Receipt, label: 'History' },
            ];
        }

        return shared;
    };

    const navItems = getNavItems();

    const getPageTitle = () => {
        const current = navItems.find(i => location.pathname.startsWith(i.path));
        return current?.label || 'Dashboard';
    };

    const initials = user?.fullName?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'WG';

    const roleColorClass = {
        admin: 'role-admin',
        bankero: 'role-bankero',
        cabo: 'role-cabo',
        kubrador: 'role-kubrador',
        player: 'role-player'
    };

    return (
        <div className="app-layout">
            {/* Mobile overlay */}
            <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-brand">
                    <div className="brand-icon">W</div>
                    <div>
                        <h1>ONLINE WETENG</h1>
                        <div className="brand-subtitle">Digital Platform</div>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {/* Role section title */}
                    <div className="nav-section">
                        <div className="nav-section-title">{roleSectionTitle[user?.role] || 'Menu'}</div>
                        {navItems.map(item => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                                onClick={() => setSidebarOpen(false)}
                            >
                                <item.icon className="nav-icon" size={20} />
                                {item.label}
                            </NavLink>
                        ))}
                    </div>
                </nav>

                <div className="sidebar-footer">
                    <div className="sidebar-user">
                        <div className={`user-avatar ${roleColorClass[user?.role] || ''}`}>{initials}</div>
                        <div className="user-info">
                            <div className="user-name">{user?.fullName}</div>
                            <div className="user-role">{user?.role}</div>
                        </div>
                    </div>
                    <button
                        className="btn btn-ghost w-full mt-2"
                        onClick={logout}
                        style={{ justifyContent: 'flex-start', gap: '10px' }}
                    >
                        <LogOut size={16} />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                <header className="topbar">
                    <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button className="hamburger-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
                            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                        <div>
                            <h2>{getPageTitle()}</h2>
                            <p>{roleLabels[user?.role] || ''}</p>
                        </div>
                    </div>
                    <div className="topbar-right">
                        <div className="live-indicator">
                            {connected ? (
                                <>
                                    <span className="live-dot"></span>
                                    <Wifi size={14} />
                                    LIVE
                                </>
                            ) : (
                                <>
                                    <WifiOff size={14} />
                                    OFFLINE
                                </>
                            )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Balance:</span>
                            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--gold)', fontSize: '16px' }}>
                                ₱{(user?.balance || 0).toLocaleString()}
                            </span>
                        </div>
                    </div>
                </header>

                <div className="page-content">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
