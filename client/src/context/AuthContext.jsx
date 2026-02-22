import { createContext, useContext, useState, useEffect } from 'react';
import { getMe, login as loginApi, logout as logoutApi, register as registerApi } from '../api';

const AuthContext = createContext(null);

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Check for stored session on mount
    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('weteng_token');
            if (token) {
                try {
                    const res = await getMe();
                    setUser(res.data.user);
                } catch {
                    localStorage.removeItem('weteng_token');
                    localStorage.removeItem('weteng_user');
                }
            }
            setLoading(false);
        };
        checkAuth();
    }, []);

    const login = async (credentials) => {
        setError(null);
        try {
            const res = await loginApi(credentials);
            const { token, user } = res.data;
            localStorage.setItem('weteng_token', token);
            localStorage.setItem('weteng_user', JSON.stringify(user));
            setUser(user);
            return user;
        } catch (err) {
            const msg = err.response?.data?.message || 'Login failed';
            setError(msg);
            throw new Error(msg);
        }
    };

    const register = async (data) => {
        setError(null);
        try {
            const res = await registerApi(data);
            const { token, user } = res.data;
            localStorage.setItem('weteng_token', token);
            localStorage.setItem('weteng_user', JSON.stringify(user));
            setUser(user);
            return user;
        } catch (err) {
            const msg = err.response?.data?.message || 'Registration failed';
            setError(msg);
            throw new Error(msg);
        }
    };

    const logout = async () => {
        try {
            await logoutApi();
        } catch {
            // ignore
        }
        localStorage.removeItem('weteng_token');
        localStorage.removeItem('weteng_user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, error, login, register, logout, setUser }}>
            {children}
        </AuthContext.Provider>
    );
};
