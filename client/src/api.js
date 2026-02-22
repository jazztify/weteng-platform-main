import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

const api = axios.create({
    baseURL: API_BASE,
    headers: { 'Content-Type': 'application/json' }
});

// Attach JWT token to every request
api.interceptors.request.use(config => {
    const token = localStorage.getItem('weteng_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 responses
api.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401) {
            localStorage.removeItem('weteng_token');
            localStorage.removeItem('weteng_user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth
export const login = (data) => api.post('/auth/login', data);
export const register = (data) => api.post('/auth/register', data);
export const getMe = () => api.get('/auth/me');
export const logout = () => api.post('/auth/logout');
export const forgotPassword = (email) => api.post('/auth/forgot-password', { email });
export const resetPassword = (token, password) => api.post(`/auth/reset-password/${token}`, { password });

// Users
export const getUsers = (params) => api.get('/users', { params });
export const getUserHierarchy = () => api.get('/users/hierarchy');
export const getMyTeam = () => api.get('/users/my-team');
export const getUser = (id) => api.get(`/users/${id}`);
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/users/${id}`);

// Bets
export const placeBet = (data) => api.post('/bets', data);
export const getBets = (params) => api.get('/bets', { params });
export const getBet = (id) => api.get(`/bets/${id}`);
export const cancelBet = (id) => api.put(`/bets/${id}/cancel`);
export const batchSyncBets = (bets) => api.post('/bets/batch', { bets });

// Draws
export const createDraw = (data) => api.post('/draws', data);
export const getDraws = (params) => api.get('/draws', { params });
export const getActiveDraws = () => api.get('/draws/active');
export const getDraw = (id) => api.get(`/draws/${id}`);
export const openDraw = (id) => api.put(`/draws/${id}/open`);
export const lockDraw = (id) => api.put(`/draws/${id}/lock`);
export const executeDraw = (id, data) => api.put(`/draws/${id}/execute`, data);
export const getDrawWinners = (id) => api.get(`/draws/${id}/winners`);

// Transactions
export const requestDeposit = (data) => api.post('/transactions/deposit', data);
export const getPendingTransactions = () => api.get('/transactions/pending');
export const approveTransaction = (id) => api.put(`/transactions/${id}/approve`);
export const rejectTransaction = (id, reason) => api.put(`/transactions/${id}/reject`, { reason });

// Dashboard
export const getDashboardStats = () => api.get('/dashboard/stats');
export const getTransactions = (params) => api.get('/dashboard/transactions', { params });
export const getHotNumbers = () => api.get('/dashboard/hot-numbers');
export const getAuditData = () => api.get('/dashboard/audit');

// Deposits (Pay-In) - Legacy (Using Transactions now as requested)
export const getDeposits = (params) => api.get('/deposits', { params });
export const approveDeposit = (id) => api.put(`/deposits/${id}/approve`);
export const rejectDeposit = (id, reason) => api.put(`/deposits/${id}/reject`, { reason });
export const getDepositPendingCount = () => api.get('/deposits/pending-count');

// Remittances (Pay-Out)
export const submitRemittance = (data) => api.post('/remittances', data);
export const getRemittances = (params) => api.get('/remittances', { params });
export const verifyRemittance = (id) => api.put(`/remittances/${id}/verify`);
export const rejectRemittance = (id, reason) => api.put(`/remittances/${id}/reject`, { reason });
export const getRemittancePendingCount = () => api.get('/remittances/pending-count');

// Settings
export const getSettings = () => api.get('/settings');
export const updateSettings = (data) => api.put('/settings', data);

export default api;
