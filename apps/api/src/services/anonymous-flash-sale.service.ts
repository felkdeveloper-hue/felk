import type { Request } from 'express';
import type { Types } from 'mongoose';
import { FLASH_SALE_DISCOUNT } from '@/constants/checkout.js';
import { AnonymousFlashSaleModel } from '@/models/anonymous-flash-sale.model.js';
import { hashIpFromRequest } from '@/utils/ip-hash.util.js';

const LOGIN_BONUS_THRESHOLD_MS = 5 * 60 * 1000;
const LOGIN_BONUS_MS = 15 * 60 * 1000;

export interface FlashSaleStatusPayload {
  flashSaleStartTime: string | null;
  isActive: boolean;
  expiresAt: string | null;
  loginBonusApplied?: boolean;
}

function remainingMs(startTime: Date): number {
  const elapsed = Date.now() - startTime.getTime();
  return Math.max(0, FLASH_SALE_DISCOUNT.DURATION_MS - elapsed);
}

function buildStatus(
  startTime: Date,
  extras?: { loginBonusApplied?: boolean },
): FlashSaleStatusPayload {
  const remaining = remainingMs(startTime);
  const isActive = remaining > 0;
  return {
    flashSaleStartTime: startTime.toISOString(),
    isActive,
    expiresAt: isActive
      ? new Date(startTime.getTime() + FLASH_SALE_DISCOUNT.DURATION_MS).toISOString()
      : null,
    ...extras,
  };
}

function applyLoginBonusIfLowTime(startTime: Date): {
  startTime: Date;
  loginBonusApplied: boolean;
} {
  const remaining = remainingMs(startTime);
  if (remaining <= 0 || remaining >= LOGIN_BONUS_THRESHOLD_MS) {
    return { startTime, loginBonusApplied: false };
  }
  return {
    startTime: new Date(startTime.getTime() - LOGIN_BONUS_MS),
    loginBonusApplied: true,
  };
}

class AnonymousFlashSaleService {
  /** Keep IP record aligned with the active customer timer (survives logout). */
  async syncIpRecord(req: Request, startTime: Date): Promise<void> {
    const ipHash = hashIpFromRequest(req);
    await AnonymousFlashSaleModel.findOneAndUpdate(
      { ipHash },
      {
        $set: {
          flashSaleStartTime: startTime,
          transferredAt: null,
          transferredToCustomerId: null,
        },
      },
      { upsert: true },
    );
  }

  /** Get or create a 60-minute anonymous flash sale keyed by request IP. */
  async getOrCreateForRequest(req: Request): Promise<FlashSaleStatusPayload> {
    const ipHash = hashIpFromRequest(req);
    let record = await AnonymousFlashSaleModel.findOne({ ipHash });

    if (!record) {
      const now = new Date();
      try {
        record = await AnonymousFlashSaleModel.create({
          ipHash,
          flashSaleStartTime: now,
        });
      } catch {
        record = await AnonymousFlashSaleModel.findOne({ ipHash });
        if (!record) {
          return {
            flashSaleStartTime: null,
            isActive: false,
            expiresAt: null,
          };
        }
      }
    } else if (remainingMs(record.flashSaleStartTime) <= 0) {
      const now = new Date();
      record.flashSaleStartTime = now;
      record.transferredAt = null;
      record.transferredToCustomerId = null;
      await record.save();
    }

    return buildStatus(record.flashSaleStartTime);
  }

  /** Read anonymous flash sale for IP without creating a new window. */
  async getForRequest(req: Request): Promise<FlashSaleStatusPayload | null> {
    const ipHash = hashIpFromRequest(req);
    const record = await AnonymousFlashSaleModel.findOne({ ipHash });
    if (!record) return null;
    return buildStatus(record.flashSaleStartTime);
  }

  /**
   * Copy an active anonymous timer to a customer account.
   * Preserves elapsed time; grants +15 min if less than 5 min remained.
   * IP record stays active so logout still shows the same countdown.
   */
  async transferToCustomer(
    req: Request,
    customerId: Types.ObjectId | string,
    updateCustomer: (startTime: Date) => Promise<void>,
  ): Promise<{ transferred: boolean; status: FlashSaleStatusPayload | null }> {
    const ipHash = hashIpFromRequest(req);
    const record = await AnonymousFlashSaleModel.findOne({ ipHash });
    if (!record) {
      return { transferred: false, status: null };
    }

    const remaining = remainingMs(record.flashSaleStartTime);
    if (remaining <= 0) {
      return { transferred: false, status: null };
    }

    const { startTime, loginBonusApplied } = applyLoginBonusIfLowTime(record.flashSaleStartTime);
    await updateCustomer(startTime);
    await this.syncIpRecord(req, startTime);

    return {
      transferred: true,
      status: buildStatus(startTime, { loginBonusApplied }),
    };
  }
}

export const anonymousFlashSaleService = new AnonymousFlashSaleService();

export { LOGIN_BONUS_THRESHOLD_MS, LOGIN_BONUS_MS, applyLoginBonusIfLowTime, remainingMs };
