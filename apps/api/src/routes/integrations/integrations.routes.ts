import { Router } from 'express';
import { authenticate } from '@/middlewares/auth.middleware.js';
import { authorize } from '@/middlewares/authorize.middleware.js';
import { integrationsController } from '@/controllers/integrations.controller.js';
import { fedRouter } from '@/routes/integrations/fed.routes.js';

export const integrationsRouter = Router();

integrationsRouter.use('/fed', fedRouter);

integrationsRouter.get(
  '/status',
  authenticate,
  authorize('settings.manage'),
  integrationsController.status,
);
