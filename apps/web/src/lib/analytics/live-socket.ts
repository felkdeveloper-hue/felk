import { io, type Socket } from 'socket.io-client';
import type { ActivityFeedItem } from '@/services/sdk/admin';

type ActivityHandler = (item: ActivityFeedItem) => void;
type OnlineHandler = (count: number) => void;

let socket: Socket | null = null;

function socketUrl(): string {
  const api = import.meta.env.VITE_API_URL ?? '';
  if (api.startsWith('http')) {
    try {
      return new URL(api).origin;
    } catch {
      return window.location.origin;
    }
  }
  return window.location.origin;
}

export function connectAnalyticsSocket(opts: {
  token: string;
  onActivity: ActivityHandler;
  onOnline: OnlineHandler;
}): () => void {
  disconnectAnalyticsSocket();

  socket = io(`${socketUrl()}/analytics`, {
    path: '/socket.io',
    auth: { token: opts.token },
    transports: ['websocket', 'polling'],
    reconnection: true,
  });

  socket.on('analytics:activity', (payload: ActivityFeedItem) => {
    opts.onActivity(payload);
  });
  socket.on('analytics:online', (payload: { count: number }) => {
    opts.onOnline(payload.count ?? 0);
  });

  return () => disconnectAnalyticsSocket();
}

export function disconnectAnalyticsSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
