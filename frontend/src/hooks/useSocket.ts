import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Use environment variable for WebSocket URL
    const apiUrl = import.meta.env.VITE_API_BASE_URL;
    let socketUrl: string;
    
    if (apiUrl && apiUrl !== '/api') {
      // Remove /api suffix if present
      socketUrl = apiUrl.replace(/\/api\/?$/, '');
    } else {
      // In development, use empty string to connect to the serving origin
      socketUrl = '';
    }
    
    console.log('[Socket] Connecting to:', socketUrl || 'current origin');
    const newSocket = io(socketUrl);
    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  return socket;
}