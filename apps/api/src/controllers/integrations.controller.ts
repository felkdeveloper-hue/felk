import { ApiResponse } from '@/utils/response/api-response';
import { asyncHandler } from '@/utils/async-handler';
import { integrationsStatusService } from '@/services/integrations-status.service';

export const integrationsController = {
  status: asyncHandler(async (_req, res) => {
    const status = await integrationsStatusService.getStatus();
    ApiResponse.success(res, status, 'Integrations status');
  }),
};
