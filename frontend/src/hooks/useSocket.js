import { useState, useEffect, useRef } from 'react';
import { getLiveSocket } from '../services/socket';

export function useSocket() {
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = getLiveSocket();
    socketRef.current = socket;

    const onConnect = () => {
      setConnected(true);
      setReconnecting(false);
    };

    const onDisconnect = () => {
      setConnected(false);
    };

    const onReconnectAttempt = () => {
      setReconnecting(true);
    };

    const onReconnect = () => {
      setConnected(true);
      setReconnecting(false);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.io.on('reconnect_attempt', onReconnectAttempt);
    socket.io.on('reconnect', onReconnect);

    if (socket.connected) {
      setConnected(true);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.io.off('reconnect_attempt', onReconnectAttempt);
      socket.io.off('reconnect', onReconnect);
    };
  }, []);

  return { socket: socketRef.current, connected, reconnecting };
}

export default useSocket;
