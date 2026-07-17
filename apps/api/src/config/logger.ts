import pino, { type Logger } from 'pino';
import { env } from '@/config/env';

const isDev = env.isDev;

export const logger: Logger = pino({
  name: env.APP_NAME,
  level: env.LOG_LEVEL,
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }
    : {}),
  base: {
    service: env.APP_NAME,
    env: env.NODE_ENV,
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'passwordHash',
      'token',
      'refreshToken',
      'accessToken',
    ],
    remove: true,
  },
});

export function createChildLogger(bindings: Record<string, unknown>): Logger {
  return logger.child(bindings);
}
