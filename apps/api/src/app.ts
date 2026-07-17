import path from 'node:path';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Application } from 'express';
import helmet from 'helmet';
import { appConfig, corsOptions, helmetOptions, setupSwagger } from '@/config';
import {
  csrfProtectionMiddleware,
  errorHandler,
  globalRateLimiter,
  mongoSanitizeMiddleware,
  notFoundHandler,
  requestIdMiddleware,
  requestLoggerMiddleware,
} from '@/middlewares';
import { v1Router } from '@/routes';
import { ApiResponse } from '@/utils/response/api-response';

export function createApp(): Application {
  const app = express();

  app.set('trust proxy', appConfig.server.trustProxy);
  app.disable('x-powered-by');

  app.use(requestIdMiddleware);
  app.use(helmet(helmetOptions));
  app.use(cors(corsOptions));
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

  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

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
