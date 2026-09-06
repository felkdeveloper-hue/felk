import type { Request, Response } from 'express';
import { logger } from '@/config/logger.js';
import { customerService } from '@/services/customer.service.js';
import { anonymousFlashSaleService } from '@/services/anonymous-flash-sale.service.js';
import { applyFlashSaleCookie } from '@/utils/flash-sale-cookie.util.js';

/**
 * Copy an active guest (IP/cookie) flash-sale window onto the customer
 * without resetting remaining time. Safe to call on every login/signup.
 */
export async function persistGuestFlashSaleOnAuth(
  req: Request,
  res: Response,
  userId?: string | null,
): Promise<void> {
  if (!userId) return;
  try {
    const customer = await customerService.getByUserId(userId);
    if (!customer) return;
    const status = await anonymousFlashSaleService.adoptActiveWindow(
      req,
      customer._id,
      customer.flashSaleStartTime,
    );
    applyFlashSaleCookie(res, status);
  } catch (err) {
    logger.warn({ err, userId }, 'Flash sale persist on auth failed');
  }
}
