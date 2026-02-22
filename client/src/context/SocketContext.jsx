import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const [connected, setConnected] = useState(false);
    const socketRef = useRef(null);

    useEffect(() => {
        const SOCKET_URL = import.meta.env.VITE_API_URL || '/';
        const socket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000
        });

        socket.on('connect', () => {
            setConnected(true);
            console.log('🔌 Socket connected');
        });

        socket.on('disconnect', () => {
            setConnected(false);
            console.log('🔌 Socket disconnected');
        });

        socketRef.current = socket;

        return () => {
            socket.disconnect();
        };
    }, []);

    return (
        <SocketContext.Provider value={{ socket: socketRef.current, connected }}>
            {children}
        </SocketContext.Provider>
    );
};
