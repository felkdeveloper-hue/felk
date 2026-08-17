import { Router } from 'express';
import { asyncHandler } from '@/utils/async-handler.js';
import { ApiResponse } from '@/utils/response/api-response.js';
import { orderShipmentService } from '@/services/order-shipment.service.js';

/**
 * Public FED Reverse API webhook — FED POSTs form data when parcel status changes.
 * Must always return 200 so FED does not retry endlessly.
 */
export const fedRouter = Router();

fedRouter.post(
  '/webhook',
  asyncHandler(async (req, res) => {
    const body =
      req.body && typeof req.body === 'object'
        ? (req.body as Record<string, unknown>)
        : {};

    const result = await orderShipmentService.handleFedWebhook(body);
    ApiResponse.success(res, result, 'FED webhook processed');
  }),
);
