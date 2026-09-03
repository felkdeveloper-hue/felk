import path from 'node:path';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Application } from 'express';
import helmet from 'helmet';
import { appConfig, corsOptions, helmetOptions, setupSwagger } from '@/config/index.js';
import {
  csrfProtectionMiddleware,
  errorHandler,
  globalRateLimiter,
  mongoSanitizeMiddleware,
  notFoundHandler,
  requestIdMiddleware,
  requestLoggerMiddleware,
} from '@/middlewares/index.js';
import { mediaRouter } from '@/routes/media.routes.js';
import { v1Router } from '@/routes/index.js';
import { ApiResponse } from '@/utils/response/api-response.js';

export function createApp(): Application {
  const app = express();

  app.set('trust proxy', appConfig.server.trustProxy);
  app.disable('x-powered-by');

  app.use(requestIdMiddleware);
  app.use(helmet(helmetOptions));
  app.use(cors(corsOptions));
  // Serve catalog images before compression / rate-limit so a grid of photos
  // cannot get 429'd and is not re-compressed as gzip.
  app.use('/media', mediaRouter);
  app.use(`${appConfig.server.apiPrefix}/media`, mediaRouter);
  app.use(compression());
  const captureRawBody = (req: express.Request, _res: express.Response, buf: Buffer) => {
    req.rawBody = buf;
  };
  app.use(express.json({ limit: '1mb', verify: captureRawBody }));
  app.use(express.urlencoded({ extended: true, limit: '1mb', verify: captureRawBody }));
  app.use(cookieParser(appConfig.cookie.secret));
  app.use(mongoSanitizeMiddleware);
  app.use(requestLoggerMiddleware);
  app.use(globalRateLimiter);
  app.use(csrfProtectionMiddleware);

  app.use(
    '/uploads',
    express.static(path.resolve(process.cwd(), 'uploads'), {
      maxAge: '7d',
      etag: true,
      lastModified: true,
      setHeaders(res, filePath) {
        if (/\.(webp|avif|jpe?g|png|gif|svg)$/i.test(filePath)) {
          res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
        }
      },
    }),
  );

  setupSwagger(app);

  app.get('/', (_req, res) => {
    ApiResponse.success(
      res,
      {
        name: appConfig.app.name,
        version: appConfig.app.version,
        apiPrefix: appConfig.server.apiPrefix,
        docs: appConfig.security.swaggerEnabled ? appConfig.server.docsPath : null,
      },
      'FE Platform API',
    );
  });

  app.use(appConfig.server.apiPrefix, v1Router);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
