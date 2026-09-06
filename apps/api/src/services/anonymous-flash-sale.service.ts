import type { Request } from 'express';
import type { Types } from 'mongoose';
import { FLASH_SALE_DISCOUNT } from '@/constants/checkout.js';
import { AnonymousFlashSaleModel } from '@/models/anonymous-flash-sale.model.js';
import { CustomerModel } from '@/models/customer.models.js';
import { hashIpFromRequest } from '@/utils/ip-hash.util.js';
import { readFlashSaleCookie } from '@/utils/flash-sale-cookie.util.js';

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

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function isActiveWindow(startTime: Date | string | null | undefined): startTime is Date | string {
  const date = toDate(startTime ?? null);
  return Boolean(date && remainingMs(date) > 0);
}

function buildStatus(
  startTime: Date | null,
  extras?: { loginBonusApplied?: boolean },
): FlashSaleStatusPayload {
  if (!startTime) {
    return {
      flashSaleStartTime: null,
      isActive: false,
      expiresAt: null,
      ...extras,
    };
  }
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
  // Move start forward so expiresAt (start + 1h) is later — never past a full hour.
  const extendedStartMs = Math.min(Date.now(), startTime.getTime() + LOGIN_BONUS_MS);
  return {
    startTime: new Date(extendedStartMs),
    loginBonusApplied: true,
  };
}

/** Prefer the earliest still-active start so login never resets the clock. */
function earliestActiveStart(candidates: Array<Date | null | undefined>): Date | null {
  const active = candidates
    .map((value) => toDate(value ?? null))
    .filter((value): value is Date => Boolean(value && remainingMs(value) > 0));
  if (!active.length) return null;
  return active.reduce((earliest, next) =>
    next.getTime() < earliest.getTime() ? next : earliest,
  );
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

  /** Get or create a 60-minute anonymous flash sale keyed by request IP (+ cookie fallback). */
  async getOrCreateForRequest(req: Request): Promise<FlashSaleStatusPayload> {
    const ipHash = hashIpFromRequest(req);
    const cookieStart = readFlashSaleCookie(req);
    let record = await AnonymousFlashSaleModel.findOne({ ipHash });

    if (!record) {
      const startTime = cookieStart && remainingMs(cookieStart) > 0 ? cookieStart : new Date();
      try {
        record = await AnonymousFlashSaleModel.create({
          ipHash,
          flashSaleStartTime: startTime,
        });
      } catch {
        record = await AnonymousFlashSaleModel.findOne({ ipHash });
        if (!record) {
          return buildStatus(cookieStart && remainingMs(cookieStart) > 0 ? cookieStart : null);
        }
      }
    } else if (remainingMs(record.flashSaleStartTime) <= 0) {
      if (cookieStart && remainingMs(cookieStart) > 0) {
        record.flashSaleStartTime = cookieStart;
      } else {
        record.flashSaleStartTime = new Date();
      }
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
    const ipStart = record?.flashSaleStartTime ?? null;
    const cookieStart = readFlashSaleCookie(req);
    const startTime = earliestActiveStart([ipStart, cookieStart]);
    return startTime ? buildStatus(startTime) : record ? buildStatus(record.flashSaleStartTime) : null;
  }

  /**
   * Attach an active guest timer (IP or signed cookie) to a customer account.
   * Never overwrites an already-active customer window and never restarts the clock.
   */
  async adoptActiveWindow(
    req: Request,
    customerId: Types.ObjectId | string,
    currentStartTime?: Date | string | null,
  ): Promise<FlashSaleStatusPayload> {
    const current = toDate(currentStartTime ?? null);
    if (current && remainingMs(current) > 0) {
      await this.syncIpRecord(req, current);
      return buildStatus(current);
    }

    const ipRecord = await AnonymousFlashSaleModel.findOne({ ipHash: hashIpFromRequest(req) });
    const guestStart = earliestActiveStart([
      ipRecord?.flashSaleStartTime,
      readFlashSaleCookie(req),
    ]);
    if (!guestStart) {
      return buildStatus(current);
    }

    const { startTime, loginBonusApplied } = applyLoginBonusIfLowTime(guestStart);
    await CustomerModel.updateOne(
      { _id: customerId, isDeleted: false },
      { $set: { flashSaleStartTime: startTime } },
    );
    await this.syncIpRecord(req, startTime);
    return buildStatus(startTime, { loginBonusApplied });
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
    const status = await this.adoptActiveWindow(req, customerId, null);
    if (!status.isActive || !status.flashSaleStartTime) {
      return { transferred: false, status: null };
    }
    await updateCustomer(new Date(status.flashSaleStartTime));
    return { transferred: true, status };
  }
}

export const anonymousFlashSaleService = new AnonymousFlashSaleService();

export {
  LOGIN_BONUS_THRESHOLD_MS,
  LOGIN_BONUS_MS,
  applyLoginBonusIfLowTime,
  remainingMs,
  isActiveWindow,
  earliestActiveStart,
};
