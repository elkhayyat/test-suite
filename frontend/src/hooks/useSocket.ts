import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Use environment variable for WebSocket URL, fallback to current host
    const socketUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || '';
    const newSocket = io(socketUrl);
    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  return socket;
}