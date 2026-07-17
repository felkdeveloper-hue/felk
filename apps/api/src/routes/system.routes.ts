import { Router } from 'express';
import { healthController, versionController } from '@/controllers';

export const systemRouter = Router();

systemRouter.get('/health', healthController.live);
systemRouter.get('/health/ready', healthController.ready);
systemRouter.get('/health/live', healthController.live);
systemRouter.get('/metrics', healthController.metrics);
systemRouter.get('/version', versionController.get);
