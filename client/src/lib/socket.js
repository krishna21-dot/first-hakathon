import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_SERVER_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '');

export const socket = io(URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 20,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  transports: ['websocket', 'polling'],
});

export default socket;
