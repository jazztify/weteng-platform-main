import { createContext, useState, useEffect, useContext } from 'react';
import { getSettings } from '../api';
import { useSocket } from './SocketContext';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState({
        maxNumber: 37,
        payoutMultiplier: 400,
        pompyangMultiplier: 800,
        drawSchedule: ['11:00 AM', '04:00 PM', '09:00 PM']
    });
    const { socket } = useSocket();

    const fetchSettings = async () => {
        try {
            const res = await getSettings();
            if (res.data?.settings) {
                setSettings(res.data.settings);
            }
        } catch (err) {
            console.error('Failed to load settings:', err);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    useEffect(() => {
        if (!socket) return;

        socket.on('SETTINGS_UPDATED', (newSettings) => {
            setSettings(newSettings);
        });

        return () => {
            socket.off('SETTINGS_UPDATED');
        };
    }, [socket]);

    return (
        <SettingsContext.Provider value={{ settings, fetchSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};
