import { ApiResponse } from '@/utils/response/api-response.js';
import { asyncHandler } from '@/utils/async-handler.js';
import { integrationsStatusService } from '@/services/integrations-status.service.js';

export const integrationsController = {
  status: asyncHandler(async (_req, res) => {
    const status = await integrationsStatusService.getStatus();
    ApiResponse.success(res, status, 'Integrations status');
  }),
};
