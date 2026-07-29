import { Router } from 'express';
import { authenticate } from '@/middlewares/auth.middleware.js';
import { authorize } from '@/middlewares/authorize.middleware.js';
import { integrationsController } from '@/controllers/integrations.controller.js';

export const integrationsRouter = Router();

integrationsRouter.get(
  '/status',
  authenticate,
  authorize('settings.manage'),
  integrationsController.status,
);
