import { StockReservationModel } from '@/models/inventory.models';
import { inventoryService } from '@/services/inventory.service';
import { writeAuditLog } from '@/services/audit.service';
import type { ActorMeta } from '@/services/cms-crud.service';
import { ApiError } from '@/utils/errors/api-error';
import { buildPaginationMeta, getPaginationSkip, parsePagination } from '@/utils/pagination';
import {
  ALERT_TYPE,
  DEFAULT_RESERVATION_TTL_MINUTES,
  INVENTORY_AUDIT,
  MOVEMENT_TYPE,
  RESERVATION_STATUS,
} from '@/constants/inventory';

export class ReservationService {
  async list(options: {
    page?: number;
    limit?: number;
    status?: string;
    warehouseId?: string;
    variantId?: string;
  }) {
    const { page, limit } = parsePagination(options);
    const filter: Record<string, unknown> = {};
    if (options.status) filter.status = options.status;
    if (options.warehouseId) filter.warehouseId = options.warehouseId;
    if (options.variantId) filter.variantId = options.variantId;

    const skip = getPaginationSkip(page, limit);
    const [data, total] = await Promise.all([
      StockReservationModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      StockReservationModel.countDocuments(filter),
    ]);

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async getById(id: string) {
    const doc = await StockReservationModel.findById(id);
    if (!doc) throw ApiError.notFound('Reservation not found');
    return doc;
  }

  async reserve(
    payload: {
      warehouseId: string;
      variantId: string;
      quantity: number;
      reason?: string;
      referenceType?: string;
      referenceId?: string;
      timeoutMinutes?: number;
      expiresAt?: string | Date;
    },
    actor: ActorMeta,
  ) {
    const timeout = payload.timeoutMinutes ?? DEFAULT_RESERVATION_TTL_MINUTES;
    const expiresAt = payload.expiresAt
      ? new Date(payload.expiresAt)
      : new Date(Date.now() + timeout * 60_000);

    if (expiresAt <= new Date()) {
      throw ApiError.badRequest('expiresAt must be in the future');
    }

    const { item, movement } = await inventoryService.applyMovement(
      {
        warehouseId: payload.warehouseId,
        variantId: payload.variantId,
        type: MOVEMENT_TYPE.RESERVE,
        quantity: payload.quantity,
        reason: payload.reason,
        referenceType: payload.referenceType ?? 'reservation',
        referenceId: payload.referenceId,
      },
      actor,
    );

    const reservation = await StockReservationModel.create({
      warehouseId: payload.warehouseId,
      variantId: payload.variantId,
      inventoryItemId: item._id,
      quantity: payload.quantity,
      status: RESERVATION_STATUS.ACTIVE,
      reason: payload.reason ?? null,
      referenceType: payload.referenceType ?? 'manual',
      referenceId: payload.referenceId ?? null,
      expiresAt,
      timeoutMinutes: timeout,
      createdBy: actor.userId ?? null,
    });

    await writeAuditLog({
      action: INVENTORY_AUDIT.RESERVATION,
      resourceType: 'stock_reservations',
      resourceId: reservation._id.toString(),
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      after: reservation.toObject() as Record<string, unknown>,
      metadata: { movementId: movement._id.toString(), op: 'reserve' },
    });

    return reservation;
  }

  async release(id: string, actor: ActorMeta, note?: string) {
    const reservation = await this.getById(id);
    if (reservation.status !== RESERVATION_STATUS.ACTIVE) {
      throw ApiError.badRequest(`Cannot release reservation in status ${reservation.status}`);
    }

    await inventoryService.applyMovement(
      {
        warehouseId: reservation.warehouseId.toString(),
        variantId: reservation.variantId.toString(),
        type: MOVEMENT_TYPE.RELEASE,
        quantity: reservation.quantity,
        referenceType: 'reservation',
        referenceId: reservation._id.toString(),
        note: note ?? 'Reservation released',
      },
      actor,
    );

    reservation.status = RESERVATION_STATUS.RELEASED;
    reservation.releasedAt = new Date();
    await reservation.save();

    await writeAuditLog({
      action: INVENTORY_AUDIT.RESERVATION,
      resourceType: 'stock_reservations',
      resourceId: id,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      after: reservation.toObject() as Record<string, unknown>,
      metadata: { op: 'release' },
    });

    return reservation;
  }

  async commit(id: string, actor: ActorMeta, note?: string) {
    const reservation = await this.getById(id);
    if (reservation.status !== RESERVATION_STATUS.ACTIVE) {
      throw ApiError.badRequest(`Cannot commit reservation in status ${reservation.status}`);
    }

    await inventoryService.applyMovement(
      {
        warehouseId: reservation.warehouseId.toString(),
        variantId: reservation.variantId.toString(),
        type: MOVEMENT_TYPE.COMMIT,
        quantity: reservation.quantity,
        referenceType: 'reservation',
        referenceId: reservation._id.toString(),
        note: note ?? 'Reservation committed',
      },
      actor,
    );

    reservation.status = RESERVATION_STATUS.COMMITTED;
    reservation.committedAt = new Date();
    await reservation.save();

    await writeAuditLog({
      action: INVENTORY_AUDIT.RESERVATION,
      resourceType: 'stock_reservations',
      resourceId: id,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      after: reservation.toObject() as Record<string, unknown>,
      metadata: { op: 'commit' },
    });

    return reservation;
  }

  async extend(id: string, actor: ActorMeta, timeoutMinutes?: number) {
    const reservation = await this.getById(id);
    if (reservation.status !== RESERVATION_STATUS.ACTIVE) {
      throw ApiError.badRequest(`Cannot extend reservation in status ${reservation.status}`);
    }
    if (reservation.expiresAt && reservation.expiresAt <= new Date()) {
      throw ApiError.badRequest('Reservation already expired', undefined, 'RESERVATION_EXPIRED');
    }

    const timeout = timeoutMinutes ?? reservation.timeoutMinutes ?? DEFAULT_RESERVATION_TTL_MINUTES;
    reservation.expiresAt = new Date(Date.now() + timeout * 60_000);
    reservation.timeoutMinutes = timeout;
    await reservation.save();

    await writeAuditLog({
      action: INVENTORY_AUDIT.RESERVATION,
      resourceType: 'stock_reservations',
      resourceId: id,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      after: reservation.toObject() as Record<string, unknown>,
      metadata: { op: 'extend', timeoutMinutes: timeout },
    });

    return reservation;
  }

  /** Expire due active reservations and release stock. */
  async expireDue(actor: ActorMeta = {}) {
    const due = await StockReservationModel.find({
      status: RESERVATION_STATUS.ACTIVE,
      expiresAt: { $lte: new Date() },
    }).limit(200);

    const results = [];
    for (const reservation of due) {
      try {
        await inventoryService.applyMovement(
          {
            warehouseId: reservation.warehouseId.toString(),
            variantId: reservation.variantId.toString(),
            type: MOVEMENT_TYPE.RELEASE,
            quantity: reservation.quantity,
            referenceType: 'reservation',
            referenceId: reservation._id.toString(),
            note: 'Reservation expired',
            silent: true,
          },
          actor,
        );
        reservation.status = RESERVATION_STATUS.EXPIRED;
        reservation.releasedAt = new Date();
        await reservation.save();

        await inventoryService.raiseAlert({
          type: ALERT_TYPE.RESERVATION_EXPIRY,
          warehouseId: reservation.warehouseId.toString(),
          variantId: reservation.variantId.toString(),
          reservationId: reservation._id.toString(),
          message: `Reservation ${reservation._id} expired and stock was released`,
        });

        results.push({ id: reservation._id.toString(), status: 'expired' });
      } catch (error) {
        results.push({
          id: reservation._id.toString(),
          status: 'error',
          error: error instanceof Error ? error.message : 'unknown',
        });
      }
    }

    return { processed: results.length, results };
  }
}

export const reservationService = new ReservationService();
