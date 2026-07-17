import type { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import { appConfig } from '@/config/app.config';
import { openApiSpec } from '@/config/swagger';

export function setupSwagger(app: Express): void {
  if (!appConfig.security.swaggerEnabled) {
    return;
  }

  app.use(
    appConfig.server.docsPath,
    swaggerUi.serve,
    swaggerUi.setup(openApiSpec as object, {
      explorer: true,
      customSiteTitle: `${appConfig.app.name} API Docs`,
    }),
  );
}
