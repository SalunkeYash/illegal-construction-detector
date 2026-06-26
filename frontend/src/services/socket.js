import { io } from 'socket.io-client';

const BACKEND_URL = 'http://localhost:5000';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(BACKEND_URL, {
      path: '/socket.io',
      transports: ['polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });


    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.log('[Socket] Connection error:', err.message);
    });
  }
  return socket;
}

export function getLiveSocket() {
  if (!socket) {
    getSocket();
  }

  // Connect to /live namespace
  const liveSocket = io(`${BACKEND_URL}/live`, {
    path: '/socket.io',
    transports: ['polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  liveSocket.on('connect', () => {
    console.log('[LiveSocket] Connected to /live');
  });

  liveSocket.on('disconnect', (reason) => {
    console.log('[LiveSocket] Disconnected:', reason);
  });

  return liveSocket;
}

export default getSocket;
