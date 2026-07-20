import { Router } from 'express';
import { authenticate } from '@/middlewares/auth.middleware';
import { authorize } from '@/middlewares/authorize.middleware';
import { integrationsController } from '@/controllers/integrations.controller';

export const integrationsRouter = Router();

integrationsRouter.get(
  '/status',
  authenticate,
  authorize('settings.manage'),
  integrationsController.status,
);
