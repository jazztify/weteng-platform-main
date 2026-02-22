import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { SettingsProvider } from './context/SettingsContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';
import BettingPOS from './pages/BettingPOS';
import DrawsPage from './pages/DrawsPage';
import UsersPage from './pages/UsersPage';
import TransactionsPage from './pages/TransactionsPage';
import DepositsPage from './pages/DepositsPage';
import RemittancesPage from './pages/RemittancesPage';
import PlayerWalletPage from './pages/PlayerWalletPage';
import WarRoomPage from './pages/WarRoomPage';
import DepositApprovalsPage from './pages/DepositApprovalsPage';
import SystemSettingsPage from './pages/SystemSettingsPage';
import Layout from './components/Layout';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <h2>WETENG</h2>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;

  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <h2>WETENG</h2>
      </div>
    );
  }
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />

      {/* Protected Routes */}
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="betting" element={
          <ProtectedRoute roles={['admin', 'kubrador', 'cabo']}>
            <BettingPOS />
          </ProtectedRoute>
        } />
        <Route path="draws" element={<DrawsPage />} />
        <Route path="admin/war-room" element={
          <ProtectedRoute roles={['admin']}>
            <WarRoomPage />
          </ProtectedRoute>
        } />
        <Route path="users" element={
          <ProtectedRoute roles={['admin', 'bankero', 'cabo']}>
            <UsersPage />
          </ProtectedRoute>
        } />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="deposits" element={
          <ProtectedRoute roles={['admin', 'bankero', 'player', 'kubrador', 'cabo']}>
            <DepositsPage />
          </ProtectedRoute>
        } />
        <Route path="admin/deposit-approvals" element={
          <ProtectedRoute roles={['admin']}>
            <DepositApprovalsPage />
          </ProtectedRoute>
        } />
        <Route path="admin/settings" element={
          <ProtectedRoute roles={['admin']}>
            <SystemSettingsPage />
          </ProtectedRoute>
        } />
        <Route path="remittances" element={
          <ProtectedRoute roles={['admin', 'bankero', 'cabo', 'kubrador']}>
            <RemittancesPage />
          </ProtectedRoute>
        } />
        <Route path="wallet" element={
          <ProtectedRoute roles={['player']}>
            <PlayerWalletPage />
          </ProtectedRoute>
        } />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <SocketProvider>
          <SettingsProvider>
            <AppRoutes />
          </SettingsProvider>
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
