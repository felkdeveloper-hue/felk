import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { verifyAccessToken } from '@/services/token.service.js';
import { authService } from '@/services/auth.service.js';
import { userHasPermission } from '@/services/rbac.service.js';
import { PERMISSIONS } from '@/constants/permissions.js';
import { logger } from '@/config/index.js';
import { humanizeActivityLabel } from './activity-labels.util.js';
import { FEED_NAMES } from './activity.service.js';
import { getActiveCount } from './live.service.js';

const ROOM = 'analytics:live';

let io: Server | null = null;

export function initAnalyticsLiveGateway(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    path: '/socket.io',
    cors: { origin: true, credentials: true },
  });

  io.of('/analytics').on('connection', async (socket) => {
    try {
      const token =
        (socket.handshake.auth?.token as string | undefined) ||
        (socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, '') as string | undefined);
      if (!token) {
        socket.disconnect(true);
        return;
      }
      const payload = verifyAccessToken(token);
      const user = await authService.buildAuthenticatedUser({
        userId: payload.sub,
        sessionId: payload.sid,
      });
      const allowed = userHasPermission(
        user.permissions as never,
        [PERMISSIONS.ANALYTICS_VIEW, PERMISSIONS.REPORTS_VIEW],
        'any',
      );
      if (!allowed) {
        socket.disconnect(true);
        return;
      }
      void socket.join(ROOM);
      const online = await getActiveCount().catch(() => 0);
      socket.emit('analytics:online', { count: online });
    } catch (err) {
      logger.debug({ err }, 'Analytics socket auth failed');
      socket.disconnect(true);
    }
  });

  setInterval(() => {
    void getActiveCount()
      .then((count) => {
        io?.of('/analytics').to(ROOM).emit('analytics:online', { count });
      })
      .catch(() => undefined);
  }, 15_000);

  logger.info('Analytics Socket.IO gateway ready (/analytics)');
  return io;
}

export function publishAnalyticsActivity(event: {
  eventId: string;
  name: string;
  occurredAt?: Date;
  userId?: string | null;
  path?: string | null;
  sessionId?: string | null;
  properties?: Record<string, unknown>;
  userName?: string | null;
}): void {
  if (!io) return;
  if (!FEED_NAMES.includes(event.name)) return;

  const productName = (event.properties?.productName as string) || null;
  const query = (event.properties?.query as string) || null;
  const payload = {
    id: event.eventId,
    at: (event.occurredAt ?? new Date()).toISOString(),
    name: event.name,
    label: humanizeActivityLabel(event.name, {
      userName: event.userName,
      productName,
      query,
    }),
    userName: event.userName ?? null,
    productName,
    path: event.path ?? null,
    sessionId: event.sessionId ?? null,
  };

  try {
    io.of('/analytics').to(ROOM).emit('analytics:activity', payload);
  } catch {
    /* never break ingest */
  }
}
